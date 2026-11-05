# Uni's Music — System Architecture Overview

**Status:** Living document  
**Version:** 1.0  
**Date:** 2026-11-04

---

## 1. Guiding principle

Uni's Music starts as a **modular monolith** — a single deployable NestJS API whose domain logic is carved into well-bounded modules (Identity, Catalogue, Artist, Streaming, Payments, Moderation, etc.). Each module owns its own service classes, repository layer and event contracts; modules communicate through well-defined interfaces rather than direct cross-module database queries.

Services are **not** extracted into separate deployables until there is concrete evidence of need: independent scaling requirements, independent deployment cadence, separate ownership teams, or meaningful fault-isolation benefit. Premature extraction adds network hops, distributed-transaction complexity, and operational overhead without yielding compensating value at early scale.

Background work (audio processing, long-running jobs) runs in a **separate process** (`apps/worker`) from the first day so it never blocks the web request path — this is a process boundary, not a microservice.

---

## 2. Monorepo structure

The repository uses **pnpm workspaces** to manage dependencies across all applications and shared packages in one repository.

```
unis-music/
├── apps/
│   ├── web/          # Next.js PWA — listener, artist and admin UI
│   ├── api/          # NestJS modular monolith REST API
│   └── worker/       # BullMQ job consumers + FFmpeg audio pipeline
├── packages/
│   ├── database/     # Prisma schema, migrations, seed scripts
│   ├── contracts/    # Shared API types, DTOs, Zod schemas
│   ├── ui/           # Shared design-system components (Radix/shadcn)
│   ├── config/       # Shared ESLint, TypeScript, tooling configuration
│   └── test-utils/   # Shared test helpers and fixtures
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   ├── monitoring/
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── database/
│   ├── hci-accessibility/
│   ├── security/
│   ├── privacy-legal/
│   └── operations/
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Why a monorepo?

- `packages/contracts` gives the frontend and backend a **single source of truth** for request/response shapes and Zod validation schemas.
- `packages/database` contains the **Prisma schema and migrations** — every app that touches the database imports the same generated client, preventing schema drift.
- Unified CI: one pipeline lints, type-checks, tests and builds every package in dependency order.
- Shared tooling config keeps formatting and linting consistent without duplicating `.eslintrc` or `tsconfig.json` files.

---

## 3. Technology stack summary

| Layer | Technology |
|---|---|
| Web frontend | Next.js, React, TypeScript (PWA) |
| UI styling | Tailwind CSS |
| UI primitives | Radix UI / shadcn/ui patterns |
| Forms + validation | React Hook Form + Zod |
| Client data fetching | TanStack Query |
| Backend API | NestJS + TypeScript |
| API contract | REST with OpenAPI |
| Primary database | PostgreSQL (via Prisma ORM) |
| Cache + queues | Redis + BullMQ |
| Object storage | Cloudflare R2 (S3-compatible) |
| Audio processing | FFmpeg in isolated worker process |
| Media delivery | CDN (progressive delivery initially; HLS when justified) |
| Search (MVP) | PostgreSQL full-text search |
| Package manager | pnpm workspaces |
| CI/CD | GitHub Actions |

---

## 4. Main request paths

### 4.1 Normal application request

```
Browser
  → Next.js (SSR / API route / client fetch)
  → NestJS API  [authentication guard → authorization guard]
  → Business logic (NestJS module service)
  → PostgreSQL  (Prisma)  /  Redis  (cache or rate-limit)
  ← Typed response (contracts/…)
  ← Next.js renders / returns to browser
```

Key points:
- All cookies are `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax` for cross-site flows).
- Auth guards run before any handler. Authorization is role/permission-based.
- Responses are typed against shared DTOs from `packages/contracts`.
- Redis is used for short-lived cache, rate-limit counters, and session data only — PostgreSQL is the system of record.

### 4.2 Audio upload

```
Artist (browser)
  → POST /uploads/sessions          [API verifies quota, permissions, upload policy]
  ← Short-lived signed upload URL   [API creates upload_session record]
  → Browser PUT/POST → Object Storage (R2 quarantine prefix)
  ← 200 OK from object storage
  → POST /uploads/:id/complete      [API verifies checksum / callback from storage event]
  → Enqueues audio:process job      [BullMQ via Redis]
  → apps/worker picks up job
       FFprobe probe + validate
       Malware / content scan (if available)
       FFmpeg transcode → renditions (64 kbps / 128 kbps / 256 kbps)
       Generate waveform / preview
       Store renditions + metadata checksums
       Move assets from quarantine → publishable prefix
  → Worker updates track state (PROCESSING → PENDING_REVIEW or PROCESSING_FAILED)
  → Notification sent to artist
```

Key points:
- Audio bytes **never pass through the NestJS API process** — the browser uploads directly to object storage.
- The worker runs with explicit CPU, memory, wall-clock, and output-file-size limits.
- File type is validated by inspecting the binary signature (FFprobe), not by trusting the client-supplied MIME type or file extension.

### 4.3 Audio playback

```
Listener (browser)
  → GET /tracks/:id/stream          [API checks availability, territory, account restrictions]
  ← Short-lived signed URL (or signed cookie) for CDN/R2 asset
  → Client streams audio from CDN   [NOT through NestJS API]
  → Client POSTs playback telemetry events  →  NestJS validates events server-side
       (minimum duration check, duplicate suppression, bot signal checks)
  → Validated events written to listening_events + feed analytics pipeline
```

Key points:
- The API issues a **short-lived signed URL** (typically seconds to a few minutes). Storage credentials are never exposed to the client.
- Audio delivery is through the CDN path. Proxying audio bytes through the API would waste bandwidth and CPU.
- CDN cache policy must be set so that private or territory-restricted content is not cached without the signed token.
- Client-side play events are not proof of a legitimate stream. Server-side validation gates whether events count toward analytics or earnings.

---

## 5. Key infrastructure components

### 5.1 PostgreSQL

- Primary transactional store for all application data and financial ledgers.
- Accessed via Prisma ORM (`packages/database`).
- UUID primary keys on all externally referenced entities.
- All timestamps in `timestamptz`, stored UTC.
- Money stored as integer minor units + ISO 4217 currency code (never `float` or `decimal` for calculations without explicit precision control).
- Connection pooling (PgBouncer or managed equivalent) from day one.
- Audio binaries are **not** stored in PostgreSQL.

### 5.2 Redis

- Short-lived cache layer (track metadata TTL cache, search result cache, etc.).
- BullMQ job queues (audio processing, notifications, email, analytics ingestion).
- Rate-limit counters (auth endpoints, upload endpoints, API general rate limiting).
- Not the source of truth for any persistent data. If Redis is flushed, the system recovers from PostgreSQL.

### 5.3 S3-compatible object storage (Cloudflare R2)

- Stores audio masters, processed renditions, artwork, waveform data, and exports.
- Two logical storage regions: **quarantine prefix** (untrusted uploads, not publicly accessible) and **publishable prefix** (validated assets, accessible via signed URLs through CDN).
- No object in the publishable prefix is directly publicly accessible without a signed URL.

### 5.4 CDN

- Delivers audio renditions and static assets to listeners.
- Configured to respect signed URL expiry; does not cache private content without token validation.
- Initial delivery strategy: **progressive download** (simpler, lower latency for short tracks).
- HLS adaptive bitrate added only when justified by measured benefit (high-latency markets, large device diversity, live-like content).

---

## 6. NestJS module boundaries

The API is split into domain modules. Each module may expose HTTP controllers, register its own Prisma-based repository services, publish domain events, and consume other modules only through their exported service interfaces.

Planned MVP modules:

| Module | Responsibility |
|---|---|
| `IdentityModule` | Registration, login, sessions, password reset, roles |
| `CatalogueModule` | Tracks, albums, genres, credits, track state machine |
| `ArtistModule` | Artist profiles, verifications, portal logic |
| `StreamingModule` | Playback authorisation, signed URL generation, telemetry |
| `PlaylistModule` | User playlists, likes, follows |
| `SearchModule` | Full-text search over catalogue |
| `MediaModule` | Upload sessions, processing jobs, rendition tracking |
| `PaymentsModule` | Ledger, payout requests, payment webhooks |
| `ModerationModule` | Reports, moderation cases, copyright claims |
| `NotificationsModule` | In-app notifications, email triggers |
| `AdminModule` | Admin-only endpoints, audit log, dashboards |

---

## 7. Cross-cutting concerns

- **Validation:** All incoming data validated with Zod schemas (`packages/contracts`). NestJS `ValidationPipe` rejects unrecognised fields by default.
- **Error handling:** Global NestJS exception filter normalises errors to consistent RFC-7807 Problem Detail responses. Errors do not leak stack traces in production.
- **Logging:** Structured JSON logs (e.g., Pino). Correlation IDs propagated on every request. No sensitive data (passwords, tokens, PII) written to logs.
- **Configuration:** Environment variables validated at startup via a NestJS `ConfigModule` with Zod. Application fails fast if required variables are missing or malformed.
- **Security headers:** Helmet middleware applied on the NestJS API. Content-Security-Policy configured for the Next.js frontend.
- **Rate limiting:** Applied at auth endpoints (strict), upload endpoints (per-artist), and general API (per-IP/user).
- **Observability:** Structured logs, Prometheus metrics (or managed equivalent), distributed tracing, and error monitoring (e.g., Sentry).

---

## 8. Deployment topology (initial)

```
GitHub Actions CI
  → Build & test all packages
  → Build Docker images: api, worker, web
  → Push to container registry

Production:
  web      — Next.js (managed hosting / container)
  api      — NestJS (container, horizontally scalable)
  worker   — BullMQ workers (container, independently scalable)
  db       — Managed PostgreSQL
  cache    — Managed Redis
  storage  — Cloudflare R2
  cdn      — Cloudflare
```

Scale `worker` replicas independently of `api` replicas during high-upload periods. Scale `api` replicas during high-traffic periods. The database is the bottleneck to monitor and address first before scaling out application servers.

---

## 9. Related documents

- [ADR-001: Modular monolith monorepo](../adr/ADR-001-modular-monolith-monorepo.md)
- [ADR-002: PostgreSQL primary database](../adr/ADR-002-postgresql-primary-database.md)
- [ADR-003: Object storage and CDN for audio](../adr/ADR-003-object-storage-cdn-audio.md)
- [Threat model](./threat-model.md)
- [Data inventory](./data-inventory.md)
