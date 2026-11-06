# Phase 4 — Upload & Streaming MVP: Design Review

Review of `c:/Users/AHMED MANUEL BOATENG/Downloads/UNIS MUSIC/.agents/tasks/phase4-upload-streaming/design.md`.
This review was performed cold (against the source, not the design's own claims) and verifies the design's factual assertions about the existing codebase.

---

## Verified Assumptions

All of the following design claims were checked against the actual source and confirmed accurate:

- **No write/publish/play endpoints exist in `TracksService`/`TracksController`.** Verified: `tracks.service.ts` exposes only `getPublishedTracks`, `getTrackById`, `likeTrack`, `unlikeTrack`, `isLiked`. `tracks.controller.ts` has only `@Get()` / `@Get(':id')` / `@Post(':id/like')` / `@Delete(':id/like')` / `@Get(':id/liked')`. The brief's "reuse existing publish endpoint / incrementPlayCount" is correctly reinterpreted as "create them"; the design states this explicitly in Assumptions.
- **`getTrackById` rejects non-PUBLISHED with `NotFoundException`** (and `audioUrl` is never in `TRACK_SELECT`). Verified. This is what makes the design's owner-scoped `GET /tracks/:id/management` + `useArtistTrack` polling necessary (Finding 1 in the prior revision was correctly resolved).
- **`ArtistsService.apply()` runs `artistProfile.create` then `user.update({ role: 'ARTIST' })` as two separate operations** (no `$transaction`). Verified — the HIGH bug is real and the proposed `this.prisma.$transaction([...])` array-form fix is correct and matches the brief verbatim.
- **`followArtist`/`unfollowArtist` use `$transaction` but the existence check sits outside it** (phase-3 finding #4). Verified; the design correctly defers it as "concurrency hardening" rather than fixing it this phase (no scope creep).
- **`FeedService.getTrending` discards the recent window and re-queries all-time when `tracks.length < limit`** (returns `allTime`, not a merge). Verified; the proposed merge (`[...recent, ...allTime].slice(0, limit)` with `notIn` dedup) is correct and preserves recent tracks.
- **`getPublishedTracks` silently drops the genre filter on an unknown slug** (`if (genre) where.genreId = genre.id;`). Verified; the proposed `NotFoundException('Genre not found')` fix is consistent with the codebase convention.
- **`app.module.ts`**: `ConfigModule.forRoot` (global, loads repo-root `.env`), `ThrottlerModule`, `PrismaModule`, and feature modules. Verified. New modules registering here is feasible.
- **`PrismaService extends PrismaClient`** (`OnModuleInit/Destroy`). Verified; the worker's plan to instantiate `PrismaClient` directly is consistent.
- **`env.validation.ts` Joi schema has no S3/R2 vars** (relies on `allowUnknown: true`). Verified; the additive Joi entries are appropriate.
- **Schema (`schema.prisma`)**: `Track` already has `slug`, `status` (full `TrackStatus` enum incl. `DRAFT/UPLOADING/PROCESSING/PROCESSING_FAILED/PENDING_REVIEW/REJECTED/PUBLISHED/...`), `playCount BigInt`, `likeCount Int`, `coverImageUrl String?`, `audioUrl String?`, `releaseDate DateTime?`, `durationSeconds Int?`, `genreId`, and `uploadedById String?`. `MediaAsset` and `TrackCredit` exist with the stated fields. **No `PlaybackEvent` model exists.** Verified — the proposed model is additive; the only new `Track` field is `audioMimeType String?` (additive). No existing column is renamed or removed.
- **Contracts (`packages/contracts/src/index.ts`)**: `TrackStatus` enum matches the Prisma enum; `TrackDto` carries the explicit "audioUrl intentionally omitted" note; types are sourced as TS (no build step). Verified; the proposed additions are additive and backward-compatible.
- **`.env.example`** has `S3_ENDPOINT/S3_REGION=auto/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/MEDIA_PUBLIC_BASE_URL/REDIS_URL`. Verified; the appended TTL + size-limit vars are consistent.
- **Worker** (`audio-processing.worker.ts` + `main.ts`): raw BullMQ `Worker` on queue `audio-processing`, `AudioProcessingJobData { trackId, storageKey, uploadSessionId }`, all processing is a TODO stub. `package.json` has `bullmq ^5.8.1`, `ioredis ^5.3.2`, `@prisma/client ^5.14.0`, no test runner. Verified; the proposed `music-metadata`-based processor (no native binary) + vitest (`vitest@^5.1.0` matches the API's actual devDep version, confirmed) keeps the worker real and tested without `ffprobe`.
- **Web**: `/upload/page.tsx` is a placeholder stub; `/artist/upload/page.tsx` exists; **`/artist/dashboard` does not exist**; **`/tracks/[id]` does not exist**; `/player/page.tsx` exists; `MiniPlayer.tsx` is a static preview bar; `TrackCard.tsx`'s play overlay has no handler; `/home/page.tsx` renders `<MiniPlayer />` locally; `layout.tsx` wraps in `<QueryProvider>`; `lib/api.ts` `apiFetch` uses `credentials: 'include'` and a JSON content type; `useTrack` exists (PUBLISHED-only via `getTrackById`). Verified.
- **`OptionalJwtAuthGuard`** exists and uses the standard optional pattern (`handleRequest` returns `user ?? null`, `canActivate` passes), so the unauthenticated stream endpoint capturing an optional `userId` is feasible. `RolesGuard` + `@Roles` + `CurrentUser` exist and are used in `artists.controller.ts`.
- **`GET /api/v1/genres` (list)** exists (`findAll`). Verified — the upload form's genre `<select>` via `useGenres` is feasible.
- **`class-validator` is `^0.14.1`**, so `@ArrayMaxSize(20)` is available for the bounded `credits` arrays.
- **`TracksModule` already `exports: [TracksService]`** and `TracksModule` does not import `ArtistsModule`, so `ArtistsModule` importing `TracksModule` to delegate `getArtistTracks` is a one-way (non-circular) dependency and is feasible.
- **`@aws-sdk/client-s3` and `bullmq` are not yet API deps** (bullmq is in the worker); `ioredis` is already an API dep. The design correctly lists only the genuinely-new API deps. The `vitest@5.1.0` pin for the worker matches the API's installed `^5.1.0`.

## Unverified / Wrong Assumptions

None. Every load-bearing factual claim about the existing code was verified against source. No wrong assumptions were found.

---

## Findings

### 1. [MEDIUM] Upload and cover endpoints lack status guards, allowing a submitted/published track to be un-published

**Where:** `TracksService.requestUploadUrl`, `finalizeUpload`, `requestCoverUrl` (TracksService build section, lifecycle diagram, error table).

**Problem:** The design specifies explicit status guards for four mutating endpoints — `updateDraft` (`status ∈ {DRAFT, PROCESSING_FAILED, REJECTED}`), `submitForReview` (`status === 'DRAFT'`), `publish` (`status === 'PENDING_REVIEW'`), `reject` (`status === 'PENDING_REVIEW'`) — but **none** for the three upload-side mutations:

- `requestUploadUrl` unconditionally sets `status = 'UPLOADING'` (and rotates `audioUrl`) with no check of the current status.
- `finalizeUpload` only checks `track.audioUrl` is set (which a PUBLISHED track has) and `headObject`, then sets `status = 'PROCESSING'` — no current-status check.
- `requestCoverUrl` unconditionally sets `coverImageUrl` with no status check.

Because a `PUBLISHED` track satisfies both `requestUploadUrl`'s precondition (owner-gated) and `finalizeUpload`'s precondition (`audioUrl` set + object present), an owner calling `POST /tracks/:id/upload-url` then `POST /tracks/:id/finalize-upload` on their own live track flips it `UPLOADING → PROCESSING → DRAFT`, effectively **un-publishing** it and forcing a full re-submit / re-review cycle. This is an integrity gap the UI does not surface (the dashboard only offers "Re-upload" on `PROCESSING_FAILED`), but the API endpoints are authenticated-callable. It is also **ambiguous** whether cover art may be changed on a `PUBLISHED` track: `requestCoverUrl` permits it while `updateDraft` forbids editing `PUBLISHED` tracks — the two endpoints disagree.

**Fix (concrete):** Add status guards consistent with `updateDraft`, returning `ConflictException` otherwise:
- `requestUploadUrl`: require `status ∈ {DRAFT, UPLOADING, PROCESSING_FAILED, REJECTED}` (initial upload, re-request during upload, re-upload after failure, fix after rejection); reject `PENDING_REVIEW`/`PUBLISHED`/`PROCESSING`/`SCHEDULED`/`TAKEN_DOWN`/`ARCHIVED` with 409.
- `finalizeUpload`: require `status === 'UPLOADING'` (re-finalize after a crash already lands in `UPLOADING` via the compensating revert); reject everything else with 409.
- `requestCoverUrl`: either apply the same `{DRAFT, UPLOADING, PROCESSING_FAILED, REJECTED}` guard, **or** add an explicit sentence to the design stating that cover art may be changed on `PUBLISHED` tracks as a documented exception (then `finalizeUpload`'s best-effort cover HEAD must not clobber a live cover on the PUBLISHED path — clarify that too). Pick one and state it.

### 2. [NIT] "File type authoritatively validated at finalizeUpload (HeadObject)" overstates type validation

**Where:** Invariants section ("File type/size — server is source of truth: validated at `requestUploadUrl`/`requestCoverUrl` (body) and authoritatively at `finalizeUpload` (`HeadObject` size)"); Field semantics for `MediaAsset.mimeType`.

**Problem:** `HeadObject` returns the `Content-Type` the client declared on the presigned PUT (the signature pins that header, so R2 stores it verbatim). It does **not** inspect the file's actual bytes — a client that lies about `Content-Type` at PUT time gets the same value back at HEAD. So "type" is not authoritatively validated at finalize; only **size** is (R2 measures real bytes). The actual content check is the worker's `music-metadata` probe, which fails on non-audio → `PROCESSING_FAILED` before the publish gate. The security model still holds (bad files never reach `PUBLISHED`), but the wording implies a guarantee the finalize step does not provide.

**Fix (concrete):** Reword to: "Size is authoritatively validated at `finalizeUpload` via `HeadObject.ContentLength`; the client-declared `Content-Type` is recorded as `MediaAsset.mimeType` (with the `audioMimeType`/octet-stream fallbacks). The authoritative audio-content check is the worker's `music-metadata` probe, which rejects non-audio as `PROCESSING_FAILED`; the publish gate (`durationSeconds > 0`) is the final backstop."

### 3. [NIT] StorageService failure-timing prose is self-contradictory and not reflected in the shown code

**Where:** "env additions" note: "The `StorageService` throws at construction time (module init) if `S3_BUCKET`/credentials are missing **and** any storage method is invoked — i.e. it stays importable for non-storage suites in dev, and fails fast on first use otherwise."

**Problem:** "throws at construction time" and "fails fast on first use" describe two different timings, and the shown `StorageService` constructor contains no such guard (it only reads config). Taken literally, "throws at construction time (module init)" would make the **whole API fail to boot** in dev when R2 is unconfigured — contradicting the design's stated goal ("stays importable for non-storage suites in dev"). The intent is clearly "do not crash on import; surface a clear error only when a storage method is actually called."

**Fix (concrete):** Replace with: "`StorageService` does **not** validate config at construction (so the app boots in dev without R2 configured). It throws a descriptive `InternalServerErrorException` on the **first invocation** of any storage method when `S3_BUCKET`/credentials are empty." Optionally show the one-line guard at the top of `createPresignedPut`/`createPresignedGet`/`headObject`/`publicUrl`-dependent methods (e.g. `if (!this.bucket) throw new InternalServerErrorException('S3 storage not configured');`).

### 4. [NIT] music-metadata stream parsing needs a Node→Web stream conversion; the buffer fallback buffers up to 100 MB per job

**Where:** Worker design, `AudioProbePort` real implementation ("streams `GetObject` body into `music-metadata`'s `parseWebStream` (or buffers to `parseBuffer` for reliability with odd formats)").

**Problem:** `@aws-sdk/client-s3` `GetObject().Body` is a Node `Readable` (with `.transformToWebStream()` available). `music-metadata`'s `parseWebStream` expects a Web `ReadableStream<Uint8Array>`; passing the Node stream directly will not typecheck/run without conversion. The `parseBuffer` fallback sidesteps this but reads the entire object into memory — up to `AUDIO_MAX_SIZE_BYTES` (100 MB) per concurrent job, which is wasteful for a worker that only needs container metadata.

**Fix (concrete):** State the conversion explicitly: `await getObject().Body.transformToWebStream()` (or `Body.transformToByteArray()` → `parseBuffer`). Prefer the streaming path for the common case and note that `music-metadata` can compute duration from headers without slurping the whole file for CBR mp3; reserve `parseBuffer` for formats the streaming parser rejects. This keeps worker memory bounded.

### 5. [NIT] Play recording blocks the stream response, coupling playback availability to DB health

**Where:** Streaming endpoint / `TracksService.getStreamUrl` ("`incrementPlayCount` ... in a `$transaction`" before returning the URL); error table ("`incrementPlayCount` DB error → fatal → 500 (play not counted)").

**Problem:** The brief frames `PlaybackEvent` as "optional", but the design makes the `PlaybackEvent.create` + `playCount` increment a synchronous `$transaction` that must commit before the signed URL is returned. A transient DB error therefore returns 500 and prevents playback entirely — the primary MVP feature becomes unavailable whenever the analytics write fails. The behaviour is documented, so this is a tradeoff note, not an unspecified gap.

**Fix (concrete):** Either (a) issue the signed URL first, return it, and record the play event best-effort (fire-and-forget with error logging), accepting a small under-count risk in exchange for streaming resilience; or (b) keep the synchronous count but drop it from the brief's "optional" framing — explicitly justify in the design that accurate, blocking play-counting is a deliberate MVP choice and playback may 500 on DB unavailability. Pick one and say so.

---

## Verdict

- HIGH findings: 0
- MEDIUM findings: 1 (#1 — upload/cover endpoints lack status guards)
- LOW (NIT) findings: 4 (#2–#5)

Per the gate rule (any HIGH or MEDIUM finding blocks), the verdict is **CHANGES_REQUESTED**. Resolving Finding #1 (add the missing status guards and state the cover-on-PUBLISHED policy) is sufficient to clear the gate; the NITs are non-blocking improvements.
