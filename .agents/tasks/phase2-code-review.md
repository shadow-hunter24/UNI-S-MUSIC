# Phase 2 Identity and Access — Uni's Music

This change implements the full authentication and authorization layer for Uni's Music: user registration with email verification, session-based JWT login/logout, password reset with SHA-256 hashed tokens, TOTP-based MFA for privileged roles, role-based and MFA guards, and the corresponding Next.js auth pages. The approach uses Argon2id for password hashing, HttpOnly cookies for token delivery, a live session table in Postgres for revocation, and a global ThrottlerGuard.

Watch for: (1) The session table stores a `token` column that is never read — session lookup is by UUID only, leaving an implied token-binding check that doesn't exist. (2) `accessToken` is returned in the login response body alongside the HttpOnly cookie, leaking it to JavaScript on every login. (3) `MfaGuard` checks `mfaVerified` from the JWT payload, but no endpoint ever issues a JWT with `mfaVerified: true` — ADMIN and FINANCE users are permanently blocked by their own guard. (4) `POST /reset-password` has no per-route throttle; `POST /request-password-reset` accepts a raw email string with no DTO validation.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Argon2id is used for all password operations and the password reset token is SHA-256 hashed before storage — the DB never holds a usable credential. Email verification tokens are stored as plaintext, inconsistent with the reset token design; low severity given the 24-hour window, but worth aligning. The live session lookup on every JWT validation is correct: logout deletes the row and the token is dead within its 15-minute remaining lifetime. The `Session.token` column is populated but never consulted, making it dead schema that implies a security check that doesn't happen.

The login response leaks `accessToken` in the JSON body alongside the cookie. The web client ignores it, but the API contract returns it to every consumer. This directly undermines the HttpOnly cookie design.

MFA setup and verification work at the DB level, but `MfaGuard` reads `mfaVerified` from the stale JWT payload, and the login endpoint hard-codes that field to `false`. There is no MFA challenge flow that promotes a token to `mfaVerified: true`. The guard currently blocks all ADMIN and FINANCE users unconditionally.

Rate limiting covers register (5/min), login (10/min), and password reset request (3/min) with explicit `@Throttle` decorators. `POST /reset-password` falls through to the global default (10/min) — better than nothing, but inconsistent with the per-endpoint discipline elsewhere. `POST /request-password-reset` accepts a raw `@Body('email')` string rather than a DTO, bypassing `class-validator` format checks and `whitelist` enforcement.

The `RolesGuard` returns `true` when no `@Roles()` metadata is present, which is standard NestJS behavior but means a route that gets `@UseGuards(JwtAuthGuard, RolesGuard)` without `@Roles(...)` is silently accessible to any authenticated user. The Input/Button components are accessibility-complete: labels via `useId()` + `htmlFor`, `aria-invalid`, `role="alert"` on errors, `aria-busy` on loading. The verify-email page has no `aria-live` region, so status transitions are silent for screen readers.

Tests cover the 11 mandated cases but leave `logout`, `setupMfa`, `verifyMfa`, and `validateUser` untested — the MFA enforcement bug would have been caught by a `verifyMfa` test asserting a re-issued token.

---

<details>
<summary>Issues (8)</summary>

1. **Access token leaked in response body** — `auth.service.ts login()` returns `{ accessToken, user }` while also setting an HttpOnly cookie. Remove `accessToken` from the return value; the cookie is the delivery mechanism for web clients.

2. **`mfaVerified` never set to `true` in JWT** — `verifyMfa` sets `mfaEnabled: true` in the DB but issues no new JWT. `MfaGuard` reads `payload.mfaVerified ?? false`, which is always `false` at login. Add a `POST /mfa/challenge` endpoint that validates a TOTP code and returns a replacement JWT with `mfaVerified: true`.

3. **Dead `Session.token` column** — Populated at login but never read by `JwtStrategy`, which validates only by `session.id`. Either wire in a token-binding check (compare cookie value to stored token) or drop the column before it creates a false sense of token-level revocation.

4. **Email verification tokens stored plaintext** — `User.emailVerificationToken` is stored as-is, unlike the password reset token which is SHA-256 hashed. A DB read yields a live verification credential. Hash it consistently with `crypto.createHash('sha256')` before storage.

5. **`POST /request-password-reset` missing DTO** — Accepts `@Body('email') email: string` as a raw primitive. A malformed email address (or non-string value) reaches `usersService.findByEmail()` without any format validation. Create a `RequestPasswordResetDto` with `@IsEmail()`.

6. **`POST /reset-password` missing per-route throttle** — Every other sensitive auth endpoint has an explicit `@Throttle` decorator. Add `@Throttle({ default: { limit: 5, ttl: 60000 } })` for consistency and defense-in-depth.

7. **`verify-email` page sends token in query string** — `VerifyEmailPage` calls `POST /api/v1/auth/verify-email?token=<value>`. Query string tokens appear in server access logs and browser history. Move the token into the POST body (`body: JSON.stringify({ token })`), and change the controller to `@Body('token')`.

8. **No test coverage for MFA and logout** — `setupMfa`, `verifyMfa`, `logout`, and `validateUser` are untested. The MFA enforcement break (issue #2) would surface in a `verifyMfa` test that checks the returned JWT payload.

</details>

---

<details>
<summary>Details</summary>

### Argon2id and token hashing

`argon2.hash(password, { type: argon2.argon2id })` is called in both `register` and `resetPassword`. The password reset token round-trip is correctly designed: a random 32-byte hex string is generated, its SHA-256 hash is stored in `User.passwordResetToken`, and `resetPassword` re-hashes the submitted token before the lookup.

Email verification tokens are stored plaintext in `User.emailVerificationToken` — the schema marks the column `@unique`, so a DB read yields a token that will verify any account it belongs to. The fix is the same one-liner used for reset tokens: `crypto.createHash('sha256').update(token).digest('hex')` before the `user.create` call, and the same hash before the `findUnique` lookup in `verifyEmail`.

### Session table and revocation

`JwtStrategy.validate()` queries `prisma.session.findUnique({ where: { id: payload.sessionId } })` and rejects if the row is missing or `expiresAt` is past. Logout deletes the row. Revocation is real — a stolen token becomes invalid at the next request after logout, within the 15-minute JWT window.

`Session.token` is set to `crypto.randomBytes(32).toString('hex')` at login and never referenced again. The intended behavior is ambiguous: if it was meant to bind the cookie value to the session row (preventing session fixation after a token rotation), the binding check was never written. Drop the column or add the check — the current state implies a security property that isn't enforced.

### Cookie delivery and token exposure

The login handler correctly sets `httpOnly: true`, `sameSite: 'strict'`, `secure` conditional on `NODE_ENV === 'production'`, and `maxAge: 15 minutes`. `apiFetch` sends `credentials: 'include'`.

The handler also returns `{ accessToken, user }`. `LoginResponse` in `login/page.tsx` types the `accessToken` field, so the web app is structured around receiving it — but the page never stores or uses it. The fix is to remove the field from `login()`'s return statement. Any client relying on the body token is using the less secure path anyway.

### MFA: setup works, enforcement is broken

`setupMfa` stores a TOTP secret; `verifyMfa` validates the first code and sets `mfaEnabled: true`. The `MfaGuard` requires `user.mfaVerified === true` for ADMIN and FINANCE roles. `JwtStrategy.validate()` sets `mfaVerified: payload.mfaVerified ?? false`. The login method sets `mfaVerified: false` in the payload and never revisits it. `verifyMfa` does not sign and return a new JWT.

The consequence is that `MfaGuard` is permanently `throw UnauthorizedException` for any ADMIN or FINANCE user on any route guarded by it. The standard fix is a dedicated challenge endpoint: after login, a privileged user calls `POST /mfa/challenge` with their TOTP code; the server validates the code, deletes the current session, creates a new one, and returns a new JWT with `mfaVerified: true`. Until this endpoint exists, `MfaGuard` should not be applied to production routes.

### Rate limiting and input validation gaps

`POST /reset-password` inherits the global 10/min default — a 64-byte hex token with a 1-hour window is not practically brute-forceable at that rate, but the gap from every other auth endpoint is worth closing with an explicit decorator.

`POST /request-password-reset` is the only auth endpoint that does not use a DTO. `@Body('email') email: string` bypasses the `ValidationPipe`'s `whitelist` and `forbidNonWhitelisted` settings entirely — they apply at the class level, not to primitive extractors. A badly formed email string reaches `usersService.findByEmail()` without rejection.

### Audit log

Confirmed entries for `USER_REGISTERED`, both `LOGIN_FAILED` paths, `USER_LOGGED_IN`, `USER_LOGGED_OUT`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `MFA_SETUP_INITIATED`, `MFA_ENABLED`. `verifyEmail` produces no audit log entry — an account transition from unverified to verified is unrecorded. Low priority now but worth adding before Phase 3 when activity feeds are built.

### Accessibility

The `verify-email` page renders three distinct DOM states (loading, success, error) driven by a `status` state variable. There is no `aria-live` region wrapping the status container, so the transition from the loading state to success or error is silent for screen readers. Adding `aria-live="polite"` to the outer container resolves this.

All other accessibility criteria are met: `Input` components use `useId()` and `htmlFor` for label association, `aria-invalid` on error, `role="alert"` on error text. `Button` sets `aria-busy={loading}` and `aria-hidden="true"` on the spinner.

### Test coverage

The 11 test cases cover register (success + 2 conflict paths), login (success + wrong password + unverified email), verifyEmail (success + expired + invalid), requestPasswordReset (found + not-found), and resetPassword (success + expired). Mock factories inject `PrismaService`, `JwtService`, and `ConfigService` directly rather than through NestJS's testing module, keeping tests fast.

Not tested: `logout`, `setupMfa`, `verifyMfa`, `validateMfaToken`, `validateUser` in isolation. The MFA enforcement bug described in issue #2 would be caught immediately by a `verifyMfa` test that asserts the response contains a JWT with `mfaVerified: true`.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `apps/api/src/auth/auth.service.ts` | Core auth business logic: register, login, logout, verifyEmail, password reset, MFA setup/verify |
| `apps/api/src/auth/auth.controller.ts` | Auth HTTP endpoints with per-route throttle and guard wiring |
| `apps/api/src/auth/auth.module.ts` | Module wiring: JwtModule async config, UsersModule import, strategy providers |
| `apps/api/src/auth/jwt.strategy.ts` | JWT Passport strategy with live session lookup |
| `apps/api/src/auth/local.strategy.ts` | Local Passport strategy delegating to `validateUser` |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | Thin wrapper over `AuthGuard('jwt')` |
| `apps/api/src/auth/guards/roles.guard.ts` | Role-based access guard using Reflector |
| `apps/api/src/auth/guards/mfa.guard.ts` | MFA enforcement guard (reads stale JWT payload field) |
| `apps/api/src/auth/decorators/roles.decorator.ts` | `@Roles()` metadata decorator |
| `apps/api/src/auth/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| `apps/api/src/auth/dto/register.dto.ts` | RegisterDto with email, username, password, fullName validation |
| `apps/api/src/auth/dto/login.dto.ts` | LoginDto: emailOrUsername + password |
| `apps/api/src/auth/dto/reset-password.dto.ts` | ResetPasswordDto: token + newPassword with complexity |
| `apps/api/src/users/users.service.ts` | User lookups and `safeUser` sensitive-field stripper |
| `apps/api/src/users/users.controller.ts` | `GET /users/me` and `PATCH /users/me` behind JwtAuthGuard |
| `apps/api/src/users/users.module.ts` | UsersModule exporting UsersService |
| `apps/api/src/prisma/prisma.service.ts` | PrismaClient service with connect/disconnect lifecycle |
| `apps/api/src/prisma/prisma.module.ts` | Global PrismaModule |
| `apps/api/src/config/env.validation.ts` | Added JWT_SECRET, JWT_EXPIRES_IN, THROTTLE_TTL, THROTTLE_LIMIT validation |
| `apps/api/src/app.module.ts` | Registered ThrottlerGuard globally, imported PrismaModule, AuthModule, UsersModule |
| `apps/api/src/main.ts` | Added cookie-parser, helmet, compression, CORS, ValidationPipe, Swagger |
| `packages/database/prisma/schema.prisma` | Added MFA, verification, and reset fields to User; ipAddress/userAgent to Session |
| `apps/web/src/lib/api.ts` | Typed `apiFetch` wrapper with credentials and ApiError |
| `apps/web/src/lib/auth.ts` | `getCurrentUser` and `logout` client helpers |
| `apps/web/src/app/auth/login/page.tsx` | Converted to client component; form state and API call |
| `apps/web/src/app/auth/register/page.tsx` | New client component with full registration form |
| `apps/web/src/app/auth/verify-email/page.tsx` | New page: reads `?token`, POSTs to verify-email endpoint |
| `apps/web/src/app/auth/forgot-password/page.tsx` | New page with enumeration-safe UI behavior |
| `apps/web/src/app/auth/reset-password/page.tsx` | New page reading `?token` and submitting new password |
| `apps/api/src/auth/auth.service.spec.ts` | 11 Vitest unit tests for AuthService |

Full diff: `git diff main` from workspace root.

</details>
