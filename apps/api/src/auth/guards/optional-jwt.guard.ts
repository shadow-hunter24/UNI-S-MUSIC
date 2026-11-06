import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — sets req.user if a valid token is present,
 * but allows the request through even if no token is provided or
 * the token is invalid.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Override handleRequest so that missing/invalid tokens don't throw
  handleRequest<T>(err: Error | null, user: T): T {
    return user;
  }
}
