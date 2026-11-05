import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

// ---- Mock external libs ----
vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  verify: vi.fn().mockResolvedValue(true),
  argon2id: 2,
}));

vi.mock('speakeasy', () => ({
  default: {
    generateSecret: vi.fn().mockReturnValue({ base32: 'TESTSECRET', otpauth_url: 'otpauth://test' }),
    totp: { verify: vi.fn().mockReturnValue(true) },
  },
  generateSecret: vi.fn().mockReturnValue({ base32: 'TESTSECRET', otpauth_url: 'otpauth://test' }),
  totp: { verify: vi.fn().mockReturnValue(true) },
}));

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test') },
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

// ---- Build mock service helpers ----

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function buildJwt() {
  return { sign: vi.fn().mockReturnValue('signed_jwt_token') };
}

function buildConfig() {
  return { get: vi.fn().mockReturnValue('development') };
}

function buildUsersService(overrides: Record<string, unknown> = {}) {
  return {
    findByEmailOrUsername: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    safeUser: (user: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, mfaSecret, emailVerificationToken, passwordResetToken, ...safe } = user;
      return safe;
    },
    ...overrides,
  };
}

function makeService(prismaOverrides = {}, usersOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  const jwt = buildJwt();
  const config = buildConfig();
  const users = buildUsersService(usersOverrides);

  // @ts-expect-error - injecting mocks
  const service = new AuthService(prisma, jwt, config, users);
  return { service, prisma, jwt, config, users };
}

// ---- Tests ----

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(argon2.hash).mockResolvedValue('hashed_password' as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);
  });

  // ------ register ------
  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password1',
      fullName: 'Test User',
    };

    it('success: creates user and returns safe user', async () => {
      const { service, prisma } = makeService();
      const createdUser = {
        id: 'uuid-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed_password',
        role: 'LISTENER',
        emailVerified: false,
        emailVerificationToken: 'token123',
        passwordResetToken: null,
        mfaSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createdUser);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledOnce();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('duplicate email: throws ConflictException', async () => {
      const { service, prisma } = makeService();
      prisma.user.findFirst.mockResolvedValue({
        email: 'test@example.com',
        username: 'other',
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('duplicate username: throws ConflictException', async () => {
      const { service, prisma } = makeService();
      prisma.user.findFirst.mockResolvedValue({
        email: 'other@example.com',
        username: 'testuser',
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ------ login ------
  describe('login', () => {
    const dto = { emailOrUsername: 'testuser', password: 'Password1' };
    const mockResponse = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as import('express').Response;

    const verifiedUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashed_password',
      role: 'LISTENER',
      emailVerified: true,
      mfaEnabled: false,
      mfaSecret: null,
      emailVerificationToken: null,
      passwordResetToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('success: creates session, sets cookie, and does NOT leak accessToken in body', async () => {
      const { service, prisma, users } = makeService();
      users.findByEmailOrUsername.mockResolvedValue(verifiedUser);
      vi.mocked(argon2.verify).mockResolvedValue(true as never);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      prisma.session.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.login(dto, mockResponse);

      // Cookie should be set
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.objectContaining({ httpOnly: true }));
      // accessToken must NOT appear in the response body
      expect(result).not.toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(prisma.session.create).toHaveBeenCalledOnce();
    });

    it('wrong password: throws UnauthorizedException', async () => {
      const { service, users } = makeService();
      users.findByEmailOrUsername.mockResolvedValue(verifiedUser);
      vi.mocked(argon2.verify).mockResolvedValue(false as never);

      await expect(service.login(dto, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('unverified email: throws UnauthorizedException', async () => {
      const { service, users } = makeService();
      users.findByEmailOrUsername.mockResolvedValue({ ...verifiedUser, emailVerified: false });
      vi.mocked(argon2.verify).mockResolvedValue(true as never);

      await expect(service.login(dto, mockResponse)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ------ verifyEmail ------
  describe('verifyEmail', () => {
    it('success: marks email as verified', async () => {
      const { service, prisma } = makeService();
      const user = {
        id: 'uuid-1',
        emailVerificationToken: 'valid_token',
        emailVerificationExpiresAt: new Date(Date.now() + 10000), // future
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, emailVerified: true });

      const result = await service.verifyEmail('valid_token');

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
    });

    it('expired token: throws BadRequestException', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        emailVerificationToken: 'expired_token',
        emailVerificationExpiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.verifyEmail('expired_token')).rejects.toThrow(BadRequestException);
    });

    it('invalid token: throws BadRequestException', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('nonexistent_token')).rejects.toThrow(BadRequestException);
    });
  });

  // ------ requestPasswordReset ------
  describe('requestPasswordReset', () => {
    it('user exists: generates reset token and calls update', async () => {
      const { service, prisma, users } = makeService();
      const user = { id: 'uuid-1', email: 'test@example.com' };
      users.findByEmail.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toHaveProperty('message');
      expect(prisma.user.update).toHaveBeenCalledOnce();
    });

    it('user not found: still returns generic success (no enumeration)', async () => {
      const { service, users } = makeService();
      users.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@example.com');

      expect(result).toHaveProperty('message');
    });
  });

  // ------ resetPassword ------
  describe('resetPassword', () => {
    const dto = { token: 'valid_token', newPassword: 'NewPassword1' };

    it('success: updates password hash and deletes sessions', async () => {
      const { service, prisma } = makeService();
      const tokenHash = crypto.createHash('sha256').update('valid_token').digest('hex');
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: new Date(Date.now() + 10000), // future
      });
      prisma.user.update.mockResolvedValue({});
      prisma.session.deleteMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(prisma.user.update).toHaveBeenCalledOnce();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'uuid-1' } });
    });

    it('expired token: throws BadRequestException', async () => {
      const { service, prisma } = makeService();
      const tokenHash = crypto.createHash('sha256').update('valid_token').digest('hex');
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
