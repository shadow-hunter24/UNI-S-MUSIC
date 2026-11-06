import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UserRole } from '@prisma/client';
import { Response, Request } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }] },
    });
    if (existing?.email === dto.email.toLowerCase()) {
      throw new ConflictException('Email already in use');
    }
    if (existing?.username === dto.username) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Hash before storing so a DB read never yields a live credential
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash,
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiresAt: verificationExpiry,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    // TODO: Send verification email — stub for dev only
    this.logger.log(`[EMAIL STUB] Verification token for ${user.email}: ${verificationToken}`);

    return this.usersService.safeUser(user as unknown as Record<string, unknown>);
  }

  async validateUser(emailOrUsername: string, password: string) {
    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);
    if (!user) return null;
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;
    return user;
  }

  async login(dto: LoginDto, res: Response, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmailOrUsername(dto.emailOrUsername);
    if (!user) {
      await this.prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          metadata: { reason: 'user_not_found', emailOrUsername: dto.emailOrUsername },
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: { reason: 'wrong_password' },
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // In development, skip email verification so testing isn't blocked by the email stub.
    // In production this gate is enforced.
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    if (!isDev && !user.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please check your inbox.');
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      mfaVerified: false,
    };
    const accessToken = this.jwtService.sign(payload);

    // Store the signed JWT in the session token column for binding validation
    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGGED_IN',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    // Do not return the raw accessToken — delivery is via HttpOnly cookie only
    return {
      user: this.usersService.safeUser(user as unknown as Record<string, unknown>),
    };
  }

  async logout(sessionId: string, res: Response, ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (session) {
      await this.prisma.session.delete({ where: { id: sessionId } });
      await this.prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'USER_LOGGED_OUT',
          entityType: 'Session',
          entityId: sessionId,
          ipAddress,
          userAgent,
        },
      });
    }
    res.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: tokenHash } });
    if (!user) throw new BadRequestException('Invalid verification token');
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    // TODO: Send reset email — stub for dev only
    this.logger.log(`[EMAIL STUB] Password reset token for ${user.email}: ${resetToken}`);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: tokenHash } });
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    // Invalidate all sessions
    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });
    return { message: 'Password reset successfully' };
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('MFA setup is only available for ADMIN accounts');
    }

    const secret = speakeasy.generateSecret({
      name: `Uni's Music (${user.email})`,
      length: 20,
    });
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32 } });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'MFA_SETUP_INITIATED',
        entityType: 'User',
        entityId: userId,
      },
    });

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url ?? '');
    return { secret: secret.base32, qrCode: qrDataUrl };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA not configured');

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!verified) throw new UnauthorizedException('Invalid MFA code');

    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'MFA_ENABLED',
        entityType: 'User',
        entityId: userId,
      },
    });
    return { message: 'MFA enabled successfully' };
  }

  /**
   * MFA challenge: validates a TOTP code for an already-logged-in privileged user,
   * then rotates the session JWT to include mfaVerified: true.
   */
  async mfaChallenge(
    userId: string,
    sessionId: string,
    code: string,
    res: Response,
    req: Request,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) {
      await this.prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'MFA_CHALLENGE_FAILED',
          entityType: 'User',
          entityId: userId,
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Rotate session: delete old, create new with mfaVerified: true
    await this.prisma.session.delete({ where: { id: sessionId } });
    const newSession = await this.prisma.session.create({
      data: {
        userId,
        token: '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: newSession.id,
      mfaVerified: true,
    };
    const newToken = this.jwtService.sign(payload);

    // Store the JWT in the session token column for binding validation
    await this.prisma.session.update({
      where: { id: newSession.id },
      data: { token: newToken },
    });

    res.cookie('access_token', newToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'MFA_CHALLENGE_PASSED',
        entityType: 'User',
        entityId: userId,
        ipAddress,
        userAgent,
      },
    });

    return { mfaVerified: true };
  }

  async validateMfaToken(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) return false;
    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }
}
