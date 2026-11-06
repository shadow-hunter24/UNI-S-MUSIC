# Phase 4 — Upload & Streaming MVP: Technical Design

## Overview

This phase turns the Uni's Music monorepo from read-only browse into an end-to-end upload→process→publish→stream loop. An artist uploads audio (plus optional cover art) directly to Cloudflare R2 via presigned URLs; a BullMQ worker extracts duration and flips the track to a reviewable draft; a moderator publishes it; unauthenticated listeners stream published audio through a signed R2 URL, with play events recorded for analytics. The work reuses the existing NestJS/Prisma/Next.js stack and adds only small, well-known dependencies (`bullmq`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `music-metadata`).

Two important discrepancies with the brief were confirmed by reading the code and drive assumptions noted throughout:

- The brief assumes a pre-existing `publish` endpoint to "reuse and add guards." **No such endpoint exists** — `TracksController` (`apps/api/src/tracks/tracks.controller.ts`) only exposes public `GET`, like/unlike, and is-liked. The full track-management surface (create, finalize, update, submit, publish, reject, credits, play, stream, "my tracks") is created here.
- The brief references `apps/web/src/app/artist/dashboard/page.tsx` as a stub. **It does not exist**; it is created here. The real upload stub lives at `apps/web/src/app/artist/upload/page.tsx`.

**Deferred (explicit confirmation):** Monetisation/earn (`apps/web/src/app/earn`, payment provider) and Meilisearch search (the current `SearchService` uses Prisma `contains`; swapping to Meilisearch) are **out of scope** for this phase and deferred to a later phase. This phase is upload + streaming MVP only.

**Decision points resolved:**

| Decision | Choice | Why |
|---|---|---|
| Audio upload | Presigned direct-to-R2 PUT | Audio can be ~100 MB; proxying through Node risks memory/timeouts. Presigned PUT offloads bytes to R2 with browser XHR progress. |
| Cover upload | Server-proxied multipart | Covers are <10 MB; server-proxy lets the API validate MIME/size and upload synchronously, returning a usable URL. Simpler client. |
| Audio playback | Signed R2 URL, short TTL, 302 redirect | Private bucket + signed URL honors the brief; R2 supports HTTP Range natively so seeking works; no API byte-proxying. PUBLISHED content needs no per-request gating, so the range-proxy is unnecessary. |
| Bucket access | Single **private** bucket | Makes signed URLs meaningful (not security theater). Covers served via presigned URLs computed at read time; existing full-URL `coverImageUrl` values pass through unchanged. |
| Duration extraction | `music-metadata` (pure JS) | Works in dev with no native ffmpeg/ffprobe. Transcode + waveform are optional and stubbed. |
| Play counting | Separate `POST /tracks/:id/play`, idempotent via client `clientPlayId` | Decouples counting from seeking (range requests hit R2 directly, never re-hitting the API). |
| Queue client in API | Raw `bullmq` `Queue` (not `@nestjs/bullmq`) | Matches the existing worker (raw bullmq); avoids introducing a framework wrapper. |

---

## 1. Schema diffs (`packages/database/prisma/schema.prisma`)

Additive only. No existing column is renamed or removed. `TrackStatus` already includes `UPLOADING`, `PROCESSING`, `PROCESSING_FAILED`, `PENDING_REVIEW`, `PUBLISHED`, etc. `MediaAsset` and `Track.durationSeconds` already exist.

**Track — add two optional fields:**

```prisma
model Track {
  // ...existing fields...
  audioUrl        String?   // existing; now stores the R2 object KEY (not a public URL)
  coverImageUrl   String?   // existing; new uploads store the R2 key, legacy values may be full URLs
  durationSeconds Int?      // existing; set by worker
  // NEW:
  processingError  String?
  processedAt      DateTime? @db.Timestamptz
  // ...existing relations...
  playbackEvents   PlaybackEvent[]
}
```

Invariant: `audioUrl` holds an R2 object key for new uploads (e.g. `audio/{trackId}/{assetId}.mp3`). It is never returned in `TrackDto` (the mapper already omits it — confirmed in `tracks.service.spec.ts`). The streaming endpoint presigns it on demand.

**New model `PlaybackEvent`** (play counting + idempotency):

```prisma
model PlaybackEvent {
  id           String   @id @default(uuid())
  trackId      String
  userId       String?
  clientPlayId String   @unique
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now()) @db.Timestamptz()

  track Track  @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user  User?  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([trackId, createdAt])
}
```

Add `playbackEvents PlaybackEvent[]` to the `User` model (additive relation).

**No change** to `MediaAsset` (already has `assetType`, `storageKey`, `mimeType`, `fileSizeBytes`, `checksum`). The worker upserts one `AUDIO` row per track; the cover upload creates one `COVER` row.

Migration name: `phase4-upload-streaming` (`npx prisma migrate dev --name phase4-upload-streaming` from `packages/database`).

---

## 2. Dependencies

Add exact-pinned versions (install via `pnpm add --save-exact` so no `^`; versions below are a guide — the implementer pins whatever `pnpm` resolves at install time).

- `apps/api`:
  - `bullmq` (producer; matches worker's `bullmq`)
  - `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (R2 presign + object ops)
- `apps/worker`:
  - `@aws-sdk/client-s3` (GetObject to stream into the parser)
  - `music-metadata` (pure-JS duration/metadata extraction; no ffmpeg)
  - dev: `vitest`, `@types/node` (already present)
- `apps/web`: none. Upload uses XHR (`XMLHttpRequest`) for PUT progress and `fetch`/`apiFetch` for JSON; player uses a native `<audio>` element. No new runtime deps.
- `packages/contracts`, `packages/database`: none.

Justification: all are well-known, actively maintained. `@aws-sdk/client-s3` is the brief's named example. `music-metadata` removes the hard ffmpeg dependency for the required duration step.

---

## 3. Environment / config

`.env.example` **already** has `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`, and `REDIS_URL`. No new env keys are required.

**`apps/api/src/config/env.validation.ts`** — add Joi rules so misconfiguration fails loud (mirrors the existing `Joi.when('NODE_ENV', ...)` pattern so tests aren't blocked):

```ts
S3_ENDPOINT: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.allow('').default('') }),
S3_REGION: Joi.string().default('auto'),
S3_BUCKET: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.allow('').default('') }),
S3_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.allow('').default('') }),
S3_SECRET_ACCESS_KEY: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.allow('').default('') }),
MEDIA_PUBLIC_BASE_URL: Joi.string().uri().allow('').default(''),
```

(These run inside the existing `allowUnknown: true, abortEarly: false` config, so adding keys is safe.)

**Local/dev storage:** a Cloudflare R2 bucket works, or a local S3-compatible store (MinIO) pointed at `S3_ENDPOINT=http://localhost:9000`. The bucket must be **private** (no public listing). Document this in the repo's run instructions.

---

## 4. Storage module (API)

**New files:**
- `apps/api/src/storage/storage.module.ts`
- `apps/api/src/storage/storage.service.ts`

`StorageModule` is `@Global()`, provides and exports `StorageService`. Wire into `AppModule` imports.

### `StorageService` shape

Constructs one `S3Client` (lazy, in `onModuleInit`) from env: `endpoint`, `region` (`S3_REGION`, default `auto`), `forcePathStyle: true` (R2 requirement), credentials from `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`.

```ts
@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private readonly bucket = process.env.S3_BUCKET!;

  // presign a PUT for direct browser upload (audio)
  createPresignedPut(key: string, contentType: string, expiresInSec = 600): Promise<{ url: string; key: string }>
  // presign a GET (streaming redirect / cover image)
  createPresignedGet(key: string, expiresInSec: number): Promise<string>
  // verify an object exists after a direct PUT (finalize)
  headObject(key: string): Promise<{ size: number; contentType: string; etag: string } | null>
  // server-proxy upload (cover art)
  putObject(key: string, body: Buffer, contentType: string): Promise<void>
  // worker-facing read (also used internally)
  getObjectStream(key: string): Promise<Readable>
}
```

`@aws-sdk/s3-request-presigner`'s `getSignedUrl` is used for both PUT (`Command: PutObjectCommand`) and GET (`GetObjectCommand`).

**Object key scheme** (UUID-based, unguessable; owned by `StorageService`):

- Audio: `audio/{trackId}/{assetId}.{ext}` where `assetId = randomUUID()`, ext derived from the declared content type.
- Cover: `covers/{trackId}/{assetId}.{ext}`.

**MIME whitelist** (enforced at presign and re-checked at finalize/worker):

- Audio: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/aac`, `audio/mp4`, `audio/x-m4a`, `audio/m4a`.
- Cover: `image/jpeg`, `image/png`, `image/webp`.

**Size limits:** audio ≤ 150 MB (soft, declared at init; hard-checked at finalize via `headObject().size`), cover ≤ 10 MB (hard-checked in the multipart handler before `putObject`).

### Error handling (StorageService)

| Operation | Failure | Recoverable? | Caller receives | Logging |
|---|---|---|---|---|
| `createPresignedPut` | R2 unreachable / bad creds (`S3ServiceException`) | Fatal for request | Controller → 500 | error |
| `createPresignedGet` | R2 error | Fatal for request | Controller → 500 | error |
| `headObject` (finalize) | Object missing (upload didn't complete) | Recoverable (client re-PUTs) | 409 Conflict "Upload not completed" | warn |
| `putObject` (cover) | R2 error | Fatal | 500 | error |

---

## 5. Queue producer (API)

**New files:**
- `apps/api/src/queue/queue.module.ts`
- `apps/api/src/queue/queue.constants.ts`
- `apps/api/src/queue/audio-queue.service.ts`

Raw `bullmq` `Queue` (no `@nestjs/bullmq`). A single shared `IORedis` connection (`maxRetriesPerRequest: null`, required by BullMQ) is created in the module and provided as a token.

```ts
// queue.constants.ts
export const AUDIO_QUEUE = 'audio-processing'; // matches apps/worker stub
export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');
export interface AudioProcessingJobData {
  trackId: string;
  storageKey: string;
  mimeType: string;
}
```

`AudioQueueService` wraps `queue.add('process', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 })`. Injected into `TracksService` (finalize step). `QueueModule` is `@Global()`; wired into `AppModule`.

`REDIS_URL` already validated in `env.validation.ts`. The API already has `ioredis` as a dependency; `bullmq` is added.

---

## 6. Tracks module — management endpoints (API)

Extend the existing `TracksController` (`apps/api/src/tracks/tracks.controller.ts`) and `TracksService`. Keep the existing public `GET /`, `GET /:id`, like/unlike/isLiked unchanged. Inject `StorageService` and `AudioQueueService` into `TracksService`.

### New DTOs (`apps/api/src/tracks/dto/`)

All class-validator + Swagger `@ApiProperty`, matching the existing `TracksQueryDto` style.

- `create-track.dto.ts` — `CreateTrackDto { title: string (1–120, required); genreId?: string; description?: string (≤2000); explicit?: boolean; releaseDate?: string (ISO8601) }`. `genreId`, if present, must reference an existing `Genre` (service-level check → 400 `Genre not found`).
- `update-track.dto.ts` — `PartialType(CreateTrackDto)` (all optional) minus `title` required becomes optional; or a manual subset. Title still 1–120 when present.
- `finalize-upload.dto.ts` — empty body (the pending key is already on the track). Defined as `{}` for Swagger clarity.
- `record-play.dto.ts` — `RecordPlayDto { clientPlayId: string (@IsUuid, required) }`.
- `add-credit.dto.ts` — `AddCreditDto { name: string (1–120, required); role: string (1–80, required); userId?: string }`.

### New endpoints (route order matters — static routes before `/:id`)

| Method | Path | Guard | Action |
|---|---|---|---|
| `POST` | `/api/v1/tracks` | `JwtAuthGuard + RolesGuard(ARTIST)` | Init upload: create `Track` (status `UPLOADING`, `uploadedById`, `artistProfileId` from the user's `ArtistProfile`), generate audio presigned PUT, return `{ trackId, uploadUrl, storageKey, expiresAt }`. |
| `POST` | `/api/v1/tracks/:id/cover` | `JwtAuthGuard + RolesGuard(ARTIST)` + owner | Server-proxy multipart cover upload. Validate MIME/size, `putObject`, create `MediaAsset(COVER)`, set `Track.coverImageUrl` to the key. Return `{ coverImageUrl }` (the presigned read URL, computed by the mapper). |
| `POST` | `/api/v1/tracks/:id/finalize` | `JwtAuthGuard + RolesGuard(ARTIST)` + owner | `headObject(audioKey)`; if missing → 409. Set `Track.audioUrl = key`, create `MediaAsset(AUDIO)` with size/etag, status `PROCESSING`, clear `processingError`. Enqueue `AudioProcessingJobData`. Return `{ trackId, status }`. |
| `PATCH` | `/api/v1/tracks/:id` | `JwtAuthGuard + RolesGuard(ARTIST)` + owner | Update metadata; only allowed while `DRAFT` or `PENDING_REVIEW` (else 409). Validate `genreId` existence if provided. |
| `POST` | `/api/v1/tracks/:id/credits` | `JwtAuthGuard + RolesGuard(ARTIST)` + owner | Append `TrackCredit` row(s). Only while `DRAFT`/`PENDING_REVIEW`. |
| `POST` | `/api/v1/tracks/:id/submit` | `JwtAuthGuard + RolesGuard(ARTIST)` + owner | `DRAFT → PENDING_REVIEW`, gated on processed audio (see §8). |
| `POST` | `/api/v1/tracks/:id/publish` | `JwtAuthGuard + RolesGuard(MODERATOR,ADMIN)` | `PENDING_REVIEW → PUBLISHED`, gated on processed audio; set `releaseDate = now()` if null. |
| `POST` | `/api/v1/tracks/:id/reject` | `JwtAuthGuard + RolesGuard(MODERATOR,ADMIN)` | `PENDING_REVIEW → REJECTED` (body `{ reason?: string }`). |
| `GET` | `/api/v1/tracks/me` | `JwtAuthGuard + RolesGuard(ARTIST)` | Artist's own tracks (all statuses), cursor-paginated. Declared **before** `GET /:id`. |
| `GET` | `/api/v1/tracks/:id/stream` | none (public) | PUBLISHED only → 302 to presigned GET (1h TTL). Else 404. No counting. |
| `POST` | `/api/v1/tracks/:id/play` | `JwtAuthGuard` optional | Record play (see §7). |

`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` + `@ApiBearerAuth()` + `@ApiOperation(...)` on each, matching the artists controller pattern.

### Ownership invariant

Owned by `TracksService.assertOwnsTrack(userId, trackId)`: load `track.artistProfile.userId`; if it differs from `userId` → `ForbiddenException`. Every artist-scoped mutation calls it first.

### Mapper extension

The track mapper (duplicated in `TracksService`, `ArtistsService`, `FeedService`) gains: `coverImageUrl` resolved via `storageService.presignCoverUrl(value)` — if `value` starts with `http`, return as-is (backward compat for legacy data); else treat as a key and return `createPresignedGet(value, 3600)`. `audioUrl` remains omitted. Add `processingError?: string` and `streamUrl?: string` (set to `/api/v1/tracks/:id/stream` only when `status === 'PUBLISHED'`). Because the mapper now needs `StorageService`, refactor the three mappers to a shared `TrackMapper` helper injected with `StorageService` (or pass a `presignCover` function) to avoid duplication. This refactor is internal and additive.

---

## 7. Play counting (API)

`POST /api/v1/tracks/:id/play` with `RecordPlayDto { clientPlayId }`. The web client generates one `crypto.randomUUID()` per playback session and calls this once when playback actually starts (`onPlay`, after the element has data).

`TracksService.recordPlay(userId|null, trackId, clientPlayId, req)`:
1. Load track; if not `PUBLISHED` → `NotFoundException` (404). Logged debug.
2. Try to create `PlaybackEvent` with the unique `clientPlayId`.
   - Duplicate `clientPlayId` (P2002) → return `{ played: false, playCount }` (idempotent, **no error**, no increment). Logged debug.
   - New row → in a `$transaction([create PlaybackEvent, update Track.playCount increment])`, return `{ played: true, playCount: Number(track.playCount)+1 }`.
3. `ipAddress`/`userAgent` captured from the request (existing `AuditLog` pattern references request meta; reuse the same extraction).

Invariant "at most one increment per `clientPlayId`" is owned by the `PlaybackEvent.clientPlayId` unique constraint at the DB layer — the application layer relies on it. The global `ThrottlerGuard` already bounds request rate; note that anonymous inflation is a known soft limitation for MVP (mitigated by throttling + idempotency per session, not per-user).

Why a separate `/play` endpoint instead of counting on `/stream`: the browser caches the redirected R2 URL and issues subsequent `Range` requests for seeking **directly to R2**, never re-hitting `/stream`. Counting on `/stream` would either under-count (only first load) or, if we forced re-counts, inflate on every seek. Decoupling gives clean, testable, idempotent counting and keeps `/stream` seek-safe.

---

## 8. Streaming (API)

`GET /api/v1/tracks/:id/stream`:
1. Load track by id (select `status`, `audioUrl`).
2. If not found or `status !== 'PUBLISHED'` → `NotFoundException` (404). Drafts/pending/processing/rejected all 404 — no status leak.
3. If `audioUrl` is empty/missing → 500 (data integrity; logged error — a PUBLISHED track must have audio).
4. `const url = await storageService.createPresignedGet(audioUrl, 3600)` → respond `302` with `Location: url`. No body.

TTL = 3600s (1h). Rationale: "short TTL" relative to a permanent URL, but long enough to cover a full playback session so a presigned URL doesn't expire mid-listen (which would break seeks to the cached R2 URL). The alternative — minutes TTL with client re-fetch on expiry — is a future refinement; for MVP a private bucket + expiring 1h URL honors the brief and keeps playback robust. Range requests are handled natively by R2 on the presigned GET URL (the browser's `<audio>` element issues `Range` headers to the cached R2 URL).

Considered and rejected: an API range-proxy (`/stream` reads Range and proxies 206 chunks from R2). It guarantees seeking and per-request gating but proxies every audio byte through Node — bandwidth/CPU cost with no MVP benefit, since PUBLISHED content needs no per-request access control. Allowed by the brief only "if access must be per-request gated," which it isn't.

---

## 9. Worker design (`apps/worker`)

**New/changed files:**
- `apps/worker/src/workers/audio-processing.worker.ts` (refactor: extract pure processor)
- `apps/worker/src/workers/audio-processing.processor.ts` (new — testable core)
- `apps/worker/src/storage.ts` (new — minimal S3 helper; duplicates API `StorageService` read path intentionally, documented)
- `apps/worker/src/workers/audio-processing.processor.spec.ts` (new)
- `apps/worker/package.json` (add `music-metadata`, `@aws-sdk/client-s3`, `vitest`; `test` script → `vitest run`)

The worker is **not** a NestJS app; it constructs `PrismaClient` and its own `S3Client` directly (same env). `@prisma/client` is already a dependency.

### Job payload & queue

- Queue name: `audio-processing` (matches the stub and the API producer).
- `AudioProcessingJobData { trackId, storageKey, mimeType }`.
- BullMQ options: `{ attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 }`.

### `processAudioJob(data, deps)` — the testable core

`deps = { prisma, s3: { getObjectStream, headObject }, parseAudio }` (injectable for tests).

1. Set `Track.status = 'PROCESSING'`, clear `processingError` (idempotent start marker).
2. `headObject(storageKey)` → if null, throw `ObjectNotFoundError` (BullMQ retries; after exhaustion, catch sets `PROCESSING_FAILED`).
3. `getObjectStream(storageKey)` → pipe into `music-metadata`'s `parseStream` → `{ format: { duration, ... } }`.
4. Validate: `duration` is a finite number `> 0`. If `0`/`NaN`/missing → `processingError = 'Invalid or zero-duration audio'`, set `PROCESSING_FAILED`, return (do **not** retry — bad data won't fix itself).
5. (Optional) Transcode + waveform: gated on `process.env.AUDIO_TRANSCODE_ENABLED === 'true'` **and** a successful `ffmpeg`/`ffprobe` PATH check. For MVP this is **off** — the worker logs `"transcode disabled"` and skips. `Track.waveform` is not added to the schema (backlogged). This keeps the worker real and tested without ffmpeg.
6. Success path: in one `prisma.track.update`: `durationSeconds = Math.round(duration)`, `status = 'DRAFT'`, `processedAt = now`, `processingError = null`. Upsert `MediaAsset(AUDIO)` (`storageKey`, `mimeType`, `fileSizeBytes = head.size`, `checksum = head.etag`).

### Status fields written back to Track

- Start: `status = PROCESSING`.
- Success: `status = DRAFT`, `durationSeconds`, `processedAt`, `processingError = null`, `MediaAsset(AUDIO)`.
- Failure (bad data): `status = PROCESSING_FAILED`, `processingError = '<reason>'`.
- Failure (transient, e.g. S3 error): throw → BullMQ retries; on final failure, the `worker.on('failed')` handler (or the processor's catch) sets `status = PROCESSING_FAILED`, `processingError = last error message`.

### Error handling matrix (worker)

| Condition | Recoverable? | Action | Logging |
|---|---|---|---|
| S3 object missing (upload never completed) | Transient → retry; then fatal | Throw → retry ×3; final → `PROCESSING_FAILED` | error |
| `music-metadata` parse throws | Fatal (bad file) | `PROCESSING_FAILED`, no retry | warn |
| `duration <= 0` | Fatal (bad file) | `PROCESSING_FAILED` (`processingError='Invalid or zero-duration audio'`), no retry | warn |
| DB write fails | Fatal | Throw → retry; final → BullMQ marks failed (status stuck on `PROCESSING` → a `PROCESSING_FAILED` sweep is out of MVP scope; document) | error |
| ffmpeg absent | Expected in dev | Skip transcode/waveform, log info | info |

### Testability

`processAudioJob` is a pure function with injected deps, so it's unit-tested **without Redis, R2, or ffmpeg**:
- Success: mock `headObject` → size/etag, mock `getObjectStream` → a buffer stream, mock `parseAudio` → `{ format: { duration: 183.4 } }`; assert `track.update` called with `status:'DRAFT'`, `durationSeconds:183`, `processedAt` set, `MediaAsset` upserted.
- Zero duration: `parseAudio` → `{ format: { duration: 0 } }`; assert `status:'PROCESSING_FAILED'`, `processingError` set, no retry throw.
- S3 missing: `headObject` → null; assert throw (so BullMQ retries) and eventual `PROCESSING_FAILED`.

---

## 10. Publishing flow & guards

States use the existing `TrackStatus` enum. The brief's "reuse existing publish endpoint" does not apply (none exists); the endpoints are created in §6.

- **DRAFT → PENDING_REVIEW** (`POST /tracks/:id/submit`, artist-owner). Guards:
  - `status === 'DRAFT'` else 409 `Cannot submit from current status`.
  - Processed: `durationSeconds != null && durationSeconds > 0 && audioUrl` present (equivalently `processedAt != null`). Else 409 `Track not ready: audio not processed`.
- **PENDING_REVIEW → PUBLISHED** (`POST /tracks/:id/publish`, MODERATOR/ADMIN). Guards:
  - `status === 'PENDING_REVIEW'` else 409.
  - Processed (same check). Else 409.
  - `releaseDate = releaseDate ?? now()`.
- **PENDING_REVIEW → REJECTED** (`POST /tracks/:id/reject`, MODERATOR/ADMIN). Body `{ reason?: string }`; store reason in `processingError`? No — reuse a lightweight approach: set `status = REJECTED` and optionally persist `reason` in `processingError` (it's a free-text field). Document this reuse.

Invariant "audio processed before publish" is owned by `TracksService` (both `submit` and `publish` check it), because the worker is async and the artist/moderator cannot self-certify. Defense: `/stream` independently only serves `PUBLISHED` and presigns `audioUrl`, so even a misconfigured PUBLISHED track without audio returns 500 (logged) rather than leaking.

---

## 11. Contracts (`packages/contracts/src/index.ts`)

Backward-compatible additions only. No existing type renamed or removed.

```ts
export interface UploadInitResponseDto {
  trackId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string; // ISO
}

export interface UploadFinalizeResponseDto {
  trackId: string;
  status: TrackStatus;
  durationSeconds?: number;
}

export interface PlayResponseDto {
  played: boolean;
  playCount: number;
}

export interface CoverUploadResponseDto {
  coverImageUrl: string;
}

export interface AddCreditDto {
  name: string;
  role: string;
  userId?: string;
}
```

Extend `TrackDto` (additive optional fields — existing consumers unaffected):
```ts
export interface TrackDto {
  // ...existing...
  processingError?: string;
  streamUrl?: string; // present only when status === 'PUBLISHED'
}
```

`MyTracksResponseDto` reuses `PaginatedResponse<TrackDto>` shape (the API returns `{ items, nextCursor }` to match existing tracks endpoints; the web hook maps accordingly). No new paginated type needed.

---

## 12. Web

No new deps. All under `apps/web/src`. Match existing patterns: App Router pages, TanStack Query hooks in `src/lib/hooks`, components in `src/components`, `apiFetch` from `src/lib/api.ts`, Tailwind + `lucide-react` + `clsx` styling (match the purple theme in existing components).

### 12.1 Hooks (`src/lib/hooks/useTracks.ts` + new)

Add to `useTracks.ts`:
- `useMyTracks()` → `GET /api/v1/tracks/me` (`{ items, nextCursor }`).
- `useInitUpload()` → `useMutation` `POST /api/v1/tracks` → returns `UploadInitResponseDto`.
- `useFinalizeUpload()` → `useMutation` `POST /api/v1/tracks/:id/finalize`.
- `useUpdateTrack()` → `useMutation` `PATCH /api/v1/tracks/:id`.
- `useUploadCover()` → `useMutation` (multipart, uses `fetch` directly, not `apiFetch`, because of `FormData`).
- `useAddCredit()` → `useMutation` `POST /api/v1/tracks/:id/credits`.
- `useSubmitTrack()` → `useMutation` `POST /api/v1/tracks/:id/submit`.
- `usePublishTrack()` → `useMutation` `POST /api/v1/tracks/:id/publish` (moderator dashboard; minimal).
- `useRecordPlay()` → `useMutation` `POST /api/v1/tracks/:id/play`.

The presigned PUT upload itself is **not** a TanStack mutation against the API (it goes to R2); it's an XHR helper `uploadToR2(url, file, onProgress)` in `src/lib/upload.ts` returning a promise. The upload page wraps it in local state + progress.

### 12.2 Player (`src/components/music/Player.tsx` + `src/providers/PlayerProvider.tsx`)

- `PlayerProvider` (mounted in `src/app/layout.tsx` alongside `QueryProvider`) owns a single `<audio ref>` element and the "now playing" track, so playback persists across App Router navigation. Exposes `play(track)`, `toggle()`, `seek(time)`, `setVolume(v)`, and state `{ current, isPlaying, currentTime, duration, volume }`. No queue (out of scope).
- `Player.tsx` is the presentational bar (cover, title/artist, play/pause, seek slider bound to `currentTime`/`duration`, volume slider). Accessible: `aria-label`s, `role="slider"` on sliders, keyboard-operable. Used both inside the provider's bottom bar and on the track detail page.
- On first `onPlay` of a track, generate `clientPlayId = crypto.randomUUID()`, call `useRecordPlay().mutate({ clientPlayId })` once per session (stored on the track's session in the provider; re-generate only when a new track starts).
- Audio `src = ${API_BASE}/api/v1/tracks/:id/stream` (the 302 endpoint). Seeking works via the native element + R2 range support.
- `MiniPlayer.tsx` is rewired to read from `PlayerProvider` (now-playing title/cover, play/pause, link to `/tracks/:id`).

### 12.3 Track detail page (`src/app/tracks/[id]/page.tsx`) — NEW

`useTrack(id)` to fetch; render cover, title, artist (link to `/artist/:artistId`), stats (plays/likes), and the `Player` via `play(track)` from context. If the API returns 404 (not published / not found), show a not-found state. Wire the "like" control to the existing like endpoints.

### 12.4 Upload page (`src/app/artist/upload/page.tsx`) — replace stub

Keep the existing 5-step visual shell and theme, but make it functional with TanStack mutations:
1. **Audio File** — drag-drop / file input; client-side MIME + size check; on pick → `useInitUpload().mutateAsync` → XHR PUT to `uploadUrl` with progress bar → store `trackId` + `storageKey`.
2. **Song Details** — title, genre (select, sourced from `GET /api/v1/genres` via existing `useFeed`/a genres hook or a simple fetch), releaseDate, explicit, description → `useUpdateTrack().mutateAsync`.
3. **Credits** — featured/producer/lyricist/composer rows → `useAddCredit().mutateAsync` per row.
4. **Artwork** — image picker; client-side MIME/size check → `useUploadCover().mutateAsync` (multipart) with progress → preview.
5. **Publish** — `useFinalizeUpload().mutateAsync` → shows processing spinner; poll `useTrack(trackId)` with `refetchInterval` while `status` is `UPLOADING`/`PROCESSING`; when `DRAFT`, show "Save as Draft" (no-op, already draft) and "Submit for Review" → `useSubmitTrack().mutateAsync` → success redirects to `/artist/dashboard`. If `PROCESSING_FAILED`, show `processingError` and a retry/finalize-again CTA.

Upload progress uses XHR `upload.onprogress`; JSON steps use `apiFetch`.

### 12.5 Artist dashboard (`src/app/artist/dashboard/page.tsx`) — NEW

`useMyTracks()` lists the artist's tracks (all statuses) as rows: cover, title, status badge (color per `TrackStatus`), duration, plays, and contextual actions:
- `DRAFT` → "Edit" (link to `/artist/upload?edit=:id`) + "Submit for Review" (if processed).
- `PROCESSING` → spinner + "processing…".
- `PROCESSING_FAILED` → error icon + `processingError` + "Retry upload" (link).
- `PENDING_REVIEW` → "Awaiting review".
- `PUBLISHED` → "Published" + play link to `/tracks/:id`.
Header shows artist stats (followers/tracks) and an "Upload" CTA → `/artist/upload`.

### 12.6 Edge cases (web)

- Upload step 1 aborted/failed mid-PUT → show error, allow re-init (creates a new track row; the orphaned `UPLOADING` track is acceptable for MVP — document; a cleanup job is out of scope).
- Worker still processing when user navigates to dashboard → poll handles the flip.
- `/stream` returns 404 for a non-published track → `<audio>` `onError` shows "Track unavailable".
- Network failure on `recordPlay` → silent (play counting is best-effort; don't block playback).

---

## 13. Cleanup fixes (Phase 3 carryover)

Verified against current code; all four are open. Fixes are minimal and in-scope; no scope creep.

### 13.1 `ArtistsService.apply()` non-atomic (HIGH) — CONFIRMED OPEN

`apps/api/src/artists/services/artists.service.ts` `apply()` does `artistProfile.create(...)` then `user.update({ role: 'ARTIST' })` as two separate awaits. A failure between them leaves a user with an `ArtistProfile` but `LISTENER` role, locking them out of `/artists/me`.

**Fix:** wrap both writes in one `$transaction` (the codebase already uses array-form `$transaction`, e.g. `followArtist`):
```ts
const [profile] = await this.prisma.$transaction([
  this.prisma.artistProfile.create({ data: { userId, stageName: dto.stageName, bio: dto.bio, verificationStatus: 'PENDING' } }),
  this.prisma.user.update({ where: { id: userId }, data: { role: 'ARTIST' } }),
]);
return profile;
```
Update `artists.service.spec.ts` to assert `$transaction` is called and both writes occur atomically (mock `$transaction` to resolve the array).

### 13.2 Genre filter silently ignored on unknown slug — CONFIRMED OPEN

`apps/api/src/tracks/tracks.service.ts` `getPublishedTracks`: when `query.genre` is given but no `Genre` matches, the filter is dropped and all tracks return (silent).

**Fix:** throw `NotFoundException('Genre not found')` when `query.genre` is provided but resolves to null. Add a test asserting the 404 for an unknown slug. (Alternative — return an empty list — was rejected because 404 surfaces the typo instead of hiding it.)

### 13.3 `getTrending` fallback discards recent results — CONFIRMED OPEN

`apps/api/src/feed/feed.service.ts` `getTrending`: when recent (7-day) tracks are fewer than `limit`, it fetches all-time and **returns all-time alone**, discarding the recent tracks it already found.

**Fix:** keep the recent tracks and fill the remainder from all-time, excluding already-included ids:
```ts
if (tracks.length < limit) {
  const recentIds = tracks.map((t) => t.id);
  const fillers = await this.prisma.track.findMany({
    where: { status: 'PUBLISHED', id: { notIn: recentIds } },
    orderBy: { playCount: 'desc' },
    take: limit - tracks.length,
    select: TRACK_SELECT,
  });
  return [...tracks, ...fillers].map(mapTrack);
}
return tracks.map(mapTrack);
```
Add a test asserting recent tracks stay first and no id is duplicated.

### 13.4 Missing FeedService tests — CONFIRMED OPEN

No `apps/api/src/feed/feed.service.spec.ts` exists. **Add it**, following the `tracks.service.spec.ts` pattern (Vitest, `buildPrisma` mock with `vi.fn()`s, `new FeedService(prisma)` via `@ts-expect-error`). Cover: `getFeed` (trending/newReleases/byGenre filtering + `fromFollowing` when userId + follows present), `getTrending` (recent sufficient; recent insufficient → merged + deduped), `getNewReleases`.

No other phase-3 findings are addressed; the brief restricts to these four.

---

## 14. Tests

- **API (Vitest, `pnpm test`):**
  - `tracks.service.spec.ts` — extend: init upload (creates `UPLOADING` track, returns presigned), finalize (object missing → 409; ok → `PROCESSING` + enqueue), `assertOwnsTrack` (forbidden), submit (not processed → 409; ok), publish (not `PENDING_REVIEW` → 409; ok), recordPlay (PUBLISHED ok; duplicate `clientPlayId` → `played:false` no increment; not PUBLISHED → 404), getMyTracks (all statuses, owner only). Mock `StorageService` and `AudioQueueService`.
  - `storage.service.spec.ts` — new: assert key scheme, presign calls S3 with correct key/expiry, `headObject` returns null on 404, MIME whitelist enforcement.
  - `feed.service.spec.ts` — new (§13.4).
  - `artists.service.spec.ts` — update apply() to expect `$transaction`.
  - Existing tests remain green (the genre-filter change updates/extends, not removes, the relevant assertions).
- **Worker (Vitest, new `pnpm test`):** `audio-processing.processor.spec.ts` (§9) — success, zero-duration failure, S3-missing failure. No Redis/R2/ffmpeg needed.
- **Web:** `pnpm run typecheck` is the gate (no test runner configured; adding one is out of scope). The Player/upload/dashboard are validated by typecheck + manual E2E.

---

## 15. Build / dependency order

1. **Schema** (`packages/database`): add `PlaybackEvent`, `Track.processingError`, `Track.processedAt`, `User.playbackEvents` → `prisma migrate dev --name phase4-upload-streaming` → `prisma generate`. (Prisma types flow to API + worker.)
2. **Contracts** (`packages/contracts`): add the §11 types/fields.
3. **API deps**: install `bullmq`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (exact).
4. **API**: `StorageModule` → `QueueModule` → `TracksService`/`TracksController` extensions → `env.validation` additions → wire both modules into `AppModule` → `TrackMapper` refactor.
5. **Worker deps**: install `music-metadata`, `@aws-sdk/client-s3`, `vitest`.
6. **Worker**: `storage.ts`, `audio-processing.processor.ts`, refactor `audio-processing.worker.ts`, spec, `package.json` test script.
7. **Cleanup fixes** (§13) — can land with step 4.
8. **Web**: hooks → `PlayerProvider`/`Player` → track detail page → upload page → dashboard → `MiniPlayer` rewire → `layout.tsx` mount.
9. **Verification** (§16).

---

## 16. Verification

Run from `c:/Users/AHMED MANUEL BOATENG/Downloads/UNIS MUSIC` in PowerShell.

- `packages/database`: `npx prisma migrate dev --name phase4-upload-streaming` then `npx prisma generate`.
- `apps/api`: `pnpm run build` ; `pnpm test` (all suites pass).
- `apps/worker`: `pnpm run typecheck` ; `pnpm test`.
- `apps/web`: `pnpm run typecheck`.
- Workspace: `pnpm -r typecheck` (all packages clean).

**Manual E2E (this env):**
1. Put R2 creds + `REDIS_URL` + `DATABASE_URL` in `.env` (R2 bucket or local MinIO; bucket private). `pnpm --filter @unis-music/database migrate dev` + `generate`.
2. Start API (`pnpm --filter @unis-music/api dev`), worker (`pnpm --filter @unis-music/worker dev`), web (`pnpm --filter @unis-music/web dev`).
3. Register a user → apply as artist (confirms `apply()` atomicity — role flips to `ARTIST` in one transaction).
4. `/artist/upload`: pick an mp3 (watch XHR upload progress) → fill metadata → add a credit → upload cover → finalize. Worker log shows the job; `/artist/dashboard` polls until status flips `PROCESSING → DRAFT` with `durationSeconds` set.
5. "Submit for Review" → status `PENDING_REVIEW`.
6. As `MODERATOR`/`ADMIN`, publish → status `PUBLISHED`.
7. Open `/tracks/:id`, press play → audio streams (`/stream` 302 → R2), seeking works, `POST /play` fires once (playCount increments).
8. Negative: a `DRAFT` track's `GET /api/v1/tracks/:id/stream` returns 404.

---

## 17. Assumptions

- The brief's "existing publish endpoint" does not exist; it is created here (§6/§10). Same for `/artist/dashboard` (§12.5) and the artist-owned `create`/`update`/`credits`/`play`/`stream`/`me` endpoints.
- Single private R2 bucket; covers served via presigned URLs computed at read time (legacy full-URL `coverImageUrl` values pass through). `MEDIA_PUBLIC_BASE_URL` remains available for a future public-CDN switch but is not the playback path in this phase.
- "Short TTL" interpreted as 1h (session-safe) for audio and cover presigned URLs; a minutes-TTL + re-fetch variant is a documented future refinement.
- Worker duration extraction uses `music-metadata` (no native deps); transcode + waveform are optional, disabled by default, and stubbed without ffmpeg. The queue, job, and status writes are fully real and tested.
- Web has no test runner; `typecheck` is the automated gate; behavior is verified by the manual E2E in §16.
- Anonymous play-count inflation is a known soft limitation for MVP (mitigated by throttling + per-session `clientPlayId` idempotency), explicitly accepted.
