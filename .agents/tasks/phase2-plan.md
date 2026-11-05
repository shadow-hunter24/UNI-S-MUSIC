# Phase 2 – Identity and Access: Implementation Plan

## Codebase Findings (pre-plan exploration)

| Finding | Detail |
|---|---|
| Schema state | `UserRole` enum and `User`, `Session`, `AuditLog` models exist but are **missing** required Phase 2 fields: `emailVerificationToken`, `emailVerificationExpiresAt`, `passwordResetToken`, `passwordResetExpiresAt`, `mfaEnabled`, `mfaSecret`. `Session` is missing `ipAddress` and `userAgent`. `AuditLog` is missing `userAgent` and has `entityType` non-optional (spec wants optional). No migrations directory — first migration will create all tables. |
| Packages already installed | `class-validator`, `class-transformer` are in `dependencies`. NOT yet installed: `argon2`, `@nestjs/jwt`, `passport`, `passport-jwt`, `passport-local`, `@nestjs/passport`, `cookie-parser`, `speakeasy`, `qrcode`, `@nestjs/throttler`. |
| Test runner | `package.json` `test` script is `echo 'no tests yet'` — vitest is not installed. Must install and configure. |
| PrismaService | Does not exist in `apps/api/src/` — must create `apps/api/src/prisma/prisma.service.ts` and `prisma.module.ts` as global providers before auth/users modules can use DB. |
| Env validation | Uses Joi (`joi` already in deps). `JWT_SECRET`, `JWT_EXPIRES_IN`, `THROTTLE_TTL`, `THROTTLE_LIMIT` are absent and must be added. |
| Contracts package | Already exports `UserRole` enum and `UserDto`. Do NOT redefine `UserRole` there — extend `UserDto` if needed, or add new `AuthResponseDto` type. |
| Login page | Currently a Server Component (`export const metadata = ...`). Must be converted to a Client Component for `useState`/`useRouter`. |
| Web lib directory | `apps/web/src/lib/` does not exist yet — create it. |
| Seed file | Exists and seeds genres only. Must add a seeded ADMIN user in Phase 2 seed. |
| Migration approach | First run (`migrate dev --name phase2-identity-access`) will create a new migration file capturing the schema additions. |

## Potential Issues / Notes

- **`argon2` native compilation**: argon2 requires node-gyp on Windows. If the build environment lacks a C++ toolchain, use `argon2` v0.31+ with prebuilds or fall back to `@node-rs/argon2`. Plan uses `argon2` per spec; flag if build fails.
- **`speakeasy` deprecation**: `speakeasy` is archived. The alternative is `otplib`. Plan follows the spec and uses `speakeasy`; the coder should note this and can substitute `otplib` + `@otplib/preset-default` if speakeasy fails to install.
- **Circular dependency risk**: `AuthModule` imports `UsersModule` for `UsersService`, and `UsersModule` imports `PrismaModule`. Keep `PrismaModule` global — this eliminates the circular risk entirely.
- **Cookie + JWT dual-read**: `JwtStrategy` must read token from `Authorization: Bearer` header OR from `access_token` cookie. Passport's `ExtractJwt.fromExtractors([...])` supports this.
- **Session table lookup**: The JWT strategy validates the token payload AND queries the Session table to reject invalidated sessions (logout). This means every authenticated request does one DB read.
- **`password reset` seed user**: Add a seed ADMIN user with a known username/email for dev testing, never for production.

---

## Ordered Implementation Steps

- [ ] 1. **Update Prisma schema — add missing Phase 2 fields**

  The existing schema has `User`, `Session`, and `AuditLog` but is missing verification/reset/MFA fields. Add them now so the single migration creates the final table structure.

  Exact changes to `packages/database/prisma/schema.prisma`:
  - `User` model: add after `emailVerified Boolean @default(false)`:
    ```
    emailVerificationToken    String?   @unique
    emailVerificationExpiresAt DateTime? @db.Timestamptz()
    passwordResetToken        String?   @unique
    passwordResetExpiresAt    DateTime? @db.Timestamptz()
    mfaEnabled                Boolean   @default(false)
    mfaSecret                 String?
    fullName                  String?
    ```
  - `Session` model: add after `createdAt`:
    ```
    ipAddress  String?
    userAgent  String?
    ```
  - `AuditLog` model: change `entityType String` → `entityType String?`

  Files: `packages/database/prisma/schema.prisma`

  Verify: `cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database" && npx prisma validate` — should exit 0 with no errors.

---

- [ ] 2. **Run the database migration**

  Run migrate dev to generate and apply SQL migration against the Neon PostgreSQL database.

  Command (run from repo root, or set cwd to the database package):
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database"
  npx prisma migrate dev --name phase2-identity-access
  ```

  This creates `packages/database/prisma/migrations/<timestamp>_phase2-identity-access/migration.sql`.

  Files: `packages/database/prisma/migrations/` (generated)

  Verify: Command exits 0. Output must contain "Your database is now in sync with your schema." Report the full terminal output verbatim.

---

- [ ] 3. **Update the seed file — add ADMIN user**

  Extend `packages/database/prisma/seed.ts` to also create a seeded ADMIN user (for dev/testing). Hash the password using argon2 (install argon2 first in the database package's devDependencies if needed, or use a pre-hashed constant). The seed must be idempotent (`upsert` on email).

  Seed user: `email: 'admin@unismusic.dev'`, `username: 'admin'`, `role: UserRole.ADMIN`, `emailVerified: true`, password: `Admin1234!` (hashed with Argon2id).

  > ⚠️ This user is dev-only. Never ship real credentials.

  Files: `packages/database/prisma/seed.ts`

  Verify:
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database"
  npx prisma db seed
  ```
  Output must contain "Seeded 10 genres." and "Seeded admin user." Report full output.

---

- [ ] 4. **Install API dependencies**

  Install production and dev packages required for auth. Run from `apps/api`:

  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api"
  pnpm add argon2 @nestjs/jwt passport passport-jwt passport-local @nestjs/passport cookie-parser speakeasy qrcode @nestjs/throttler
  pnpm add -D @types/passport-jwt @types/passport-local @types/cookie-parser @types/speakeasy @types/qrcode vitest @vitest/coverage-v8
  ```

  If `argon2` fails to build on Windows due to missing native toolchain, replace with `@node-rs/argon2` (same API, ships prebuilts):
  ```
  pnpm add @node-rs/argon2
  ```
  and update all imports accordingly.

  Files: `apps/api/package.json` (updated by pnpm)

  Verify: `cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api" && pnpm ls argon2 @nestjs/jwt @nestjs/passport @nestjs/throttler` — all listed with resolved versions.

---

- [ ] 5. **Create PrismaService and PrismaModule (global)**

  Create a NestJS injectable service wrapping PrismaClient. This must be a global module so both `AuthModule` and `UsersModule` can inject it without circular imports.

  Files to create:
  - `apps/api/src/prisma/prisma.service.ts` — extends `PrismaClient`, implements `OnModuleInit` to call `$connect()` and `enableShutdownHooks` via `app.close()`.
  - `apps/api/src/prisma/prisma.module.ts` — `@Global() @Module({ providers: [PrismaService], exports: [PrismaService] })`

  Files: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`

  Verify: `cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api" && pnpm run typecheck` — no TypeScript errors.

---

- [ ] 6. **Update env validation — add JWT and throttle vars**

  Add four new keys to the Joi schema in `apps/api/src/config/env.validation.ts`:
  - `JWT_SECRET`: `Joi.string().min(32).required()` (required in all envs)
  - `JWT_EXPIRES_IN`: `Joi.string().default('15m')`
  - `THROTTLE_TTL`: `Joi.number().default(60)`
  - `THROTTLE_LIMIT`: `Joi.number().default(10)`

  Files: `apps/api/src/config/env.validation.ts`

  Verify: `pnpm run typecheck` in `apps/api` — no errors.

---

- [ ] 7. **Update .env and .env.example**

  Add the new env vars to both files. Generate a secure `JWT_SECRET`.

  `.env` additions:
  ```
  JWT_SECRET=<generate a cryptographically random 64-char hex string via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
  JWT_EXPIRES_IN=15m
  THROTTLE_TTL=60
  THROTTLE_LIMIT=10
  ```

  `.env.example` additions:
  ```
  JWT_SECRET=replace_with_min_32_char_random_hex
  JWT_EXPIRES_IN=15m
  THROTTLE_TTL=60
  THROTTLE_LIMIT=10
  ```

  Files: `.env`, `.env.example`

  Verify: Visual check that both files contain the four new keys.

---

- [ ] 8. **Create DTOs**

  Create DTO classes with `class-validator` decorators. These are used by both auth and users modules.

  Files to create:
  - `apps/api/src/auth/dto/register.dto.ts`
    - `@IsEmail() email: string`
    - `@IsString() @Matches(/^[a-z0-9_]{3,30}$/i) username: string`
    - `@IsString() @MinLength(8) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/) password: string`
    - `@IsString() @IsOptional() fullName?: string`
  - `apps/api/src/auth/dto/login.dto.ts`
    - `@IsString() emailOrUsername: string`
    - `@IsString() password: string`
  - `apps/api/src/auth/dto/reset-password.dto.ts`
    - `@IsString() token: string`
    - `@IsString() @MinLength(8) @Matches(complexity) newPassword: string`
  - `apps/api/src/auth/dto/verify-email.dto.ts`
    - `@IsString() token: string`
  - `apps/api/src/auth/dto/request-reset.dto.ts`
    - `@IsEmail() email: string`
  - `apps/api/src/auth/dto/setup-mfa.dto.ts` — empty for now (just marks endpoint)
  - `apps/api/src/auth/dto/verify-mfa.dto.ts`
    - `@IsString() @Length(6,6) code: string`
  - `apps/api/src/users/dto/update-profile.dto.ts`
    - `@IsOptional() @IsString() fullName?: string`
    - `@IsOptional() @IsString() bio?: string` (for UserProfile)

  Files: all paths listed above

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 9. **Create Passport strategies and auth guards/decorators**

  These are pure infrastructure — no business logic yet. Create them before the service so the service and controller can reference them.

  Files to create:
  - `apps/api/src/auth/strategies/jwt.strategy.ts`
    - Extends `PassportStrategy(Strategy, 'jwt')`
    - `secretOrKey`: from `ConfigService` (`JWT_SECRET`)
    - `jwtFromRequest`: `ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), (req) => req?.cookies?.access_token])`
    - `validate(payload)`: queries `PrismaService` to find the Session by `payload.sessionId`, checks `expiresAt > now`, returns `{ userId, role, sessionId }`. Returns `null` (Unauthorized) if not found or expired.
  - `apps/api/src/auth/strategies/local.strategy.ts`
    - Extends `PassportStrategy(Strategy, 'local')`
    - `usernameField: 'emailOrUsername'`
    - `validate(emailOrUsername, password)`: delegates to `AuthService.validateUser()`
  - `apps/api/src/auth/guards/jwt-auth.guard.ts` — `@Injectable() class JwtAuthGuard extends AuthGuard('jwt') {}`
  - `apps/api/src/auth/guards/roles.guard.ts` — reads `@Roles()` metadata from `Reflector`, checks `req.user.role`
  - `apps/api/src/auth/guards/mfa.guard.ts` — checks `req.user.mfaVerified` flag in JWT payload; if user has `mfaEnabled` and flag is false, returns 403
  - `apps/api/src/auth/decorators/roles.decorator.ts` — `export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)`
  - `apps/api/src/auth/decorators/current-user.decorator.ts` — `export const CurrentUser = createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user)`

  Files: all paths listed above

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 10. **Create UsersService and UsersModule**

  Create the Users module. `AuthService` depends on `UsersService` for user lookups, so this must exist before `AuthService`.

  Files to create:
  - `apps/api/src/users/users.service.ts`
    - `findById(id: string)`: query `prisma.user.findUnique({ where: { id } })`
    - `findByEmail(email: string)`: query by email (lowercased)
    - `findByEmailOrUsername(emailOrUsername: string)`: try email first, then username
    - `updateProfile(userId: string, dto: UpdateProfileDto)`: updates `UserProfile` via `prisma.userProfile.upsert`
  - `apps/api/src/users/users.module.ts` — `@Module({ imports: [], providers: [UsersService], exports: [UsersService] })`
  - `apps/api/src/users/users.controller.ts`
    - `@Controller('api/v1/users')` with `@UseGuards(JwtAuthGuard)`
    - `GET /me` → returns `CurrentUser` (from JWT payload + DB lookup)
    - `PATCH /me` → calls `usersService.updateProfile(user.userId, dto)`

  Files: `apps/api/src/users/users.service.ts`, `apps/api/src/users/users.module.ts`, `apps/api/src/users/users.controller.ts`

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 11. **Create AuthService**

  The core business logic. Depends on `PrismaService`, `JwtService`, `ConfigService`, `UsersService`.

  File to create: `apps/api/src/auth/auth.service.ts`

  Methods:
  - `register(dto: RegisterDto, ip?: string, ua?: string)`:
    1. Lowercase + trim email
    2. Check for duplicate email and username (throw `ConflictException`)
    3. Hash password with `argon2.hash(password, { type: argon2.argon2id })`
    4. Generate `emailVerificationToken` = `crypto.randomBytes(32).toString('hex')`, expiry = now + 24h
    5. `prisma.user.create(...)` — never log the hash
    6. Write AuditLog: action `'user.register'`, entityType `'User'`, entityId = new user ID
    7. (Stub) queue verification email — log token to console in dev, never in prod
    8. Return `{ message: 'Registration successful. Check your email.' }`

  - `validateUser(emailOrUsername: string, password: string)`:
    1. Find user by email or username
    2. If not found: `await argon2.verify(dummyHash, password)` (timing-safe), throw `UnauthorizedException`
    3. Verify password with `argon2.verify(user.passwordHash, password)`
    4. Return user or throw `UnauthorizedException`

  - `login(user: User, ip?: string, ua?: string)`:
    1. Check `user.emailVerified` — throw `ForbiddenException('Email not verified')` if false
    2. Generate JWT payload: `{ sub: user.id, role: user.role, sessionId: <uuid> }`
    3. `prisma.session.create({ data: { id: sessionId, userId, token: signedJwt, expiresAt: now+15m, ipAddress, userAgent } })`
    4. Write AuditLog: action `'user.login'`
    5. Return `{ accessToken: jwt, user: { id, email, username, role } }`

  - `logout(sessionId: string, userId: string, ip?: string)`:
    1. `prisma.session.delete({ where: { id: sessionId } })`
    2. Write AuditLog: action `'user.logout'`

  - `verifyEmail(token: string)`:
    1. Find user by `emailVerificationToken`
    2. Check `emailVerificationExpiresAt > now`
    3. `prisma.user.update({ emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null })`
    4. Write AuditLog: action `'user.email_verified'`

  - `requestPasswordReset(email: string, ip?: string)`:
    1. Find user — always return generic success regardless (no user enumeration)
    2. Generate `passwordResetToken` = `crypto.randomBytes(32).toString('hex')`, expiry = now + 1h
    3. `prisma.user.update({ passwordResetToken, passwordResetExpiresAt })`
    4. (Stub) send email — log token to console in dev
    5. Write AuditLog: action `'user.password_reset_requested'`

  - `resetPassword(token: string, newPassword: string, ip?: string)`:
    1. Find user by `passwordResetToken`, check `passwordResetExpiresAt > now`
    2. Hash new password with Argon2id
    3. `prisma.user.update({ passwordHash, passwordResetToken: null, passwordResetExpiresAt: null })`
    4. Delete all sessions for this user (force re-login)
    5. Write AuditLog: action `'user.password_reset'`

  - `setupMfa(userId: string)` (ADMIN only via guard):
    1. Generate TOTP secret with `speakeasy.generateSecret({ name: "Uni's Music" })`
    2. Store `user.mfaSecret` (NOT enabled yet)
    3. Return QR code data URL via `qrcode.toDataURL(secret.otpauth_url)`
    4. Write AuditLog: action `'user.mfa_setup_initiated'`

  - `verifyMfa(userId: string, code: string)`:
    1. Load `user.mfaSecret`
    2. `speakeasy.totp.verify({ secret, encoding: 'base32', token: code })`
    3. If valid: `prisma.user.update({ mfaEnabled: true })`
    4. Write AuditLog: action `'user.mfa_enabled'`

  - Private helper `writeAuditLog(action, entityType?, entityId?, actorId?, meta?, ip?, ua?)`:
    wraps `prisma.auditLog.create()`. Never throws — catch and log to console.

  **Security invariants:**
  - Never log `passwordHash`, tokens, or MFA secrets
  - Dummy hash check in `validateUser` to prevent timing attacks
  - Always await argon2 even on "user not found" paths

  Files: `apps/api/src/auth/auth.service.ts`

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 12. **Create AuthController**

  Files to create: `apps/api/src/auth/auth.controller.ts`

  Controller prefix: `api/v1/auth`. Apply `ThrottlerGuard` globally or per endpoint.

  Endpoints:
  - `POST /register` — `@Throttle({ default: { limit: 5, ttl: 60000 } })`, calls `authService.register(dto, ip, ua)`
  - `POST /login` — `@Throttle({ default: { limit: 10, ttl: 60000 } })`, `@UseGuards(LocalAuthGuard)`, calls `authService.login(user, ip, ua)`, sets `access_token` HttpOnly cookie, also returns body
  - `POST /logout` — `@UseGuards(JwtAuthGuard)`, calls `authService.logout(sessionId, userId)`, clears cookie
  - `POST /verify-email` — `@Throttle({ default: { limit: 10, ttl: 60000 } })`, reads `?token=` from query, calls `authService.verifyEmail(token)`
  - `POST /request-password-reset` — `@Throttle({ default: { limit: 3, ttl: 60000 } })`, calls `authService.requestPasswordReset(email, ip)`
  - `POST /reset-password` — calls `authService.resetPassword(token, newPassword, ip)`
  - `POST /mfa/setup` — `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(UserRole.ADMIN)`, calls `authService.setupMfa(userId)`
  - `POST /mfa/verify` — `@UseGuards(JwtAuthGuard)`, calls `authService.verifyMfa(userId, code)`

  Cookie settings applied in the login handler:
  ```ts
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  ```

  Files: `apps/api/src/auth/auth.controller.ts`

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 13. **Create AuthModule**

  Wire everything together.

  File to create: `apps/api/src/auth/auth.module.ts`
  ```ts
  @Module({
    imports: [
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.registerAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') },
        }),
      }),
      UsersModule,
      ThrottlerModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => [{
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 10),
        }],
      }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, LocalStrategy],
    exports: [AuthService, JwtModule],
  })
  export class AuthModule {}
  ```

  Files: `apps/api/src/auth/auth.module.ts`

  Verify: `pnpm run typecheck` — no errors.

---

- [ ] 14. **Register AuthModule, UsersModule, and PrismaModule in AppModule; add cookie-parser middleware**

  In `apps/api/src/app.module.ts`:
  - Import `PrismaModule`, `AuthModule`, `UsersModule`
  - Add all three to the `imports` array

  In `apps/api/src/main.ts`:
  - Add `import cookieParser from 'cookie-parser';`
  - After `app.use(helmet())` add: `app.use(cookieParser());`

  Files: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`

  Verify: `pnpm run build` in `apps/api` — TypeScript compiles to `dist/` with no errors. Report terminal output.

---

- [ ] 15. **Write unit tests — auth.service.spec.ts**

  Add vitest test script to `apps/api/package.json` (replace the `echo 'no tests yet'` stub):
  ```json
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
  ```

  Add a `vitest.config.ts` at `apps/api/vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { globals: true, environment: 'node' },
  });
  ```

  Create `apps/api/src/auth/auth.service.spec.ts` with the following test cases (all using `vi.mock` / `vi.fn()`):

  **Mock targets**: `PrismaService`, `JwtService`, `ConfigService`

  Test suites:
  - `register`
    - success: creates user, returns message
    - duplicate email: throws `ConflictException`
    - duplicate username: throws `ConflictException`
  - `login`
    - success: creates session, returns `accessToken`
    - wrong password: throws `UnauthorizedException`
    - unverified email: throws `ForbiddenException`
  - `verifyEmail`
    - success: sets `emailVerified = true`
    - expired token: throws `UnauthorizedException`
    - invalid token (not found): throws `UnauthorizedException`
  - `requestPasswordReset`
    - user exists: generates reset token, calls update
    - user not found: still returns generic success (no enumeration)
  - `resetPassword`
    - success: updates hash, deletes sessions
    - expired token: throws `UnauthorizedException`

  Files: `apps/api/src/auth/auth.service.spec.ts`, `apps/api/vitest.config.ts`, `apps/api/package.json`

  Verify: `cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api" && pnpm test` — all tests pass. Report output.

---

- [ ] 16. **Create Next.js auth pages and lib utilities**

  Create the web frontend auth pages. The login page must be converted from Server Component to Client Component.

  ### 16a. `src/lib/api.ts` — typed fetch wrapper
  ```ts
  // NEXT_PUBLIC_API_URL defaults to http://localhost:4000
  // Generic apiFetch<T>(path, options) — sets credentials: 'include', handles 4xx/5xx
  // Export typed helpers: authApi.register, authApi.login, authApi.logout, etc.
  ```
  File: `apps/web/src/lib/api.ts`

  ### 16b. `src/lib/auth.ts` — client auth helpers
  ```ts
  // isLoggedIn(): boolean — reads a non-HttpOnly cookie or localStorage flag
  // getCurrentUser(): UserDto | null — parsed from a readable cookie or context
  ```
  File: `apps/web/src/lib/auth.ts`

  ### 16c. Update `src/app/auth/login/page.tsx`
  Convert to `'use client'` component. Add `useState` for `emailOrUsername`, `password`, `loading`, `error`. On submit: call `authApi.login(...)`, on success redirect to `/`, on error display error message. Add "Forgot password?" link pointing to `/auth/forgot-password`. Keep the brand purple theme and accessible labels.

  File: `apps/web/src/app/auth/login/page.tsx`

  ### 16d. Create `src/app/auth/register/page.tsx`
  `'use client'` component. Fields: Full Name, Email, Username, Password (with show/hide toggle), Confirm Password. On submit: validate passwords match (client-side), call `authApi.register(...)`, on success show "Check your email to verify your account." message. On error display inline error. Brand purple theme matching login page, accessible labels.

  File: `apps/web/src/app/auth/register/page.tsx`

  ### 16e. Create `src/app/auth/verify-email/page.tsx`
  `'use client'` component. On mount (`useEffect`): read `?token=` from `useSearchParams()`, call `authApi.verifyEmail(token)`. Show loading spinner, then success state ("Email verified! You can now log in.") or error state ("Invalid or expired link.").

  File: `apps/web/src/app/auth/verify-email/page.tsx`

  ### 16f. Create `src/app/auth/forgot-password/page.tsx`
  `'use client'` component. Email input. On submit: call `authApi.requestPasswordReset(email)`. Always show "If that email is registered, you'll receive a reset link." (no user enumeration in UI either).

  File: `apps/web/src/app/auth/forgot-password/page.tsx`

  ### 16g. Create `src/app/auth/reset-password/page.tsx`
  `'use client'` component. Reads `?token=` from `useSearchParams()`. Fields: New Password, Confirm Password. On submit: validates match, calls `authApi.resetPassword(token, newPassword)`. On success: redirects to `/auth/login?reset=true`.

  File: `apps/web/src/app/auth/reset-password/page.tsx`

  Verify: `cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\web" && pnpm run typecheck` — no errors.

---

- [ ] 17. **Run full verification suite**

  Run every verification command and report the actual terminal output for each one:

  **Step 17a — Prisma migrate (should already be done in step 2, confirm state):**
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database"
  npx prisma migrate status
  ```
  Expected: "Database schema is up to date!"

  **Step 17b — Prisma seed:**
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database"
  npx prisma db seed
  ```
  Expected: seeded genres + admin user line.

  **Step 17c — API build:**
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api"
  pnpm run build
  ```
  Expected: TypeScript compiles to `dist/` with zero errors.

  **Step 17d — API tests:**
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api"
  pnpm test
  ```
  Expected: all tests pass.

  **Step 17e — Monorepo typecheck:**
  ```
  cd "c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC"
  pnpm -r typecheck
  ```
  Expected: zero TypeScript errors across all packages.

  If any step fails, diagnose the root cause and fix before reporting done.

---

## File Creation / Modification Checklist

### New files (create from scratch)
| File | Purpose |
|---|---|
| `apps/api/src/prisma/prisma.service.ts` | NestJS PrismaClient service |
| `apps/api/src/prisma/prisma.module.ts` | Global NestJS module |
| `apps/api/src/auth/auth.module.ts` | Auth module wiring |
| `apps/api/src/auth/auth.service.ts` | Auth business logic |
| `apps/api/src/auth/auth.controller.ts` | Auth HTTP endpoints |
| `apps/api/src/auth/auth.service.spec.ts` | Vitest unit tests |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | JWT Passport strategy |
| `apps/api/src/auth/strategies/local.strategy.ts` | Local Passport strategy |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | JWT auth guard |
| `apps/api/src/auth/guards/roles.guard.ts` | Role-based access guard |
| `apps/api/src/auth/guards/mfa.guard.ts` | MFA enforcement guard |
| `apps/api/src/auth/decorators/roles.decorator.ts` | @Roles() decorator |
| `apps/api/src/auth/decorators/current-user.decorator.ts` | @CurrentUser() decorator |
| `apps/api/src/auth/dto/register.dto.ts` | Register request DTO |
| `apps/api/src/auth/dto/login.dto.ts` | Login request DTO |
| `apps/api/src/auth/dto/reset-password.dto.ts` | Reset password DTO |
| `apps/api/src/auth/dto/verify-email.dto.ts` | Verify email DTO |
| `apps/api/src/auth/dto/request-reset.dto.ts` | Request password reset DTO |
| `apps/api/src/auth/dto/setup-mfa.dto.ts` | MFA setup DTO |
| `apps/api/src/auth/dto/verify-mfa.dto.ts` | MFA verify DTO |
| `apps/api/src/users/users.module.ts` | Users module |
| `apps/api/src/users/users.service.ts` | Users service |
| `apps/api/src/users/users.controller.ts` | Users endpoints |
| `apps/api/src/users/dto/update-profile.dto.ts` | Update profile DTO |
| `apps/api/vitest.config.ts` | Vitest config |
| `apps/web/src/lib/api.ts` | Typed fetch API wrapper |
| `apps/web/src/lib/auth.ts` | Client auth helpers |
| `apps/web/src/app/auth/register/page.tsx` | Register page |
| `apps/web/src/app/auth/verify-email/page.tsx` | Email verification page |
| `apps/web/src/app/auth/forgot-password/page.tsx` | Forgot password page |
| `apps/web/src/app/auth/reset-password/page.tsx` | Reset password page |

### Modified files (already exist)
| File | Change |
|---|---|
| `packages/database/prisma/schema.prisma` | Add MFA/verification fields to User; add ipAddress/userAgent to Session; make entityType optional on AuditLog |
| `packages/database/prisma/seed.ts` | Add admin user seed |
| `apps/api/package.json` | Add new deps + test scripts |
| `apps/api/src/app.module.ts` | Import PrismaModule, AuthModule, UsersModule |
| `apps/api/src/main.ts` | Add cookie-parser middleware |
| `apps/api/src/config/env.validation.ts` | Add JWT_SECRET, JWT_EXPIRES_IN, THROTTLE_TTL, THROTTLE_LIMIT |
| `.env` | Add JWT_SECRET, JWT_EXPIRES_IN, THROTTLE_TTL, THROTTLE_LIMIT |
| `.env.example` | Add same four keys with placeholder values |
| `apps/web/src/app/auth/login/page.tsx` | Convert to client component, add form state + API call |

---

## Dependency Order (critical)

```
Step 1 (schema) → Step 2 (migrate) → Step 3 (seed)
Step 4 (install packages)
Step 5 (PrismaModule) ← must exist before auth/users modules
Step 6 (env validation) ← must exist before JwtModule.registerAsync
Step 7 (.env) ← must have JWT_SECRET before API starts
Step 8 (DTOs)
Step 9 (strategies + guards) ← depends on DTOs
Step 10 (UsersModule) ← depends on PrismaService
Step 11 (AuthService) ← depends on UsersService + DTOs
Step 12 (AuthController) ← depends on AuthService + guards
Step 13 (AuthModule) ← depends on all auth files
Step 14 (AppModule + main.ts) ← wires everything
Step 15 (tests) ← depends on AuthService existing
Step 16 (web pages) ← independent of API steps, can run in parallel
Step 17 (full verification) ← must be last
```
