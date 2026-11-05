# Uni's Music — Initial Threat Model

**Status:** Initial draft — review required before production launch  
**Version:** 1.0  
**Date:** 2026-11-04  
**Review cadence:** Revisit at each major phase; mandatory review before payments go live

---

## 1. Scope

This document covers the Uni's Music web platform: the Next.js PWA frontend, the NestJS API (`apps/api`), the BullMQ audio worker (`apps/worker`), PostgreSQL, Redis, Cloudflare R2 object storage, and the CDN delivery layer.

Out of scope for this initial model: native mobile clients (not yet built), third-party payment provider internals, Cloudflare infrastructure internals.

---

## 2. Assets to protect

| Asset | Sensitivity | Notes |
|---|---|---|
| User credentials (password hashes, session tokens) | Critical | Compromise enables account takeover |
| PII (email addresses, display names, profile data) | High | Ghana Data Protection Act obligation |
| Financial ledger / earnings data | Critical | Directly affects artist trust and revenue |
| Audio masters and renditions | High | Creator IP; storage costs |
| Payment webhook payloads | Critical | Replay or tampering affects financial records |
| Admin and moderator access | Critical | Full platform control |
| Playback signed URLs | Medium | Access control for audio delivery |
| Audit logs | High | Evidence for disputes, security investigations |

---

## 3. Threat areas and controls

### 3.1 Authentication and session management

**OWASP A07 — Identification and Authentication Failures**

| Threat | Control |
|---|---|
| Session hijacking | Session cookies: `HttpOnly` (no JS access), `Secure` (HTTPS only), `SameSite=Strict` or `Lax`. Short session expiry (e.g., 15–30 minutes idle, configurable). Refresh token rotation. |
| Credential theft via XSS | `HttpOnly` cookies prevent JS access to session tokens. CSP headers on the frontend minimise XSS surface. |
| Brute-force login attacks | Rate limiting on `POST /auth/login`, `POST /auth/register`, `POST /auth/forgot-password`. Lockout after configurable failed attempts per IP and per account. Exponential backoff. |
| Credential stuffing | Argon2id password hashing (memory-hard; resistant to GPU-based cracking). Breach detection (compare email against known breach lists, e.g., HaveIBeenPwned API, at registration and login). Alert users to suspicious login patterns. |
| Password enumeration | Auth endpoints return the same response shape and timing regardless of whether the email exists. |
| Token leakage in logs | Session tokens, passwords, and bearer tokens must never be written to logs. Validated at code review. |
| Admin account compromise | MFA required for all admin, moderator, and finance roles. Separate permission levels: support, moderator, finance, super-admin. |

### 3.2 Audio upload and processing

**OWASP A04 — Insecure Design; A08 — Software and Data Integrity Failures**

| Threat | Control |
|---|---|
| Malicious file upload (code execution, parser exploit) | File signature validation using FFprobe — the actual binary header is inspected, not the client-supplied MIME type or file extension. FFprobe is run before FFmpeg. |
| Polyglot files (valid media + embedded malicious content) | FFprobe validates that the file is a legitimate audio container with the expected codec. |
| FFmpeg/FFprobe parser vulnerability | FFmpeg kept on a current supported release. Workers run in containers with minimal filesystem access (read-only root where possible), drop privileges, and apply `ulimit` / seccomp profiles. |
| Quota abuse (storage exhaustion) | Per-artist upload quota (total storage bytes). Concurrent upload limit per artist. Abandoned upload cleanup job. Upload expiry enforced server-side. |
| Denial of service via large files | Maximum upload size enforced at the signed URL generation step (via S3 policy conditions) and again when the worker validates the downloaded object. |
| Worker resource exhaustion | BullMQ job timeout. FFmpeg `-fs` flag limits output size. Container CPU and memory limits. Disk cleaned after each job. |
| Accessing other artists' uploads | Upload session IDs are UUIDs. API validates that the requesting artist owns the upload session before issuing signed URLs or accepting completion callbacks. |

### 3.3 Audio playback and signed URLs

**OWASP A01 — Broken Access Control**

| Threat | Control |
|---|---|
| Unauthorised playback of unpublished or territory-restricted tracks | API checks track publication status, territory rules, and account restrictions before issuing any signed URL. A denied check returns no URL. |
| Signed URL sharing | URLs have short expiry (initial default: 5 minutes). CDN validates signature on every request — an expired URL is rejected. |
| CDN cache misconfiguration (serving private content to unauthenticated users) | CDN cache rules must require a valid signed token. Unsigned requests for private assets must return 403. Verified in staging before launch. |
| Exposing storage credentials | Application code generates signed URLs using server-side credentials. Storage access keys are never sent to the client. |
| Long-lived URLs embedded in public pages | Server-rendered pages must not embed signed URLs directly in HTML. Signed URLs are fetched client-side at playback initiation time. |

### 3.4 Payments and financial ledger

**OWASP A01 — Broken Access Control; A04 — Insecure Design**

| Threat | Control |
|---|---|
| Webhook replay attack | Webhook processing is idempotent: the provider event ID is stored with a unique constraint; duplicate events are detected and ignored. Provider webhook signatures are verified on every incoming request before any processing occurs. |
| Ledger tampering | The royalty ledger is append-only. No `UPDATE` or `DELETE` on ledger entries. Adjustments are new entries with a reference to the original. Database role for the API has `INSERT` only on the ledger table — no `UPDATE` or `DELETE`. |
| Unauthorised payout approval | Payout approval requires a separate permission level (finance role). High-value payouts require an additional approval step. |
| Financial data in logs | Ledger amounts and payout details must not be written to application logs. Audit trail is in the database, not in log files. |
| API-layer balance manipulation | Artist balance is derived from the ledger at read time or cached in a derived `artist_balances` table. Direct writes to `artist_balances` are restricted to the finance service layer, not available through the public API. |
| Mobile Money PIN exposure | PINs are never collected, stored, or transmitted by the platform. Payment provider handles PIN entry. |

### 3.5 Data exposure and privacy

**OWASP A01 — Broken Access Control; A02 — Cryptographic Failures**

| Threat | Control |
|---|---|
| Mass data exposure via API | Least-privilege database roles: the API application role has only the permissions needed for its operations. No `SELECT *` on sensitive tables from non-admin roles. |
| PII in application logs | Structured logging rules prohibit writing email addresses, names, tokens, or IP addresses to general logs. Security-relevant events (auth events, moderation actions) are written to the audit log in the database with appropriate access controls. |
| PII in error responses | Production error responses return a generic Problem Detail. Stack traces and internal details are logged server-side only. |
| Sensitive data at rest | PostgreSQL data encrypted at rest by the managed hosting provider. R2 objects encrypted at rest by Cloudflare. Application-level encryption for particularly sensitive fields (e.g., payout account details) evaluated separately. |
| Insecure transport | HTTPS enforced everywhere. HSTS header with `includeSubDomains`. No HTTP access to the application. |
| Cross-user data access | All data access validated against the authenticated user's identity and roles. Tests cover horizontal privilege escalation (User A accessing User B's data). |

### 3.6 Injection

**OWASP A03 — Injection**

| Threat | Control |
|---|---|
| SQL injection | All database access through Prisma ORM with parameterised queries. Raw SQL blocks are audited. Input is validated with Zod before reaching the database layer. |
| NoSQL injection (Redis) | BullMQ and Redis clients use structured commands, not string-interpolated Lua scripts. |
| OS command injection (FFmpeg) | FFmpeg is invoked with argument arrays (not shell strings). File paths and parameters are never constructed from unvalidated user input. |
| XSS (stored/reflected) | React's JSX escapes output by default. CSP headers restrict inline scripts and unauthorised script sources. User-generated content (bio, track descriptions) is rendered as text, not as HTML. |
| Path traversal | File paths for worker operations are constructed from storage keys (UUIDs), not from user-supplied filenames. |

### 3.7 Security configuration

**OWASP A05 — Security Misconfiguration**

| Threat | Control |
|---|---|
| Missing security headers | Helmet middleware applied on the NestJS API. Next.js `headers()` configuration adds CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. |
| Sensitive environment variables exposed | `.env` files are never committed to the repository. `.env.example` contains only variable names and safe placeholder values. Environment variables validated at startup via Zod; application fails fast if required variables are missing. |
| Default or weak credentials in infrastructure | All infrastructure credentials are rotated from defaults before deployment. Checked during pre-launch security review. |
| Exposed debug endpoints | Debug, health-check, and metrics endpoints are not publicly accessible. Health endpoints return minimal information. Metrics endpoints are behind network-level access controls. |
| Dependency vulnerabilities | Dependabot or equivalent automated dependency scanning enabled on the repository. Known vulnerability alerts treated as P1. Lockfile committed and verified in CI. |
| Open CORS policy | CORS configured to allow only the known frontend origin(s). Wildcard `*` origin is not permitted in production. |

### 3.8 Software and dependency integrity

**OWASP A08 — Software and Data Integrity Failures**

| Threat | Control |
|---|---|
| Compromised dependency (supply chain attack) | `pnpm-lock.yaml` committed and checked in CI. `pnpm install --frozen-lockfile` in CI to prevent unexpected upgrades. Dependabot security alerts monitored. |
| Tampered build artefacts | CI/CD pipeline runs in GitHub Actions with branch protection on `main`. Docker images are tagged with a content-addressed digest. |
| Unverified webhook payloads | Webhook handler verifies the HMAC signature provided by the payment provider before processing any payload. Invalid signatures result in 400 and no side effects. |

---

## 4. OWASP Top 10 mapping summary

| OWASP ID | Category | Primary controls in this system |
|---|---|---|
| A01 | Broken Access Control | Role/permission guards on all endpoints; UUID PKs; horizontal access validation; append-only ledger; test coverage |
| A02 | Cryptographic Failures | Argon2id for passwords; HTTPS/HSTS; HttpOnly+Secure cookies; encryption at rest via provider; short-lived signed URLs |
| A03 | Injection | Prisma parameterised queries; Zod input validation; FFmpeg argument arrays; React JSX output escaping |
| A04 | Insecure Design | Upload quota and limits; append-only ledger; file validation via FFprobe; signed URL access model; telemetry validation |
| A05 | Security Misconfiguration | Helmet; CSP; env validation at startup; no committed secrets; CORS allowlist; Dependabot |
| A06 | Vulnerable Components | Lockfile in CI; dependency scanning; pinned versions |
| A07 | Auth Failures | Argon2id; rate limiting; breach detection; MFA for admin; HttpOnly cookies; session expiry |
| A08 | Software Integrity | Frozen lockfile in CI; signed commits (recommended); webhook HMAC verification |
| A09 | Logging & Monitoring | Structured logs; audit log in DB; error monitoring (Sentry equivalent); no PII/secrets in logs |
| A10 | SSRF | Worker downloads only from known object storage origin; no user-supplied URLs used in server-side HTTP requests |

---

## 5. Known accepted risks and residual risks

| Risk | Rationale for acceptance | Review condition |
|---|---|---|
| Signed URL sharing window | Short expiry (5 min) is a reasonable balance between UX and security. Full DRM not planned. | Reconsider if piracy becomes a measured business problem |
| No DRM | Implementing Widevine/FairPlay DRM is complex and costly. Signed URLs provide reasonable access control for the target market. | Reconsider if content licensing partners require it |
| Progressive delivery only (initially) | HLS adds complexity without proven benefit at launch. | Add when variable-bandwidth user experience issues are measured |
| No end-to-end encrypted messaging (deferred) | Direct messaging is deferred. When introduced, E2EE must be independently reviewed before being claimed. | Required before messaging launch if E2EE is advertised |

---

## 6. Pre-launch security checklist

- [ ] All auth endpoints rate-limited and tested under load.
- [ ] Argon2id parameters tuned and tested (target: ~300ms hash time on server hardware).
- [ ] HTTPS enforced and HSTS header deployed.
- [ ] All cookies set with `HttpOnly`, `Secure`, `SameSite`.
- [ ] CSP headers tested and validated (no `unsafe-inline` for scripts).
- [ ] CDN signed URL enforcement tested — unauthenticated requests to private objects return 403.
- [ ] Webhook HMAC signature verification tested with a tampered payload.
- [ ] Ledger append-only constraint tested — direct `UPDATE`/`DELETE` on ledger rejected at DB level.
- [ ] FFprobe validation tested with crafted non-audio files.
- [ ] Worker resource limits verified in staging under a large upload.
- [ ] `.env.example` reviewed — no real secrets present.
- [ ] Dependabot alerts reviewed and resolved.
- [ ] Admin MFA enforced in production configuration.
- [ ] Ghana Data Protection Act registration confirmed (see data-inventory.md).
- [ ] Penetration test or independent security review scheduled.

---

## 7. Related documents

- [Architecture overview](./overview.md)
- [Data inventory](./data-inventory.md)
- [ADR-002: PostgreSQL primary database](../adr/ADR-002-postgresql-primary-database.md)
- [ADR-003: Object storage and CDN](../adr/ADR-003-object-storage-cdn-audio.md)
