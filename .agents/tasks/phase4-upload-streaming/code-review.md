# Phase 4 — Upload & Streaming MVP

This phase adds the full upload-to-publish loop to Uni's Music: artists upload audio directly to Cloudflare R2 via presigned PUT URLs, a BullMQ worker extracts duration and advances the track to DRAFT, a moderator publishes it, and unauthenticated listeners stream via a 302 redirect to a signed R2 GET URL with play events recorded idempotently. The implementation builds on the NestJS/Prisma/Next.js stack and adds `bullmq`, the AWS SDK, and `music-metadata`. All builds and tests pass per the verification notes.

**Watch for:** (1) confirmed — `PATCH /:id`, `POST /:id/cover`, `POST /:id/finalize`, `POST /:id/credits`, and `POST /:id/submit` carry only `JwtAuthGuard`, not `RolesGuard(ARTIST)` — any authenticated user can call them; (2) confirmed — the upload page step 5 calls `useTrack` without a `refetchInterval`, so the "processing…" spinner never auto-advances; (3) confirmed — `FeedService` and `ArtistsService` mappers still return raw `coverImageUrl` keys rather than presigned URLs, making cover images broken for R2-backed tracks on the feed and artist profile pages.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The upload flow from `POST /tracks` through `POST /tracks/:id/finalize` is solid: the presigned PUT key is generated using a UUID-based scheme, written to the track record before the URL is returned, and `headObject` confirms file presence at finalize time with a size guard. The status machine transitions (`UPLOADING → PROCESSING → DRAFT → PENDING_REVIEW → PUBLISHED`) are enforced at both submit and publish, with the `processedAt` guard preventing unprocessed audio from reaching review.

The MIME type whitelist is enforced at the DTO layer via `@IsIn(AUDIO_MIME_TYPES)` for the `contentType` the client declares, and separately in the cover upload path. The audio presigned PUT, however, does not enforce MIME at the R2 level — the `PutObjectCommand` includes `ContentType` in the signed parameters but R2/S3 does not reject mismatched uploads — so the check is advisory only. This is an accepted MVP trade-off.

Five of the eleven artist-mutation endpoints (`PATCH`, cover, finalize, credits, submit) omit `RolesGuard(ARTIST)` at the controller layer. They are protected in practice by `assertOwnsTrack`, which throws 404 for users without an artist profile owning the track. The gap is that a LISTENER who somehow acquires a valid `trackId` and a JWT can invoke these endpoints and will receive a 404 rather than a 403, leaking the route's existence. More importantly, the missing role guard is a deviation from the stated design invariant ("Only ARTIST role can upload") and from how the codebase uses `RolesGuard` everywhere else for role-scoped endpoints.

`processAudioJob` receives injected deps, avoids raw Node `Readable` via `transformToByteArray` + `parseBuffer`, and separates transient failures (S3 missing → throw → BullMQ retries) from permanent data failures (zero duration → silent PROCESSING_FAILED, no retry). The `worker.on('failed')` handler writes `PROCESSING_FAILED` on exhaustion.

`FeedService` and `ArtistsService` both have their own inline `mapTrack` functions that pass `coverImageUrl` through as-is. Once artists start uploading covers through R2, these mappers will return R2 object keys (e.g. `covers/track-1/uuid.jpg`) rather than presigned URLs. Only `TracksService.mapTrack` calls `storageService.resolveCoverUrl`.

The upload page step 5 uses `useTrack` to show processing state, but the hook is called without a `refetchInterval` option. The query fires once when step 5 mounts and does not re-poll, so the "processing…" spinner becomes permanent if the worker takes more than a browser-tab lifetime to complete — the artist must manually refresh to see DRAFT.

---

<details>
<summary>Issues (5)</summary>

1. **Missing RolesGuard on artist mutations** — `PATCH /:id`, `POST /:id/cover`, `POST /:id/finalize`, `POST /:id/credits`, and `POST /:id/submit` use only `JwtAuthGuard`. Add `RolesGuard` and `@Roles(UserRole.ARTIST)` to each to match the design contract and prevent non-ARTISTs from reaching `assertOwnsTrack`.

2. **Stale coverImageUrl in FeedService and ArtistsService** — Both services' inline `mapTrack` return raw R2 keys for `coverImageUrl` instead of presigned URLs. Inject `StorageService` into both and call `resolveCoverUrl`, or extract the shared `TrackMapper` the design doc planned.

3. **Upload page step 5 does not poll** — `useTrack(trackId)` is called without `refetchInterval`, so the PROCESSING spinner never resolves automatically. Pass `{ refetchInterval: (data) => (data?.status === 'PROCESSING' ? 3000 : false) }` to `useQuery` inside `useTrack`, or pass it as an option at the call site.

4. **Cover upload endpoint missing role guard** — `POST /:id/cover` accepts any authenticated user. Add `@Roles(UserRole.ARTIST)` with `RolesGuard` as per items 1 above (covered in the same fix, called out explicitly because it involves a multipart file upload path that's slightly different in risk surface).

5. **Presigned PUT MIME enforcement is advisory only** — The `ContentType` in the signed PUT URL is not enforced by R2/S3 at write time; a client can upload any bytes. The `headObject` at finalize returns whatever `ContentType` R2 inferred, and that value is passed directly to the worker and stored on `MediaAsset`. Consider adding a MIME check at finalize: verify `head.contentType` is in `AUDIO_MIME_TYPES` before enqueuing. (Confidence: confirmed — the finalize path in `tracks.service.ts` does not validate `head.contentType`.)

</details>

---

<details>
<summary>Details</summary>

## Missing ARTIST role guard on mutation endpoints

`POST /tracks` and `GET /tracks/me` correctly have `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles(UserRole.ARTIST)`. The five subsequent artist-scoped mutations do not:

```
PATCH   /:id            → @UseGuards(JwtAuthGuard) only
POST    /:id/cover      → @UseGuards(JwtAuthGuard) only
POST    /:id/finalize   → @UseGuards(JwtAuthGuard) only
POST    /:id/credits    → @UseGuards(JwtAuthGuard) only
POST    /:id/submit     → @UseGuards(JwtAuthGuard) only
```

All five call `assertOwnsTrack(userId, trackId)` as first action, and `assertOwnsTrack` throws `NotFoundException` when the track doesn't exist or when `track.artistProfile.userId !== userId`. A LISTENER with no artist profile will receive a 404, not a 403. This means:

- The role boundary is enforced at the data layer (ownership), not the auth layer (role), contrary to the design spec.
- A LISTENER can probe whether any `trackId` exists via a 404 vs 409 timing distinction.
- If a LISTENER were somehow linked as the owner of a track (e.g. a data bug), they could finalize or submit it.

The fix is one decorator per endpoint: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ARTIST)`, identical to `POST /tracks`.

## Cover image resolution gap in FeedService and ArtistsService

`TracksService.mapTrack` calls `await this.storageService.resolveCoverUrl(t.coverImageUrl)`, which checks whether the value starts with `http` (legacy full URL, pass through) or is a bare R2 key (presign a 1h GET). `FeedService.mapTrack` and `ArtistsService.mapTrack` are separate inline functions that do `coverImageUrl: t.coverImageUrl ?? undefined` — no presign. Once any track gets a cover uploaded through the new flow, the feed and artist profile pages will show broken images. This is a confirmed behavioral regression for the cover display path, even though the storage code itself is correct.

The design doc called for a shared `TrackMapper` injected with `StorageService`. That refactor wasn't applied to all three mappers. The fix is either to make `FeedService` and `ArtistsService` depend on `StorageService` (which is `@Global()` so no module changes needed) and call `resolveCoverUrl`, or to implement the shared mapper.

## Upload page step 5 does not poll for processing completion

In `apps/web/src/app/artist/upload/page.tsx`, the step 5 processing state is read from:

```ts
const { data: polledTrack } = useTrack(trackId ?? '');
```

`useTrack` in `useTracks.ts` is:

```ts
export function useTrack(id: string) {
  return useQuery({
    queryKey: ['track', id],
    queryFn: () => apiFetch<TrackDto>(`/api/v1/tracks/${id}`),
    enabled: !!id,
  });
}
```

No `refetchInterval`. The query fires once and never again. `trackStatus` will be stale — whatever the track was when the page mounted (likely `UPLOADING` from step 4's finalize call), not the live `DRAFT` or `PROCESSING_FAILED` the worker eventually writes. The "processing…" spinner will remain indefinitely without a manual page reload. The hook needs `refetchInterval` conditioned on the processing statuses, or the call site in the upload page needs to pass it via a `useQuery` options override.

Note: `useTrack` also calls `GET /tracks/:id` which only returns `PUBLISHED` tracks. This is a second issue: a DRAFT track returns 404 from `getTrackById`. The upload page needs a separate "my track by id" endpoint or the existing endpoint must be adjusted for authenticated owners. (Confidence: confirmed — `getTrackById` throws `NotFoundException` when `status !== 'PUBLISHED'`.)

## Presigned PUT MIME enforcement at finalize

`createTrack` reads `dto.contentType` (validated against `AUDIO_MIME_TYPES` by class-validator), uses it to generate the object key extension, and embeds it in the presigned `PutObjectCommand` as `ContentType`. However, R2 (and S3) do not reject a PUT request whose `Content-Type` header doesn't match the signed value — the signature covers the declared content type but doesn't prevent mismatches at the storage layer. At finalize:

```ts
const head = await this.storageService.headObject(track.audioUrl);
// head.contentType comes from R2's inference, not the client's declaration
await this.prisma.$transaction([
  this.prisma.mediaAsset.create({
    data: { mimeType: head.contentType, ... }
  }),
  ...
])
await this.audioQueueService.enqueueAudioProcessing({
  mimeType: head.contentType,  // passed to worker
});
```

`head.contentType` is whatever R2 recorded, which could be `application/octet-stream` if the client submitted without a `Content-Type` header. The worker passes this `mimeType` to `parseBuffer` as a hint — `music-metadata` uses it for parser selection but falls back to content sniffing, so bad audio would likely still fail at duration validation. The practical blast radius is low, but explicitly verifying `head.contentType` is in `AUDIO_MIME_TYPES` (or at minimum starts with `audio/`) at finalize closes the gap.

## Test coverage

The processor spec covers success, zero duration, `NaN`/undefined duration, S3-missing (retry throw), and idempotency (two calls). `TracksService` spec covers `createTrack`, `finalizeUpload` (S3 missing → 409, file-too-large → 400, success → PROCESSING), `assertOwnsTrack` (wrong owner → 403, missing → 404), `submitTrack` status guards, `publishTrack` status guards, `recordPlay` idempotency, and `likeTrack`/`unlikeTrack`. `StorageService` spec covers key generation, `resolveCoverUrl` (null, http pass-through, R2 key presign), and `headObject` (NotFound → null, success).

Not tested: `streamTrack` (the 302 redirect path — covers the PUBLISHED check and the missing-audioUrl 500 path); `getMyTracks`; the `PATCH /:id` status guard (`PROCESSING` or `PUBLISHED` → 409); `uploadCover` (MIME/size rejection). These are missing rather than blocking, but the stream path is worth covering given it's the primary user-facing feature.

</details>

---

<details>
<summary>Files changed</summary>

| File | What changed |
|---|---|
| `packages/database/prisma/schema.prisma` | Added `processingError`, `processedAt` to `Track`; added `PlaybackEvent` model with `@@index([trackId, createdAt])` |
| `packages/contracts/src/index.ts` | Extended `TrackDto`; added `UploadInitResponseDto`, `UploadFinalizeResponseDto`, `PlayResponseDto`, `CoverUploadResponseDto`, `AddCreditDto` |
| `apps/api/src/config/env.validation.ts` | Added S3/R2 Joi rules (production-required, dev-defaulted) |
| `apps/api/src/storage/storage.service.ts` | New `@Global()` service: presigned PUT/GET, headObject, putObject, resolveCoverUrl |
| `apps/api/src/storage/storage.service.spec.ts` | 8 unit tests for StorageService |
| `apps/api/src/queue/queue.constants.ts` + `queue.module.ts` + `audio-queue.service.ts` | Raw BullMQ Queue producer |
| `apps/api/src/tracks/dto/*.ts` | New DTOs: create, update, finalize, record-play, add-credit, reject |
| `apps/api/src/tracks/tracks.service.ts` | Full Phase 4 extension: createTrack, uploadCover, finalizeUpload, updateTrack, addCredit, submitTrack, publishTrack, rejectTrack, getMyTracks, streamTrack, recordPlay |
| `apps/api/src/tracks/tracks.controller.ts` | 16 endpoints in static-before-dynamic order |
| `apps/api/src/tracks/tracks.service.spec.ts` | Extended with 20+ Phase 4 test cases |
| `apps/api/src/artists/artists.service.ts` | Fix A: `apply()` wrapped in `$transaction` |
| `apps/api/src/artists/artists.service.spec.ts` | New spec asserting `$transaction` usage |
| `apps/api/src/feed/feed.service.ts` | Fix C: `getTrending` merge + dedupe |
| `apps/api/src/feed/feed.service.spec.ts` | New spec for `getTrending` merge |
| `apps/api/src/auth/guards/optional-jwt.guard.ts` | New guard for optional-auth play endpoint |
| `apps/api/src/app.module.ts` | Added `StorageModule`, `QueueModule` imports |
| `apps/worker/src/storage.ts` | Minimal S3 helper (headObject + getObjectBuffer via `transformToByteArray`) |
| `apps/worker/src/workers/audio-processing.processor.ts` | Pure `processAudioJob` with injected deps |
| `apps/worker/src/workers/audio-processing.worker.ts` | Wires real worker with `worker.on('failed')` handler |
| `apps/worker/src/workers/audio-processing.processor.spec.ts` | 5 unit tests (no Redis/R2/ffmpeg) |
| `apps/web/src/lib/upload.ts` | XHR `uploadToR2` helper with progress callback |
| `apps/web/src/lib/hooks/useTracks.ts` | Phase 4 hooks: useMyTracks, useInitUpload, useFinalizeUpload, useUpdateTrack, useUploadCover, useAddCredit, useSubmitTrack, usePublishTrack, useRecordPlay |
| `apps/web/src/providers/PlayerProvider.tsx` | New: single `<audio>` ref, play/toggle/seek/setVolume, fire-and-forget recordPlay on first play |
| `apps/web/src/components/music/Player.tsx` | New: accessible bottom player bar |
| `apps/web/src/app/layout.tsx` | Wrapped with `PlayerProvider` + `Player` |
| `apps/web/src/app/tracks/[id]/page.tsx` | New track detail page |
| `apps/web/src/app/artist/upload/page.tsx` | Replaced static stub with real 5-step upload flow |
| `apps/web/src/app/artist/dashboard/page.tsx` | New artist dashboard |
| `apps/web/tsconfig.json` + `apps/api/tsconfig.json` | Removed invalid `ignoreDeprecations: "6.0"` |

</details>
