import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class MfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{
      user: { role: UserRole; mfaVerified: boolean } | undefined;
    }>();
    const mfaRequiredRoles: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];
    if (mfaRequiredRoles.includes(user?.role as UserRole)) {
      if (!user?.mfaVerified) {
        throw new UnauthorizedException('MFA verification required');
      }
    }
    return true;
  }
}
