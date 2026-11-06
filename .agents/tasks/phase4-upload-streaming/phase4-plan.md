# Phase 4 Implementation Plan — Upload & Streaming MVP

**Workspace root:** `c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC`  
**API:** `apps/api` (NestJS 10, Vitest, pnpm)  
**Web:** `apps/web` (Next.js 14, React 18, Tailwind CSS, pnpm)  
**DB package:** `packages/database` (Prisma 5, Neon PostgreSQL)  
**Contracts:** `packages/contracts`  
**Worker:** `apps/worker` (BullMQ raw, ts-node)

All paths are relative to the workspace root unless stated otherwise.

---

## SECTION 1 — Prisma Schema Diffs

### What already exists — DO NOT re-add

The following are confirmed present in `packages/database/prisma/schema.prisma` at plan time:

- `Track` model with: `id`, `artistProfileId`, `title`, `slug` (`@unique`), `description`, `status` (`TrackStatus`), `genreId`, `durationSeconds`, `explicit`, `releaseDate`, `playCount` (BigInt), `likeCount`, `coverImageUrl`, `audioUrl`, `uploadedById`/`uploadedBy`, `createdAt`, `updatedAt`, `mediaAssets`, `likes`, `playlistTracks`, `credits`.
- `TrackStatus` enum with: `DRAFT`, `UPLOADING`, `PROCESSING`, `PROCESSING_FAILED`, `PENDING_REVIEW`, `REJECTED`, `SCHEDULED`, `PUBLISHED`, `TAKEN_DOWN`, `ARCHIVED`.
- `MediaAsset` model with: `id`, `trackId`, `assetType`, `storageKey`, `mimeType`, `fileSizeBytes`, `checksum`, `createdAt`.
- `TrackCredit` model with all columns including `userId?`.
- `Follow` model using `followerId` / `followingArtistId` (relation to `ArtistProfile` via `ArtistProfile.followers @relation("ArtistFollowers")`).
- `User.trackCredits TrackCredit[] @relation("TrackCredits")`, `User.follows Follow[] @relation("FollowFollower")`.
- All Phase 3 models: `ArtistProfile`, `Genre`, `Playlist`, `PlaylistTrack`, `Like`, `AuditLog`, etc.

### Fields to ADD to `Track`

```prisma
processingError  String?
processedAt      DateTime? @db.Timestamptz()
```

Add the `playbackEvents` back-relation after the `credits` line:

```prisma
playbackEvents   PlaybackEvent[]
```

### New model `PlaybackEvent`

Insert after the `TrackCredit` model block:

```prisma
model PlaybackEvent {
  id           String   @id @default(uuid())
  trackId      String
  userId       String?
  clientPlayId String   @unique
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now()) @db.Timestamptz()

  track        Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([trackId, createdAt])
}
```

### Fields to ADD to `User`

Add one line after the existing `trackCredits` relation:

```prisma
playbackEvents   PlaybackEvent[]
```

### Migration command

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database'
npx prisma migrate dev --name phase4-upload-streaming
npx prisma generate
```

---

## SECTION 2 — API Modules Build Order

Build order: **env.validation → deps → StorageModule → QueueModule → TracksModule extensions → Cleanup fixes → AppModule wiring**

All modules follow the established NestJS pattern: constructor-inject `PrismaService`, `@UseGuards(JwtAuthGuard)` on writes, `class-validator` DTOs with `whitelist: true` (already global), `@ApiTags` + `@ApiOperation` on every controller/endpoint.

---

### 2.1 Install API Dependencies

**File to update:** `apps/api/package.json` (via pnpm, record exact installed versions)

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api'
pnpm add --save-exact bullmq @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

`bullmq` is already a dependency of `apps/worker` (v5.8.1). The API must use the same major version to ensure queue compatibility. `ioredis` is already present in the workspace (both `apps/worker` and `apps/api` can share the lock file version).

---

### 2.2 `env.validation.ts` — add S3 Joi rules

**File to update:** `apps/api/src/config/env.validation.ts`

Append the following keys to the existing `Joi.object({...})` before the closing `})`:

```typescript
S3_ENDPOINT: Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.allow('').default(''),
}),
S3_REGION: Joi.string().default('auto'),
S3_BUCKET: Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.allow('').default(''),
}),
S3_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.allow('').default(''),
}),
S3_SECRET_ACCESS_KEY: Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.allow('').default(''),
}),
MEDIA_PUBLIC_BASE_URL: Joi.string().uri().allow('').default(''),
```

The existing `validationOptions: { allowUnknown: true, abortEarly: false }` in `AppModule` means adding keys is safe and non-breaking.

---

### 2.3 StorageModule

**Files to create:**

```
apps/api/src/storage/
  storage.module.ts
  storage.service.ts
```

**`storage.module.ts`:** `@Global()` module, provides and exports `StorageService`.

**`storage.service.ts`:** `implements OnModuleInit`. The `S3Client` is created in `onModuleInit()` (NOT in the constructor), so the API boots without R2 credentials in dev and fails only on first method call if S3 is misconfigured.

Shape:

```typescript
@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? '';

  onModuleInit() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION ?? 'auto',
      forcePathStyle: true,   // required for R2 and MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  // Presign a PUT for direct browser upload (audio / cover)
  async createPresignedPut(key: string, contentType: string, expiresInSec = 600): Promise<{ url: string; key: string }>

  // Presign a GET for streaming / cover reads  
  async createPresignedGet(key: string, expiresInSec: number): Promise<string>

  // HEAD to verify an object exists after a browser PUT
  async headObject(key: string): Promise<{ size: number; contentType: string; etag: string } | null>

  // Server-proxy upload (cover art multipart)
  async putObject(key: string, body: Buffer, contentType: string): Promise<void>

  // Worker / internal: get object as Node Readable for streaming
  async getObjectStream(key: string): Promise<Readable>

  // Key-generation helpers (private, called by service methods and TracksService)
  generateAudioKey(trackId: string, ext: string): string   // audio/{trackId}/{uuid}.{ext}
  generateCoverKey(trackId: string, ext: string): string   // covers/{trackId}/{uuid}.{ext}

  // Resolve a coverImageUrl field: if it starts with 'http', return as-is; else presign a 1h GET
  async resolveCoverUrl(value: string | null | undefined): Promise<string | undefined>
}
```

**MIME whitelist** (exported constant, used by DTOs and TracksService):

```typescript
export const AUDIO_MIME_TYPES = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/flac','audio/aac','audio/mp4','audio/x-m4a','audio/m4a'];
export const COVER_MIME_TYPES = ['image/jpeg','image/png','image/webp'];
```

**Size limits** (exported constants, checked at controller level via validation pipe + DTO):

- Audio: `AUDIO_MAX_BYTES = 150 * 1024 * 1024` (150 MB). Checked at finalize via `headObject`.
- Cover: `COVER_MAX_BYTES = 10 * 1024 * 1024` (10 MB). Checked in the cover upload handler before `putObject`.

---

### 2.4 QueueModule

**Files to create:**

```
apps/api/src/queue/
  queue.module.ts
  queue.constants.ts
  audio-queue.service.ts
```

**`queue.constants.ts`:**

```typescript
export const AUDIO_QUEUE = 'audio-processing';  // matches apps/worker queue name
export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export interface AudioProcessingJobData {
  trackId: string;
  storageKey: string;
  mimeType: string;
}
```

**`queue.module.ts`:** `@Global()`. Creates a single `IORedis` connection (`{ maxRetriesPerRequest: null }` — required by BullMQ) from `process.env.REDIS_URL` and provides it as `REDIS_CONNECTION`. Provides and exports `AudioQueueService`.

**`audio-queue.service.ts`:** Injects `REDIS_CONNECTION`, creates one `new Queue(AUDIO_QUEUE, { connection })` in `onModuleInit()`. Exposes:

```typescript
async enqueueAudioProcessing(data: AudioProcessingJobData): Promise<void>
```

Options passed to `queue.add('process', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 })`.

---

### 2.5 TracksModule extensions — DTOs

**Files to create in `apps/api/src/tracks/dto/`:**

- `create-track.dto.ts` — `CreateTrackDto { @IsString() @MinLength(1) @MaxLength(120) title: string; @IsOptional() @IsUUID() genreId?: string; @IsOptional() @IsString() @MaxLength(2000) description?: string; @IsOptional() @IsBoolean() explicit?: boolean; @IsOptional() @IsDateString() releaseDate?: string; @IsOptional() @IsEnum(AUDIO_MIME_TYPES) contentType?: string; }`. The `contentType` field is used to generate the presigned PUT for the correct MIME.
- `update-track.dto.ts` — `PartialType(CreateTrackDto)` minus `contentType` (not updatable). Title optional when partial.
- `finalize-upload.dto.ts` — empty `FinalizeUploadDto {}` with Swagger `@ApiProperty` decorator for clarity.
- `record-play.dto.ts` — `RecordPlayDto { @IsUUID() clientPlayId: string; }`.
- `add-credit.dto.ts` — `AddCreditDto { @IsString() @MinLength(1) @MaxLength(120) name: string; @IsString() @MinLength(1) @MaxLength(80) role: string; @IsOptional() @IsUUID() userId?: string; }`.
- `reject-track.dto.ts` — `RejectTrackDto { @IsOptional() @IsString() @MaxLength(500) reason?: string; }`.

**File to update:** `apps/api/src/tracks/dto/tracks-query.dto.ts` — if it doesn't have `artistProfileId` filter, add `@IsOptional() @IsString() artistProfileId?: string;` for the `/me` endpoint.

---

### 2.6 TracksService — full extension

**File to update:** `apps/api/src/tracks/tracks.service.ts`

Inject `StorageService` and `AudioQueueService` in the constructor. Extend `TRACK_SELECT` to include `processingError`, `processedAt`, `audioUrl` (needed internally, still omitted from public `mapTrack`). Add a shared `TrackMapper` that calls `storageService.resolveCoverUrl()` for every track's `coverImageUrl`, and appends `processingError?`, `streamUrl?` (set to `/api/v1/tracks/:id/stream` when `status === 'PUBLISHED'`) to the response shape.

**New methods to add (do not remove existing methods):**

#### `createTrack(userId, dto: CreateTrackDto)`

1. Verify `artistProfile` for `userId` — `findUnique({ where: { userId } })`. If null → `NotFoundException('Artist profile not found')`.
2. If `dto.genreId` provided, verify genre exists → `NotFoundException('Genre not found')` if absent.
3. Generate slug: `slugify(dto.title) + '-' + nanoid(6)` (use `@sindresorhus/slugify` or simple `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')` + `crypto.randomUUID().slice(0,6)`).
4. Determine `ext` from `dto.contentType` (e.g. `audio/mpeg` → `mp3`).
5. Create `Track` with `status: 'UPLOADING'`, `artistProfileId: profile.id`, `uploadedById: userId`, `slug`, all dto fields.
6. Generate presigned PUT: `storageService.createPresignedPut(storageService.generateAudioKey(track.id, ext), dto.contentType ?? 'audio/mpeg', 600)`.
7. Return `{ trackId: track.id, uploadUrl, storageKey: key, expiresAt: new Date(Date.now() + 600_000).toISOString() }`.

#### `uploadCover(userId, trackId, file: Express.Multer.File)`

1. `assertOwnsTrack(userId, trackId)` — see ownership invariant below.
2. Validate `file.mimetype` against `COVER_MIME_TYPES` → `BadRequestException` if invalid.
3. Validate `file.size <= COVER_MAX_BYTES` → `BadRequestException` if too large.
4. Derive ext from `file.mimetype`.
5. `storageService.putObject(key, file.buffer, file.mimetype)`.
6. Create `MediaAsset({ trackId, assetType: 'COVER', storageKey: key, mimeType: file.mimetype, fileSizeBytes: BigInt(file.size), checksum: '' })`.
7. Update `Track.coverImageUrl = key`.
8. Return `{ coverImageUrl: await storageService.resolveCoverUrl(key) }`.

#### `finalizeUpload(userId, trackId)`

1. Load track with `select: { status, audioUrl, artistProfile: { select: { userId } } }`.
2. `assertOwnsTrack` checks (use loaded data).
3. If `status !== 'UPLOADING'` → `ConflictException('Track is not in UPLOADING state')`.
4. Load the presigned key from `track.audioUrl` if already set, OR: the key was set during `createTrack` and stored in `audioUrl` immediately (store it as part of step 6 in `createTrack` so `audioUrl` holds the key before finalize). This way `finalizeUpload` reads `track.audioUrl` directly.
5. `head = await storageService.headObject(track.audioUrl!)`. If `head === null` → `ConflictException('Upload not completed — file not found in storage')`.
6. If `head.size > AUDIO_MAX_BYTES` → `BadRequestException('Audio file exceeds 150 MB limit')`.
7. `$transaction`: upsert `MediaAsset({ trackId, assetType: 'AUDIO', storageKey: audioUrl, mimeType: head.contentType, fileSizeBytes: BigInt(head.size), checksum: head.etag })`, update `Track { status: 'PROCESSING', processingError: null }`.
8. `audioQueueService.enqueueAudioProcessing({ trackId, storageKey: track.audioUrl!, mimeType: head.contentType })`.
9. Return `{ trackId, status: 'PROCESSING' }`.

> Note: `track.audioUrl` is set in `createTrack` at step 5 (include `audioUrl: key` in the `create` data). This ensures the key is persisted before the presigned PUT is returned to the client.

#### `updateTrack(userId, trackId, dto: UpdateTrackDto)`

1. Load track. `assertOwnsTrack`.
2. If `status` not in `['DRAFT', 'PENDING_REVIEW']` → `ConflictException('Track cannot be edited in current status')`.
3. If `dto.genreId` provided, verify genre exists.
4. `prisma.track.update({ where: { id: trackId }, data: dto })`.

#### `addCredit(userId, trackId, dto: AddCreditDto)`

1. Load track. `assertOwnsTrack`.
2. If `status` not in `['DRAFT', 'PENDING_REVIEW']` → `ConflictException`.
3. If `dto.userId` provided, verify user exists → `NotFoundException` if absent.
4. `prisma.trackCredit.create({ data: { trackId, ...dto } })`.

#### `submitTrack(userId, trackId)`

1. Load track. `assertOwnsTrack`.
2. If `status !== 'DRAFT'` → `ConflictException('Cannot submit from current status')`.
3. Guard: if `processedAt === null || !durationSeconds` → `ConflictException('Track not ready: audio not processed')`.
4. `prisma.track.update({ status: 'PENDING_REVIEW' })`.

#### `publishTrack(trackId)` — moderator/admin only (no ownership check, role enforced at controller)

1. Load track.
2. If `status !== 'PENDING_REVIEW'` → `ConflictException`.
3. Guard: `processedAt === null` → `ConflictException('Cannot publish unprocessed track')`.
4. `prisma.track.update({ status: 'PUBLISHED', releaseDate: releaseDate ?? new Date() })`.

#### `rejectTrack(trackId, dto: RejectTrackDto)` — moderator/admin only

1. Load track.
2. If `status !== 'PENDING_REVIEW'` → `ConflictException`.
3. `prisma.track.update({ status: 'REJECTED', processingError: dto.reason ?? null })`.

#### `getMyTracks(userId, cursor?, limit = 20)`

1. Find `artistProfile` by `userId`.
2. Cursor-paginate `prisma.track.findMany({ where: { artistProfileId: profile.id }, take: limit + 1, select: TRACK_SELECT_FULL })`.
3. Return `{ items, nextCursor }`. All statuses included.

#### `streamTrack(trackId)` — returns a redirect URL, no auth

1. Load `Track` with `select: { status, audioUrl }`.
2. If not found or `status !== 'PUBLISHED'` → `NotFoundException`.
3. If `!audioUrl` → `InternalServerErrorException('Audio key missing for published track')` (log error).
4. `url = await storageService.createPresignedGet(audioUrl, 3600)`.
5. Return `{ url }`. Controller issues `302` via `@Redirect()` or `res.redirect(302, url)`.

#### `recordPlay(userId: string | null, trackId: string, dto: RecordPlayDto, req: Request)`

1. Load `Track` with `select: { id, status, playCount }`. If not found or `status !== 'PUBLISHED'` → `NotFoundException`.
2. Try:
   ```typescript
   await prisma.$transaction([
     prisma.playbackEvent.create({ data: { trackId, userId, clientPlayId: dto.clientPlayId, ipAddress: ..., userAgent: ... } }),
     prisma.track.update({ where: { id: trackId }, data: { playCount: { increment: 1 } } }),
   ]);
   return { played: true, playCount: Number(track.playCount) + 1 };
   ```
3. Catch Prisma `P2002` (unique constraint on `clientPlayId`): return `{ played: false, playCount: Number(track.playCount) }`. Do NOT throw — idempotent.
4. The entire `recordPlay` call is **fire-and-forget** at the controller level: the controller `await`s the signed URL (from `/stream`, separate endpoint) but records play with `.catch(() => {})` — see §2.7.

#### Ownership invariant helper — `assertOwnsTrack(userId, trackId)`

```typescript
private async assertOwnsTrack(userId: string, trackId: string) {
  const t = await this.prisma.track.findUnique({
    where: { id: trackId },
    select: { artistProfile: { select: { userId: true } } },
  });
  if (!t) throw new NotFoundException('Track not found');
  if (t.artistProfile.userId !== userId) throw new ForbiddenException('Not your track');
}
```

**Phase 3 cleanup integrated here:**

- `getPublishedTracks`: when `query.genre` is provided and `genre` lookup returns `null` → throw `NotFoundException('Genre not found')`.

---

### 2.7 TracksController — new endpoints

**File to update:** `apps/api/src/tracks/tracks.controller.ts`

Add `Body`, `Post`, `Patch`, `Redirect`, `Req`, `UploadedFile`, `UseInterceptors` to NestJS imports. Add `FileInterceptor` from `@nestjs/platform-express` (already available). Inject `RolesGuard` and `@Roles()` decorator (already exist in codebase). Add `@Optional() @UseGuards(JwtAuthGuard)` decorator for the optional-auth `play` endpoint.

> **Static routes must come before dynamic routes.** Declare routes in this order inside the controller class:

```
1.  GET    /api/v1/tracks          (existing — keep)
2.  GET    /api/v1/tracks/me       (NEW — before :id)
3.  POST   /api/v1/tracks          (NEW — create + init upload)
4.  GET    /api/v1/tracks/:id      (existing — keep; handles public track fetch by id/slug)
5.  PATCH  /api/v1/tracks/:id      (NEW — update metadata)
6.  POST   /api/v1/tracks/:id/cover     (NEW — multipart cover upload)
7.  POST   /api/v1/tracks/:id/finalize  (NEW — finalize after S3 PUT)
8.  POST   /api/v1/tracks/:id/credits   (NEW — add credit)
9.  POST   /api/v1/tracks/:id/submit    (NEW — artist submits for review)
10. POST   /api/v1/tracks/:id/publish   (NEW — moderator/admin publishes)
11. POST   /api/v1/tracks/:id/reject    (NEW — moderator/admin rejects)
12. GET    /api/v1/tracks/:id/stream    (NEW — 302 redirect to presigned audio URL)
13. POST   /api/v1/tracks/:id/play      (NEW — record play event, optional JWT)
14. POST   /api/v1/tracks/:id/like      (existing — keep)
15. DELETE /api/v1/tracks/:id/like      (existing — keep)
16. GET    /api/v1/tracks/:id/liked     (existing — keep)
```

**Key implementation notes:**

- `GET /me` — `@UseGuards(JwtAuthGuard)`, `@Roles(UserRole.ARTIST)`.
- `POST /` — `@UseGuards(JwtAuthGuard)`, `@Roles(UserRole.ARTIST)`. Returns `201` with `UploadInitResponseDto`.
- `POST /:id/cover` — `@UseInterceptors(FileInterceptor('file'))`. `@UploadedFile() file: Express.Multer.File`. `@UseGuards(JwtAuthGuard)`.
- `POST /:id/finalize` — `@UseGuards(JwtAuthGuard)`. Returns `200`.
- `PATCH /:id` — `@UseGuards(JwtAuthGuard)`. No role guard (service enforces ownership).
- `POST /:id/submit` — `@UseGuards(JwtAuthGuard)`.
- `POST /:id/publish` — `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(UserRole.MODERATOR, UserRole.ADMIN)`.
- `POST /:id/reject` — same as publish guards.
- `GET /:id/stream` — no guard. Controller calls `tracksService.streamTrack(id)`, then `@Res()` `res.redirect(302, result.url)` OR uses `@Redirect()` dynamically. Use `@HttpCode(HttpStatus.FOUND)`.
- `POST /:id/play` — optional JWT. Pattern: use `@UseGuards(JwtAuthGuard)` with `@Public()` alternative not available, so use `try/catch` on `@CurrentUser()` or use a custom `OptionalJwt` guard (check if one exists; if not, implement a minimal one that sets `req.user` if token present, otherwise passes). The controller calls `tracksService.recordPlay(user?.sub ?? null, ...)` and returns `PlayResponseDto`. **The DB write inside `recordPlay` must not block the response**: the controller fires it with `recordPlay(...).catch(err => logger.warn('Play event failed', err))` and returns `{ played: true, playCount: track.playCount }` immediately from a fast-path read, OR the service method itself does the fire-and-forget (design choice: service does it to keep the controller thin — `recordPlay` returns the play response after a non-blocking enqueue of the DB write).

> Simplest approach for `recordPlay` non-blocking: the service method `void`s the transaction and returns an optimistic count, then logs any error. The unique constraint prevents double-counting; optimistic count is acceptable for MVP.

---

### 2.8 TracksModule — wire new injectables

**File to update:** `apps/api/src/tracks/tracks.module.ts`

Import and add `StorageModule` and `QueueModule` (both `@Global`, so direct imports in TracksModule are optional but explicit is clearer). Ensure `TracksService` is injectable with the new deps.

---

### 2.9 Phase 3 Cleanup Fixes

**Fix A — `ArtistsService.apply()` atomicity** (HIGH)

**File to update:** `apps/api/src/artists/artists.service.ts`

Replace the two separate awaits in `apply()`:
```typescript
// BEFORE (non-atomic):
const profile = await this.prisma.artistProfile.create({ ... });
await this.prisma.user.update({ ... });

// AFTER (one $transaction):
const [profile] = await this.prisma.$transaction([
  this.prisma.artistProfile.create({
    data: { userId, stageName: dto.stageName, bio: dto.bio, verificationStatus: 'PENDING' },
  }),
  this.prisma.user.update({
    where: { id: userId },
    data: { role: 'ARTIST' },
  }),
]);
return profile;
```

**File to update:** `apps/api/src/artists/artists.service.spec.ts` — update the `apply()` test to assert `$transaction` is called once and receives both operations.

**Fix B — Genre filter silent on unknown slug**

**File to update:** `apps/api/src/tracks/tracks.service.ts` — in `getPublishedTracks`:

```typescript
if (query.genre) {
  const genre = await this.prisma.genre.findUnique({ where: { slug: query.genre } });
  if (!genre) throw new NotFoundException('Genre not found');   // ADD THIS LINE
  where.genreId = genre.id;
}
```

**Fix C — `getTrending` discards recent results**

**File to update:** `apps/api/src/feed/feed.service.ts` — in `getTrending`:

```typescript
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

Also note: `getFeed` uses `followingArtistId` for the follow relation. Confirm field name matches schema (`Follow.followingArtistId` — confirmed in schema). If the current code references a different field name, update it to `followingArtistId`.

**Fix D — Add `feed.service.spec.ts`**

**File to create:** `apps/api/src/feed/feed.service.spec.ts`

Follow the `buildPrisma` / `makeService` pattern from `tracks.service.spec.ts`. Test cases:
- `getFeed`: trending and newReleases fetched, `byGenre` mapped, `fromFollowing` only when `userId` passed and follows exist.
- `getTrending` (sufficient recent): returns recent tracks only.
- `getTrending` (insufficient recent → merged): recent tracks come first, fillers appended, no duplicate ids.
- `getNewReleases`: calls `findMany` with `status: 'PUBLISHED'`, ordered by `releaseDate desc`.

---

### 2.10 AppModule — wire StorageModule and QueueModule

**File to update:** `apps/api/src/app.module.ts`

Add two imports:
```typescript
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
```
Add `StorageModule` and `QueueModule` to the `imports` array, before `TracksModule` (they are global and must be registered before consuming modules):

```typescript
imports: [
  ConfigModule.forRoot({ ... }),
  ThrottlerModule.forRootAsync({ ... }),
  PrismaModule,
  StorageModule,    // ADD
  QueueModule,      // ADD
  HealthModule,
  AuthModule,
  UsersModule,
  GenresModule,
  ArtistsModule,
  TracksModule,
  PlaylistsModule,
  FeedModule,
  SearchModule,
],
```

---

## SECTION 3 — Worker Design

### 3.1 Install Worker Dependencies

**File to update:** `apps/worker/package.json`

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\worker'
pnpm add --save-exact @aws-sdk/client-s3 music-metadata
pnpm add -D vitest
```

Update the `"test"` script: `"vitest run"`.

---

### 3.2 `apps/worker/src/storage.ts` — minimal S3 helper

**File to create:** `apps/worker/src/storage.ts`

A minimal S3 client constructed directly from env (same env vars as API). Intentionally duplicates the API's `StorageService` read path — documented with a comment explaining the separation.

```typescript
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export function createS3Client(): S3Client { ... }

export async function headObject(client: S3Client, bucket: string, key: string): Promise<{ size: number; contentType: string; etag: string } | null>

export async function getObjectBuffer(client: S3Client, bucket: string, key: string): Promise<Buffer>
```

**Important:** Use `Body.transformToByteArray()` (AWS SDK v3) to get a `Uint8Array`, then `Buffer.from(bytes)`, then pass the `Buffer` to `music-metadata`'s `parseBuffer(buf, { mimeType })`. Do **NOT** use `parseStream` with a raw Node `Readable` (causes errors with the SDK's `Body` stream type and `parseWebStream` is for browser). The design specifies `Body.transformToWebStream() or parseBuffer — NOT raw Node Readable to parseWebStream`.

---

### 3.3 `audio-processing.processor.ts` — testable core

**File to create:** `apps/worker/src/workers/audio-processing.processor.ts`

Pure function with injected deps (no BullMQ runtime dependency for tests):

```typescript
export interface ProcessorDeps {
  prisma: PrismaClient;
  headObject: (key: string) => Promise<{ size: number; contentType: string; etag: string } | null>;
  getObjectBuffer: (key: string) => Promise<Buffer>;
  parseAudio: (buf: Buffer, mimeType: string) => Promise<{ format: { duration?: number } }>;
}

export async function processAudioJob(
  data: AudioProcessingJobData,
  deps: ProcessorDeps,
): Promise<void>
```

**Steps inside `processAudioJob`:**

1. `prisma.track.update({ where: { id: data.trackId }, data: { status: 'PROCESSING', processingError: null } })` — idempotent start marker.
2. `head = await deps.headObject(data.storageKey)`. If `null` → `throw new Error('Object not found in storage')` (BullMQ retries).
3. `buf = await deps.getObjectBuffer(data.storageKey)`.
4. `meta = await deps.parseAudio(buf, data.mimeType)`.
5. Validate duration: `const dur = meta.format.duration`. If `!dur || dur <= 0 || !isFinite(dur)` → set `PROCESSING_FAILED` with `processingError = 'Invalid or zero-duration audio'`, return (no throw — bad data won't fix on retry).
6. Transcode gate: `if (process.env.AUDIO_TRANSCODE_ENABLED === 'true') { /* future */ } else { console.info('[worker] transcode disabled, skipping') }`.
7. In one `prisma.$transaction([...])`:
   - `prisma.track.update({ where: { id: data.trackId }, data: { durationSeconds: Math.round(dur), status: 'DRAFT', processedAt: new Date(), processingError: null } })`.
   - Upsert `MediaAsset`: `prisma.mediaAsset.upsert({ where: { trackId_assetType: ... }, ... })` — check if a unique constraint exists on `(trackId, assetType)`, otherwise use `create` with a `deleteMany` first.

> `MediaAsset` in the schema has no unique constraint on `(trackId, assetType)`. Use `deleteMany({ where: { trackId, assetType: 'AUDIO' } })` then `create` inside the transaction for idempotency.

8. On any unhandled error: catch, set `status = 'PROCESSING_FAILED'`, `processingError = error.message`, log.

**`AudioProcessingJobData`** type (update from stub):

```typescript
export interface AudioProcessingJobData {
  trackId: string;
  storageKey: string;
  mimeType: string;
  // Note: 'uploadSessionId' from the old stub is removed
}
```

---

### 3.4 `audio-processing.worker.ts` — refactored

**File to update:** `apps/worker/src/workers/audio-processing.worker.ts`

Replace the stub with a real worker that:
1. Constructs `PrismaClient` + `S3Client` directly from env.
2. Creates `createAudioProcessingWorker(connection)` as before, but the `Worker` processor function now calls `processAudioJob(job.data, { prisma, headObject, getObjectBuffer, parseAudio: (buf, mime) => parseBuffer(buf, { mimeType: mime }) })`.
3. On BullMQ `worker.on('failed', ...)` after all attempts exhausted: update `Track.status = 'PROCESSING_FAILED'`, `processingError = err.message`.
4. The `parseAudio` dep injected here: `import { parseBuffer } from 'music-metadata'`.

---

### 3.5 Worker spec

**File to create:** `apps/worker/src/workers/audio-processing.processor.spec.ts`

Pattern: construct mock deps with `vi.fn()`, call `processAudioJob(data, deps)`.

**Test cases:**

```
describe('processAudioJob')
  ✓ success: headObject returns size/etag, getObjectBuffer returns buf, parseAudio returns duration 183.4
    → prisma.track.update called with status:'DRAFT', durationSeconds:183, processedAt set, processingError:null
    → prisma.mediaAsset operations called (deleteMany + create)

  ✓ zero duration: parseAudio returns { format: { duration: 0 } }
    → track.update called with status:'PROCESSING_FAILED', processingError:'Invalid or zero-duration audio'
    → does NOT throw (no retry)

  ✓ NaN duration: parseAudio returns { format: {} } (duration undefined)
    → track.update called with status:'PROCESSING_FAILED'
    → does NOT throw

  ✓ S3 object missing: headObject returns null
    → throws Error (BullMQ retries)
    → prisma.track.update for PROCESSING_FAILED NOT called yet (handled by worker.on('failed'))

  ✓ idempotency: calling processAudioJob a second time for same trackId (status already DRAFT)
    → still sets PROCESSING at start, processes normally, updates to DRAFT again
```

---

## SECTION 4 — Next.js Pages and Components

### 4.1 `src/lib/upload.ts` — XHR helper

**File to create:** `apps/web/src/lib/upload.ts`

```typescript
export function uploadToR2(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
```

---

### 4.2 `src/lib/hooks/useTracks.ts` — add Phase 4 hooks

**File to update:** `apps/web/src/lib/hooks/useTracks.ts`

Add `useMutation` import. Append the following exports after `useTrack`:

```typescript
// Returns artist's own tracks (all statuses)
export function useMyTracks() { ... }          // GET /api/v1/tracks/me → { items: TrackDto[], nextCursor? }

// Init upload: creates Track + returns presigned PUT URL
export function useInitUpload() { ... }         // POST /api/v1/tracks → UploadInitResponseDto

// Finalize after XHR PUT completes
export function useFinalizeUpload() { ... }     // POST /api/v1/tracks/:id/finalize → UploadFinalizeResponseDto

// Update metadata (details step)
export function useUpdateTrack() { ... }        // PATCH /api/v1/tracks/:id

// Cover upload (FormData multipart)
export function useUploadCover() { ... }        // POST /api/v1/tracks/:id/cover (FormData, uses fetch not apiFetch)

// Add credit row
export function useAddCredit() { ... }          // POST /api/v1/tracks/:id/credits

// Submit for review
export function useSubmitTrack() { ... }        // POST /api/v1/tracks/:id/submit

// Moderator publish (minimal, for completeness)
export function usePublishTrack() { ... }       // POST /api/v1/tracks/:id/publish

// Record play event (fire-and-forget at call site)
export function useRecordPlay() { ... }         // POST /api/v1/tracks/:id/play → PlayResponseDto
```

`useUploadCover` uses `fetch` directly (not `apiFetch`) because it sends `FormData`. Set `credentials: 'include'` to send the auth cookie.

All mutations invalidate `['tracks']` or `['track', id]` query keys on success as appropriate.

---

### 4.3 `src/providers/PlayerProvider.tsx` — new

**File to create:** `apps/web/src/providers/PlayerProvider.tsx`

```tsx
'use client';
import { createContext, useContext, useRef, useState, useCallback } from 'react';
import type { TrackDto } from '@unis-music/contracts';

interface PlayerState {
  current: TrackDto | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

interface PlayerContextValue extends PlayerState {
  play: (track: TrackDto) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>({
    current: null, isPlaying: false, currentTime: 0, duration: 0, volume: 1,
  });
  const clientPlayIdRef = useRef<string | null>(null);

  const play = useCallback((track: TrackDto) => {
    const audio = audioRef.current;
    if (!audio) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
    audio.src = `${API_BASE}/api/v1/tracks/${track.id}/stream`;
    audio.load();
    audio.play().catch(() => {});
    clientPlayIdRef.current = crypto.randomUUID();
    setState((s) => ({ ...s, current: track, isPlaying: true }));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { audio.play().catch(() => {}); setState((s) => ({ ...s, isPlaying: true })); }
    else { audio.pause(); setState((s) => ({ ...s, isPlaying: false })); }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setState((s) => ({ ...s, currentTime: time })); }
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) { audioRef.current.volume = v; setState((s) => ({ ...s, volume: v })); }
  }, []);

  return (
    <PlayerContext.Provider value={{ ...state, play, toggle, seek, setVolume, audioRef }}>
      {/* Single hidden audio element for the whole app */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setState((s) => ({ ...s, currentTime: e.currentTarget.currentTime }))}
        onDurationChange={(e) => setState((s) => ({ ...s, duration: e.currentTarget.duration }))}
        onEnded={() => setState((s) => ({ ...s, isPlaying: false }))}
        onError={() => setState((s) => ({ ...s, isPlaying: false }))}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
```

The `useRecordPlay` hook is called on `onPlay` (first time current track plays) inside `PlayerProvider`. Store the sent state in a `useRef<Set<string>>` to avoid calling twice for the same track. This keeps the record-play call co-located with playback.

---

### 4.4 `src/components/music/Player.tsx` — new full player bar

**File to create:** `apps/web/src/components/music/Player.tsx`

Reads `current, isPlaying, currentTime, duration, volume, toggle, seek, setVolume` from `usePlayer()`. If `current === null`, renders nothing (`return null`).

Renders a bottom bar:
- Cover image (presigned URL from `current.coverImageUrl`, fallback gradient div).
- Title + artist name (truncated).
- Play/pause button (`aria-label="Pause"` / `"Play"`, toggles via `toggle()`).
- Seek slider: `<input type="range" min={0} max={duration} value={currentTime} onChange={(e) => seek(+e.target.value)} aria-label="Seek" role="slider" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime} />`.
- Volume slider: `<input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" role="slider" />`.
- All interactive elements keyboard-operable (native `<button>` and `<input type="range">`).

---

### 4.5 `src/app/layout.tsx` — mount PlayerProvider

**File to update:** `apps/web/src/app/layout.tsx`

Wrap children with `PlayerProvider` inside `QueryProvider` (PlayerProvider must be inside QueryProvider so it can use query hooks):

```tsx
import { PlayerProvider } from '@/providers/PlayerProvider';

<QueryProvider>
  <PlayerProvider>
    {children}
    <Player />   {/* renders only when current !== null */}
  </PlayerProvider>
</QueryProvider>
```

Import `Player` from `@/components/music/Player`.

---

### 4.6 `src/components/music/MiniPlayer.tsx` — rewire

**File to update:** `apps/web/src/components/music/MiniPlayer.tsx`

Replace static content with `usePlayer()` reads:

```tsx
const { current, isPlaying, currentTime, duration, toggle } = usePlayer();
if (!current) return <div ...>Select a track to play</div>;  // or null
```

Show `current.title`, `current.artistName`, `current.coverImageUrl`, real play/pause state, progress bar (`width: ${duration > 0 ? (currentTime/duration)*100 : 0}%`). Keep existing styling.

---

### 4.7 Track detail page

**File to create:** `apps/web/src/app/tracks/[id]/page.tsx`

Note: The existing `getTrackById` API endpoint uses track `id`, so the route is `/tracks/[id]` (by UUID), matching the contract. (Phase 3 plan mentions `/tracks/[slug]` — both IDs and slugs are valid. Use `id` here since `useTrack(id)` calls `GET /api/v1/tracks/:id`. The page receives the route param which can be either.)

```tsx
'use client';
import { useParams, notFound } from 'next/navigation';
import { useTrack } from '@/lib/hooks/useTracks';
import { usePlayer } from '@/providers/PlayerProvider';
// ... imports

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading, error } = useTrack(id);
  const { play, current, isPlaying, toggle } = usePlayer();

  if (isLoading) return <Spinner />;
  if (error || !track) return notFound();

  const isCurrentTrack = current?.id === track.id;

  return (
    // Cover image, title, artist link, stats (plays, likes)
    // Like button wired to existing like/unlike endpoints
    // Play button: isCurrentTrack ? toggle() : play(track)
    // Credits list
    // streamUrl present → audio via PlayerProvider; absent → show "Not available"
  );
}
```

---

### 4.8 Upload page — replace stub

**File to update:** `apps/web/src/app/artist/upload/page.tsx`

Keep the 5-step visual shell and purple theme exactly as-is (do not change styling). Replace the static state handlers with real mutation calls.

**Step 1 — Audio File:**
- Real `<input type="file" accept="audio/*" />` (hidden, triggered by existing button).
- Client-side validate `file.type` against `AUDIO_MIME_TYPES` and `file.size <= 150 * 1024 * 1024`.
- On valid file pick: call `useInitUpload().mutateAsync({ title: 'Untitled', contentType: file.type })` → get `{ trackId, uploadUrl, storageKey }`.
- Then `uploadToR2(uploadUrl, file, setProgress)` with progress bar.
- Store `trackId` in component state. Progress displayed as `<progress>` element.

**Step 2 — Song Details:**
- Genres sourced from `GET /api/v1/genres` via `useQuery(['genres'], () => apiFetch('/api/v1/genres'))`.
- On Next: `useUpdateTrack().mutateAsync({ id: trackId, title, genreId, releaseDate, explicit, description })`.

**Step 3 — Credits:**
- Four rows: Featured Artist, Producer, Lyricist, Composer — each is a text input.
- On Next: for each non-empty row, call `useAddCredit().mutateAsync({ trackId, name, role })` in sequence.

**Step 4 — Artwork:**
- Real `<input type="file" accept="image/jpeg,image/png,image/webp" />`.
- On pick: validate size ≤ 10 MB. Call `useUploadCover().mutateAsync({ trackId, file })` with progress.
- Show preview `<img src={URL.createObjectURL(file)} />`.

**Step 5 — Publish:**
- On entering step 5: call `useFinalizeUpload().mutateAsync({ trackId })`.
- Poll `useTrack(trackId)` with `refetchInterval: 2000` while `status` is `UPLOADING` or `PROCESSING`.
- When `status === 'DRAFT'`: show "Submit for Review" button → `useSubmitTrack().mutateAsync({ trackId })` → redirect to `/artist/dashboard`.
- When `status === 'PROCESSING_FAILED'`: show `track.processingError` message + "Re-upload audio" CTA (resets step to 0).
- When `status === 'PROCESSING'`: show spinner + "Processing audio…".

---

### 4.9 Artist dashboard — new

**File to create:** `apps/web/src/app/artist/dashboard/page.tsx`

```tsx
'use client';
import { useMyTracks, useSubmitTrack } from '@/lib/hooks/useTracks';
import { TrackStatus } from '@unis-music/contracts';
// ... imports

const STATUS_COLOR: Record<TrackStatus, string> = {
  UPLOADING: 'bg-yellow-500/20 text-yellow-300',
  PROCESSING: 'bg-blue-500/20 text-blue-300',
  PROCESSING_FAILED: 'bg-red-500/20 text-red-300',
  DRAFT: 'bg-gray-500/20 text-gray-300',
  PENDING_REVIEW: 'bg-purple-500/20 text-purple-300',
  PUBLISHED: 'bg-green-500/20 text-green-300',
  REJECTED: 'bg-red-500/20 text-red-300',
  SCHEDULED: 'bg-blue-500/20 text-blue-300',
  TAKEN_DOWN: 'bg-orange-500/20 text-orange-300',
  ARCHIVED: 'bg-gray-500/20 text-gray-300',
};

export default function ArtistDashboard() {
  const { data, isLoading } = useMyTracks();
  const submit = useSubmitTrack();
  // ...

  return (
    <div>
      {/* Header: "My Tracks" + "Upload" CTA → /artist/upload */}
      {/* Track list: cover, title, status badge, duration, plays, contextual actions */}
      {/* DRAFT + processedAt: "Submit for Review" button */}
      {/* PROCESSING: spinner */}
      {/* PROCESSING_FAILED: error text + "Retry upload" link */}
      {/* PENDING_REVIEW: "Awaiting review" */}
      {/* PUBLISHED: "View" link to /tracks/:id */}
    </div>
  );
}
```

---

## SECTION 5 — Contracts Package Updates

**File to update:** `packages/contracts/src/index.ts`

Add the following exports (backward-compatible, no existing types renamed or removed):

```typescript
// New response DTOs
export interface UploadInitResponseDto {
  trackId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string; // ISO 8601
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
```

Extend `TrackDto` (add optional fields — existing consumers unaffected by additions):

```typescript
export interface TrackDto {
  // ...all existing fields unchanged...
  processingError?: string;           // ADD: present for PROCESSING_FAILED/REJECTED
  streamUrl?: string;                 // ADD: present only when status === 'PUBLISHED'
}
```

Note: `AddCreditDto` already exists as an interface in contracts from Phase 3 (confirm: it's in `packages/contracts/src/index.ts` as `TrackCreditDto` but not as the input DTO shape — add `AddCreditDto` as a plain interface with `{ name: string; role: string; userId?: string }`):

```typescript
export interface AddCreditDto {
  name: string;
  role: string;
  userId?: string;
}
```

Also update `PaginatedResponse<T>` note: the `/tracks/me` endpoint returns `{ items: TrackDto[], nextCursor?: string }` (cursor-paginated, matching the existing tracks endpoint shape), NOT the page-based `PaginatedResponse<T>`. The web hook uses the cursor shape directly.

---

## SECTION 6 — Tests

### 6.1 `tracks.service.spec.ts` — extend existing tests

**File to update:** `apps/api/src/tracks/tracks.service.spec.ts`

The `buildPrisma` helper must be extended to include:
- `prisma.artistProfile.findUnique` (for ownership checks and `createTrack`)
- `prisma.trackCredit.create`
- `prisma.playbackEvent.create`
- `prisma.mediaAsset.create`, `prisma.mediaAsset.upsert`, `prisma.mediaAsset.deleteMany`

Mock `StorageService` and `AudioQueueService` as constructor args:

```typescript
function makeService(prismaOverrides = {}, storageOverrides = {}, queueOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  const storage = buildStorageService(storageOverrides);
  const queue = buildQueueService(queueOverrides);
  // @ts-expect-error
  const service = new TracksService(prisma, storage, queue);
  return { service, prisma, storage, queue };
}
```

**New test cases to add:**

```
describe('createTrack')
  ✓ creates track with status UPLOADING, auto-generated slug
  ✓ returns uploadUrl, storageKey, expiresAt
  ✓ throws NotFoundException when artistProfile not found for userId
  ✓ throws NotFoundException when genreId provided but genre not found

describe('finalizeUpload')
  ✓ headObject returns null → ConflictException('Upload not completed')
  ✓ headObject returns head, transaction called with status PROCESSING, queue enqueued
  ✓ file exceeds 150MB → BadRequestException

describe('assertOwnsTrack (via any mutation)')
  ✓ different artistProfile.userId → ForbiddenException
  ✓ track not found → NotFoundException

describe('submitTrack')
  ✓ status not DRAFT → ConflictException
  ✓ processedAt null → ConflictException('Track not ready')
  ✓ valid DRAFT + processedAt → updates to PENDING_REVIEW

describe('publishTrack')
  ✓ status not PENDING_REVIEW → ConflictException
  ✓ processedAt null → ConflictException
  ✓ valid → updates to PUBLISHED

describe('recordPlay')
  ✓ PUBLISHED track, new clientPlayId → returns { played: true, playCount: N+1 }
  ✓ duplicate clientPlayId (P2002) → returns { played: false } no increment
  ✓ non-PUBLISHED track → NotFoundException

describe('getPublishedTracks — genre filter')
  ✓ unknown genre slug → NotFoundException (Fix B)
```

---

### 6.2 `storage.service.spec.ts` — new

**File to create:** `apps/api/src/storage/storage.service.spec.ts`

```
describe('StorageService')
  describe('generateAudioKey')
    ✓ key starts with 'audio/', contains trackId, has correct ext for audio/mpeg → .mp3
    ✓ key is unique on repeated calls (nanoid)

  describe('generateCoverKey')
    ✓ key starts with 'covers/', contains trackId

  describe('resolveCoverUrl')
    ✓ value starting with 'http' returned as-is (no S3 call)
    ✓ R2 key → calls createPresignedGet with 3600s TTL

  describe('headObject')
    ✓ S3 returns 404 (NoSuchKey) → returns null
    ✓ S3 returns HeadObjectOutput → returns { size, contentType, etag }
```

Use `vi.mock('@aws-sdk/client-s3')` and `vi.mock('@aws-sdk/s3-request-presigner')` to avoid real S3 calls.

---

### 6.3 `feed.service.spec.ts` — new (Phase 3 cleanup Fix D)

**File to create:** `apps/api/src/feed/feed.service.spec.ts`

Pattern: `buildPrisma`, `makeService`, `new FeedService(prisma)` with `@ts-expect-error`. See §2.9 Fix D for test cases.

---

### 6.4 `audio-processing.processor.spec.ts` — new (worker)

**File to create:** `apps/worker/src/workers/audio-processing.processor.spec.ts`

See §3.5 for test cases. Use `vitest` directly (no NestJS testing module).

---

### 6.5 `artists.service.spec.ts` — update apply() test

**File to update:** `apps/api/src/artists/artists.service.spec.ts`

Find the existing `apply()` test(s). Update mock setup so `buildPrisma` includes `prisma.$transaction = vi.fn().mockResolvedValue([mockProfile, {}])`. Assert `$transaction` is called once with an array of two operations.

---

## SECTION 7 — Verification Steps (in order)

Run all commands from the workspace root in PowerShell unless stated otherwise.

### Step 1 — Run the database migration

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database'
npx prisma migrate dev --name phase4-upload-streaming
```

**Expected:** `Migration 'phase4-upload-streaming' applied successfully` — no errors. The migration creates `PlaybackEvent` table, adds `processingError` and `processedAt` to `Track`, adds `playbackEvents` back-relation to `User`.

### Step 2 — Regenerate Prisma client

```powershell
npx prisma generate
```

**Expected:** `Generated Prisma Client ... to node_modules/.prisma/client` with no type errors.

### Step 3 — Build the API

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api'
pnpm run build
```

**Expected:** TypeScript compiles to `dist/` with zero errors. Confirms StorageModule, QueueModule, all new DTOs, and controller extensions are type-correct.

### Step 4 — Run API tests

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api'
pnpm test
```

**Expected:** All test suites pass including `tracks.service.spec.ts`, `storage.service.spec.ts`, `feed.service.spec.ts`, `artists.service.spec.ts`. Output: `✓ X tests passed, 0 failed`.

### Step 5 — Typecheck and test the worker

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\worker'
pnpm run typecheck
pnpm test
```

**Expected:** `tsc --noEmit` exits 0; vitest runs `audio-processing.processor.spec.ts` with all cases passing.

### Step 6 — Typecheck web app

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\web'
pnpm run typecheck
```

**Expected:** `tsc --noEmit` exits 0. Confirms PlayerProvider, upload page hooks, dashboard page, and Player component are type-correct.

### Step 7 — Monorepo typecheck

```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC'
pnpm -r typecheck
```

**Expected:** All packages typecheck clean — contracts, database, api, worker, web.

---

## SECTION 8 — Dependency Order A→Z

```
Step A  packages/database: add processingError, processedAt to Track; add PlaybackEvent model;
        add User.playbackEvents; migrate (phase4-upload-streaming); prisma generate.

Step B  packages/contracts: add UploadInitResponseDto, UploadFinalizeResponseDto, PlayResponseDto,
        CoverUploadResponseDto, AddCreditDto; extend TrackDto with processingError? and streamUrl?.

Step C  apps/api — install deps: pnpm add --save-exact bullmq @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

Step D  apps/api/src/config/env.validation.ts: add S3_* Joi rules.

Step E  apps/api/src/storage/: create StorageModule + StorageService (lazy init in onModuleInit,
        presignedPut/Get, headObject, putObject, getObjectStream, key-gen helpers, resolveCoverUrl).

Step F  apps/api/src/queue/: create QueueModule + AudioQueueService (raw bullmq Queue, IORedis,
        enqueueAudioProcessing method).

Step G  apps/api/src/tracks/dto/: create create-track, update-track, finalize-upload, record-play,
        add-credit, reject-track DTOs. Update tracks-query.dto if needed.

Step H  apps/api/src/tracks/tracks.service.ts: inject StorageService + AudioQueueService;
        add createTrack, uploadCover, finalizeUpload, updateTrack, addCredit, submitTrack,
        publishTrack, rejectTrack, getMyTracks, streamTrack, recordPlay, assertOwnsTrack;
        apply Fix B (genre filter NotFoundException).

Step I  apps/api/src/tracks/tracks.controller.ts: add all new endpoints in static-before-dynamic
        route order; wire FileInterceptor for cover upload; optional-JWT for play endpoint.

Step J  apps/api/src/tracks/tracks.module.ts: import StorageModule, QueueModule.

Step K  apps/api/src/artists/artists.service.ts: apply Fix A ($transaction in apply()).

Step L  apps/api/src/feed/feed.service.ts: apply Fix C (getTrending merge + dedupe). Verify
        followingArtistId field name matches schema.

Step M  apps/api/src/app.module.ts: import and register StorageModule and QueueModule.

Step N  apps/worker — install deps: pnpm add --save-exact @aws-sdk/client-s3 music-metadata;
        pnpm add -D vitest; update package.json test script to "vitest run".

Step O  apps/worker/src/storage.ts: create S3 client factory + headObject + getObjectBuffer
        (use Body.transformToByteArray() not raw Readable/parseWebStream).

Step P  apps/worker/src/workers/audio-processing.processor.ts: create pure processAudioJob
        with injected deps (prisma, headObject, getObjectBuffer, parseAudio). parseBuffer
        from music-metadata. Transcode gated on AUDIO_TRANSCODE_ENABLED=true (default off).

Step Q  apps/worker/src/workers/audio-processing.worker.ts: refactor stub → real worker
        calling processAudioJob; worker.on('failed') sets PROCESSING_FAILED.

Step R  apps/web/src/lib/upload.ts: create XHR uploadToR2 helper.

Step S  apps/web/src/lib/hooks/useTracks.ts: add Phase 4 hooks
        (useMyTracks, useInitUpload, useFinalizeUpload, useUpdateTrack, useUploadCover,
        useAddCredit, useSubmitTrack, usePublishTrack, useRecordPlay).

Step T  apps/web/src/providers/PlayerProvider.tsx: create PlayerProvider + usePlayer hook.
        Single audio ref, play/toggle/seek/setVolume, recordPlay fire-and-forget on onPlay.

Step U  apps/web/src/components/music/Player.tsx: create accessible Player bar using usePlayer().
        Seek + volume sliders with aria-label/role="slider".

Step V  apps/web/src/app/layout.tsx: wrap children with PlayerProvider inside QueryProvider;
        mount <Player /> inside PlayerProvider.

Step W  apps/web/src/components/music/MiniPlayer.tsx: rewire to read from usePlayer().

Step X  apps/web/src/app/tracks/[id]/page.tsx: create track detail page (cover, title, artist,
        stats, like control, Player integration via play(track) from context).

Step Y  apps/web/src/app/artist/upload/page.tsx: replace static stub with real 5-step flow
        (init+XHR progress → update → credits → cover multipart → finalize+poll+submit).

Step Z  apps/web/src/app/artist/dashboard/page.tsx: create artist dashboard
        (useMyTracks list, status badges, contextual actions per status).

Step AA apps/api/src/tracks/tracks.service.spec.ts: extend with Phase 4 + Fix B test cases.
Step AB apps/api/src/storage/storage.service.spec.ts: create new storage service tests.
Step AC apps/api/src/feed/feed.service.spec.ts: create new feed service tests (Fix D).
Step AD apps/api/src/artists/artists.service.spec.ts: update apply() to assert $transaction.
Step AE apps/worker/src/workers/audio-processing.processor.spec.ts: create worker unit tests.
```

---

## Deferred Items (explicit — out of scope for Phase 4)

The following are **NOT implemented** in this phase and must not be added:

- **Monetisation/earn** — `apps/web/src/app/earn`, payment provider integration, artist revenue.
- **Meilisearch search** — the existing `SearchService` uses Prisma `contains`; swap to Meilisearch is a future phase.
- **Transcode + waveform** — worker flag `AUDIO_TRANSCODE_ENABLED` defaults `false`; no ffmpeg/ffprobe dependency; no `Track.waveform` schema field.
- **PlaybackEvent sweep** — a cron job to sweep stuck `PROCESSING` tracks to `PROCESSING_FAILED` is documented as out of MVP scope.
- **Upload orphan cleanup** — `UPLOADING` tracks created but never finalized are acceptable for MVP; a cleanup job is deferred.
- **Moderator dashboard** — `POST /tracks/:id/publish` and `reject` exist, but a dedicated moderator web UI is deferred.
- **Queue dashboard (Bull Board)** — not added.
