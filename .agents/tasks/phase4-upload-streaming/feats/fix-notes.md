# Phase 4 Code-Review Fix Notes

Applies the 5 findings from `review.json` (verdict `CHANGES_REQUESTED`) on top of
the committed Phase 4 implementation (`ad97690 feat: Phase 4 upload & streaming MVP`).

The fixes below were applied as fix-up edits in the working tree on top of `ad97690`.
Per the task brief, the changes are **not committed**.

> Note: a prior pass had already staged these edits in the working tree before this
> verification pass. This pass verified each fix against the review findings, ran the
> full verification suite, and confirmed all commands pass clean.

---

## Finding 1 — Missing RolesGuard on artist mutations

**Files:** `apps/api/src/tracks/tracks.controller.ts`

The five artist-scoped mutation endpoints used only `@UseGuards(JwtAuthGuard)`,
relying on `assertOwnsTrack` (which 404s) to gate access. Each now carries
`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ARTIST)`, matching
`POST /tracks` and `GET /tracks/me`. `RolesGuard` + `@Roles` + `UserRole` were
already imported/used elsewhere in the controller, so no new imports were added.

Endpoints changed (`JwtAuthGuard` -> `JwtAuthGuard, RolesGuard` + `@Roles(UserRole.ARTIST)`):

- `PATCH   /:id`        — `updateTrack`
- `POST    /:id/cover`  — `uploadCover`
- `POST    /:id/finalize` — `finalizeUpload`
- `POST    /:id/credits` — `addCredit`
- `POST    /:id/submit`  — `submitTrack`

The auth-layer boundary now enforces the ARTIST role before the ownership check, so
non-ARTISTs receive 403 (not a 404 that leaks route existence) and never reach
`assertOwnsTrack`.

## Finding 2 — Stale coverImageUrl in FeedService and ArtistsService

**Files:** `apps/api/src/feed/feed.service.ts`, `apps/api/src/feed/feed.module.ts`,
`apps/api/src/artists/artists.service.ts`, `apps/api/src/artists/artists.module.ts`

Both services' inline `mapTrack` returned the raw R2 object key stored in
`Track.coverImageUrl` (`coverImageUrl: t.coverImageUrl ?? undefined`) instead of a
presigned URL. The fix injects `StorageService` into both services and calls
`this.storageService.resolveCoverUrl(t.coverImageUrl)` — the same method
`TracksService.mapTrack` uses. `resolveCoverUrl` passes through `http`-prefixed
values (legacy full URLs) unchanged and presigns a 1h GET for bare R2 keys.

`Track.coverImageUrl` storage is unchanged (still stores the key); only the DTO
mapping output is fixed. Because `mapTrack` is now `async`, every caller was
updated from `.map(mapTrack)` to `Promise.all(... .map((t) => this.mapTrack(t)))`.

The two consuming modules explicitly `imports: [StorageModule]` (StorageModule is
also `@Global()`, so the explicit import is belt-and-suspenders, not required).

## Finding 3 — Upload page step 5 does not poll

**Files:** `apps/api/src/tracks/tracks.controller.ts`, `apps/api/src/tracks/tracks.service.ts`,
`apps/web/src/lib/hooks/useTracks.ts`, `apps/web/src/app/artist/upload/page.tsx`

Two intertwined problems: (a) `useTrack(trackId)` had no `refetchInterval`, so the
processing spinner never advanced; (b) `useTrack` calls `GET /tracks/:id`, which
only returns `PUBLISHED` tracks, so a `DRAFT`/`UPLOADING` track 404s when polled.

The design doc planned an owner-scoped GET, which is the approach taken here:

- API: new `GET /api/v1/tracks/me/:id` endpoint (declared before `GET /:id` so the
  static `me/:id` route wins). Guarded with `JwtAuthGuard + RolesGuard` and
  `@Roles(UserRole.ARTIST, UserRole.MODERATOR, UserRole.ADMIN)`.
- Service: `getMyTrackById(userId, trackId)` loads the track with `artistProfile
  { select: { stageName, userId } }` + `credits`, throws `NotFoundException` if
  missing, throws `ForbiddenException('Not your track')` if
  `track.artistProfile.userId !== userId`, then maps via the shared `mapTrack`.
  Returns the track in **any** status with `status`, `durationSeconds`, and
  `processingError` exposed (TrackDto already carries these additive optional fields).
- Web: new `useMyTrackById(id, refetchInterval)` hook (`useQuery<TrackDto>` against
  `/api/v1/tracks/me/${id}`, `enabled: !!id`, `refetchInterval: refetchInterval ?? false`).
- Upload page step 5 (index 4) now calls
  `useMyTrackById(trackId ?? '', step === 4 ? 3000 : false)` — polls every ~2-3s only
  while on the publish step, and stops once the user navigates away or the track
  leaves the processing states. The spinner resolves automatically:
  `isProcessing` (UPLOADING/PROCESSING) shows the spinner; `isDraft` reveals the
  "Submit for Review" button; `isProcessingFailed` (PROCESSING_FAILED) shows
  `polledTrack.processingError` with a "Re-upload Audio" CTA.

The old `useTrack` hook is left in place for the public track-detail page
(`GET /tracks/:id`), where PUBLISHED-only is the intended behavior.

## Finding 4 — Cover upload endpoint missing role guard

**Files:** `apps/api/src/tracks/tracks.controller.ts`

This is the same endpoint as finding 1's `POST /:id/cover`. Confirmed applied: the
multipart cover upload handler now has `@UseGuards(JwtAuthGuard, RolesGuard)` +
`@Roles(UserRole.ARTIST)` (covered by the finding 1 fix). No separate change needed.

## Finding 5 — Presigned PUT MIME enforcement is advisory only

**Files:** `apps/api/src/tracks/tracks.service.ts`

The signed PUT URL embeds `ContentType`, but R2/S3 do not reject a mismatched
upload, so the declared MIME was advisory only. At `finalizeUpload`, after
`headObject` returns `head` and the size guard, the response MIME is now validated
before the `MediaAsset` insert or the audio-processing job enqueue:

```ts
const normalizedMime = head.contentType.split(';')[0]?.trim() ?? '';
if (!AUDIO_MIME_TYPES.includes(normalizedMime) && !normalizedMime.startsWith('audio/')) {
  throw new BadRequestException(`Invalid audio MIME type: ${head.contentType}`);
}
```

This rejects non-audio types (e.g. `application/octet-stream` when the client omits
`Content-Type`) with a 400, using the same `AUDIO_MIME_TYPES` constant used in the
DTO allowlist and the `createTrack` presign path (`AUDIO_MIME_TYPES` was added to
the import line). The check sits before the `$transaction` and the
`enqueueAudioProcessing` call, so a bad MIME never creates a `MediaAsset` row or
enqueues a job. This matches the code-review doc's accepted minimum
("verify `head.contentType` is in `AUDIO_MIME_TYPES` (or at minimum starts with
`audio/`)"). `Track.coverImageUrl` / `audioUrl` storage and all existing contracts
are unchanged.

---

## Verification (run from workspace root, PowerShell)

All commands run single-pass (no watch mode). Output is the actual exit code.

```
cd 'apps\api'; pnpm run build
$ tsc -p tsconfig.json
Exit Code: 0          # API build — clean

cd 'apps\api'; pnpm test
$ vitest run
 Test Files  6 passed (6)
      Tests  70 passed (70)
Exit Code: 0          # API tests — all green
# files: storage(8) artists(4) search(7) auth(13) feed(7) tracks(31)

cd 'apps\web'; pnpm run typecheck
$ tsc --noEmit
Exit Code: 0          # Web typecheck — clean

pnpm -r typecheck
packages/database   tsc --noEmit  Done
apps/api            tsc --noEmit  Done
apps/web            tsc --noEmit  Done
apps/worker         tsc --noEmit  Done
packages/contracts  tsc --noEmit  Done
packages/test-utils tsc --noEmit  Done
packages/ui         tsc --noEmit  Done
Exit Code: 0          # Recursive typecheck — all 7 packages clean
```

No test needed updating for the new `RolesGuard`: the existing suites test the
service layer directly (mock `PrismaService` / `StorageService` / `AudioQueueService`),
not the controller guard chain, so the role guard did not break any test. No tests
were weakened.

---

## Files changed (working tree, uncommitted)

| File | Finding | Change |
|---|---|---|
| `apps/api/src/tracks/tracks.controller.ts` | 1, 4, 3 | Added `RolesGuard` + `@Roles(UserRole.ARTIST)` to PATCH/cover/finalize/credits/submit; new `GET me/:id` owner-scoped endpoint |
| `apps/api/src/tracks/tracks.service.ts` | 3, 5 | New `getMyTrackById` (ownership-checked, any status); MIME validation in `finalizeUpload` (imports `AUDIO_MIME_TYPES`) |
| `apps/api/src/feed/feed.service.ts` | 2 | Inject `StorageService`; `mapTrack` resolves cover via `resolveCoverUrl`; callers use `Promise.all` |
| `apps/api/src/feed/feed.module.ts` | 2 | `imports: [StorageModule]` |
| `apps/api/src/feed/feed.service.spec.ts` | 2 | Mock `StorageService` in `makeService` |
| `apps/api/src/artists/artists.service.ts` | 2 | Inject `StorageService`; `mapTrack` resolves cover via `resolveCoverUrl`; callers use `Promise.all` |
| `apps/api/src/artists/artists.module.ts` | 2 | `imports: [StorageModule]` |
| `apps/api/src/artists/artists.service.spec.ts` | 2 | Mock `StorageService` in `makeService` |
| `apps/web/src/lib/hooks/useTracks.ts` | 3 | New `useMyTrackById(id, refetchInterval)` owner-scoped polling hook |
| `apps/web/src/app/artist/upload/page.tsx` | 3 | Step 5 polls via `useMyTrackById(trackId, step===4 ? 3000 : false)`; resolves to DRAFT/PROCESSING_FAILED |

No new dependencies introduced. No DB columns renamed. No existing contracts broken.
TypeScript strict, no `any` casts added. Not committed (per brief).
