# Phase 3 Implementation Plan — Uni's Music Catalogue, Discovery & Social

**Workspace root:** `c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC`  
**API:** `apps/api` (NestJS 10, Vitest, pnpm)  
**Web:** `apps/web` (Next.js 14, React 18, Tailwind CSS, pnpm)  
**DB package:** `packages/database` (Prisma 5, Neon PostgreSQL)  
**Contracts:** `packages/contracts`

All paths below are relative to the workspace root unless stated otherwise.

---

## SECTION 1 — Prisma Schema Diffs

### What already exists (do NOT re-add)

`User`, `Session`, `UserProfile`, `ArtistProfile` (partial), `Genre` (partial), `Track` (partial), `Follow` (User→User), `Like`, `Playlist` (partial), `PlaylistTrack` (has `addedAt`), `AuditLog`, `MediaAsset`.  
Enums already present: `UserRole`, `TrackStatus`.

### Fields to ADD to existing models

**`ArtistProfile`** — add these columns:
```prisma
headerImageUrl    String?
country           String?
verifiedAt        DateTime?          @db.Timestamptz()
websiteUrl        String?
socialLinks       Json?              // { twitter, instagram, youtube, ... }
totalFollowers    Int                @default(0)
totalTracks       Int                @default(0)
verificationStatus VerificationStatus @default(PENDING)
```

**`Genre`** — add:
```prisma
description  String?
imageUrl     String?
```

**`Track`** — add:
```prisma
slug          String   @unique
likeCount     Int      @default(0)
coverImageUrl String?
audioUrl      String?
```
> Note: `Track` already uses `artistProfileId` (not `artistId`). The `artistId` alias in contracts maps to `artistProfileId`. Do NOT rename the column; update the `TrackDto` in contracts instead.

**`Playlist`** — add:
```prisma
description   String?
coverImageUrl String?
trackCount    Int      @default(0)
```

**`PlaylistTrack`** — `addedAt` already exists in the current schema. No change needed.

### Models to CHANGE

**`Follow`** — currently `User → User`. Change to `User → ArtistProfile` (listener follows an artist).  
Replace both relations:
```prisma
model Follow {
  followerId      String
  artistProfileId String
  createdAt       DateTime      @default(now()) @db.Timestamptz()

  follower        User          @relation("UserFollows", fields: [followerId], references: [id], onDelete: Cascade)
  artistProfile   ArtistProfile @relation("ArtistFollowers", fields: [artistProfileId], references: [id], onDelete: Cascade)

  @@id([followerId, artistProfileId])
}
```
Remove `followedBy`/`following` from `User` and add `followers Follow[] @relation("ArtistFollowers")` to `ArtistProfile`.  
Add `following Follow[] @relation("UserFollows")` to `User`.

### New model to ADD

**`TrackCredit`**:
```prisma
model TrackCredit {
  id        String   @id @default(uuid())
  trackId   String
  userId    String?           // nullable — credits a registered user
  name      String            // display name (for unclaimed credits)
  role      String            // e.g. "Producer", "Featured Artist", "Songwriter"
  createdAt DateTime @default(now()) @db.Timestamptz()

  track     Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```
Add `credits TrackCredit[]` to `Track` and `trackCredits TrackCredit[]` to `User`.

### New enum to ADD

```prisma
enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Migration command

Run from the workspace root in PowerShell:
```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database'
npx prisma migrate dev --name phase3-catalogue
```

After migration, regenerate the client (runs automatically with `migrate dev`, but explicit if needed):
```powershell
npx prisma generate
```

---

## SECTION 2 — API Modules Build Order

Build order: **Genres → Artists → Tracks → Playlists → Feed → Search → AppModule wiring**

Each module follows the same NestJS pattern established in `auth` and `users`:
- Constructor-inject `PrismaService` (from `PrismaModule`, which is global).
- Apply `@UseGuards(JwtAuthGuard)` on write endpoints; public read endpoints skip it.
- Apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` for admin/moderator endpoints.
- DTOs use `class-validator` decorators (`@IsString()`, `@IsOptional()`, etc.) with `whitelist: true` (already global).
- Every controller uses `@ApiTags(...)` and each endpoint has `@ApiOperation({ summary: '...' })`.

---

### 2.1 Genres Module

**Files to create:**
```
apps/api/src/genres/
  genres.module.ts
  genres.controller.ts
  genres.service.ts
  dto/
    create-genre.dto.ts
    update-genre.dto.ts
```

**`genres.service.ts`** methods:
- `findAll(): Promise<Genre[]>` — `prisma.genre.findMany({ orderBy: { name: 'asc' } })`
- `findOne(slug: string): Promise<Genre>` — lookup by slug, throw `NotFoundException` if absent
- `create(dto): Promise<Genre>` — admin only, generates slug via `slugify(name)`
- `update(id, dto): Promise<Genre>` — admin only
- `delete(id): Promise<void>` — admin only

**`genres.controller.ts`** routes:
- `GET /api/v1/genres` — public
- `GET /api/v1/genres/:slug` — public
- `POST /api/v1/genres` — `@Roles(UserRole.ADMIN, UserRole.MODERATOR)`
- `PATCH /api/v1/genres/:id` — `@Roles(UserRole.ADMIN, UserRole.MODERATOR)`
- `DELETE /api/v1/genres/:id` — `@Roles(UserRole.ADMIN)`

**`create-genre.dto.ts`:**
```typescript
@IsString() @MinLength(1) @MaxLength(80) name: string;
@IsOptional() @IsString() @MaxLength(500) description?: string;
@IsOptional() @IsUrl() imageUrl?: string;
```

**`update-genre.dto.ts`:** `PartialType(CreateGenreDto)` using `@nestjs/mapped-types`.

---

### 2.2 Artists Module

**Files to create:**
```
apps/api/src/artists/
  artists.module.ts
  artists.controller.ts
  artists.service.ts
  dto/
    update-artist-profile.dto.ts
    submit-verification.dto.ts
    review-verification.dto.ts
```

**`artists.service.ts`** methods:
- `findAll(page, pageSize): Promise<PaginatedResult<ArtistProfile>>` — only `verificationStatus: APPROVED` artists; paginated
- `findBySlug(stageName: string)` — includes recent tracks (top 5 published), follower count
- `findById(id: string)` — full profile
- `updateProfile(userId, dto)` — artist updates their own profile; guard: `user.role === ARTIST`
- `submitForVerification(userId)` — sets `verificationStatus = PENDING`
- `reviewVerification(artistProfileId, dto, actorId)` — moderator/admin sets APPROVED/REJECTED, sets `verifiedAt`, writes `AuditLog`
- `followArtist(followerId, artistProfileId)` — upsert Follow, increment `totalFollowers` via `prisma.$transaction`
- `unfollowArtist(followerId, artistProfileId)` — delete Follow, decrement `totalFollowers`
- `getFollowers(artistProfileId, page, pageSize)` — paginated follower list

**`artists.controller.ts`** routes:
- `GET /api/v1/artists` — public, paginated
- `GET /api/v1/artists/:id` — public
- `PATCH /api/v1/artists/me` — `@UseGuards(JwtAuthGuard)`, artist updates own profile
- `POST /api/v1/artists/me/verification` — `@UseGuards(JwtAuthGuard)`, submit for verification
- `POST /api/v1/artists/:id/verification/review` — `@Roles(UserRole.MODERATOR, UserRole.ADMIN)`
- `POST /api/v1/artists/:id/follow` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/artists/:id/follow` — `@UseGuards(JwtAuthGuard)`
- `GET /api/v1/artists/:id/followers` — public

**`update-artist-profile.dto.ts`:**
```typescript
@IsOptional() @IsString() @MaxLength(200) bio?: string;
@IsOptional() @IsUrl() imageUrl?: string;
@IsOptional() @IsUrl() headerImageUrl?: string;
@IsOptional() @IsString() @MaxLength(80) country?: string;
@IsOptional() @IsUrl() websiteUrl?: string;
@IsOptional() @IsObject() socialLinks?: Record<string, string>;
```

**`review-verification.dto.ts`:**
```typescript
@IsEnum(VerificationStatus) status: VerificationStatus; // APPROVED | REJECTED
@IsOptional() @IsString() @MaxLength(500) reason?: string;
```

---

### 2.3 Tracks Module

**Files to create:**
```
apps/api/src/tracks/
  tracks.module.ts
  tracks.controller.ts
  tracks.service.ts
  tracks.service.spec.ts
  dto/
    create-track.dto.ts
    update-track.dto.ts
    publish-track.dto.ts
    add-credit.dto.ts
```

**`tracks.service.ts`** methods:
- `create(userId, dto)` — artist only; auto-generates `slug` from title + nanoid suffix; status = `DRAFT`
- `findAll(filters: { genreId?, status?, artistProfileId?, search? }, page, pageSize)` — public endpoint shows only `PUBLISHED`; artist/admin can see own drafts
- `findOne(slug: string)` — throws `NotFoundException` if not found or not published (for public)
- `findById(id: string)` — internal/admin use
- `update(id, userId, dto)` — artist can edit DRAFT/REJECTED tracks only; moderator can edit any
- `publish(id, userId)` — sets status `PENDING_REVIEW` for artist; `PUBLISHED` for moderator/admin
- `delete(id, userId)` — artist can delete own DRAFT; admin can delete any
- `likeTrack(userId, trackId)` — upsert Like, increment `likeCount` via transaction
- `unlikeTrack(userId, trackId)` — delete Like, decrement `likeCount`
- `incrementPlayCount(trackId)` — atomic `$executeRaw` UPDATE to increment `playCount`
- `addCredit(trackId, dto, userId)` — artist adds credit to own track
- `removeCredit(creditId, userId)` — artist removes credit from own track

**`tracks.controller.ts`** routes:
- `GET /api/v1/tracks` — public, paginated with query filters (`genreId`, `search`, `artistId`)
- `GET /api/v1/tracks/:slug` — public
- `POST /api/v1/tracks` — `@UseGuards(JwtAuthGuard)`, `@Roles(UserRole.ARTIST)`
- `PATCH /api/v1/tracks/:id` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/tracks/:id` — `@UseGuards(JwtAuthGuard)`
- `POST /api/v1/tracks/:id/publish` — `@UseGuards(JwtAuthGuard)`
- `POST /api/v1/tracks/:id/like` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/tracks/:id/like` — `@UseGuards(JwtAuthGuard)`
- `POST /api/v1/tracks/:id/play` — `@UseGuards(JwtAuthGuard)`, records play event
- `POST /api/v1/tracks/:id/credits` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/tracks/credits/:creditId` — `@UseGuards(JwtAuthGuard)`

**`create-track.dto.ts`:**
```typescript
@IsString() @MinLength(1) @MaxLength(200) title: string;
@IsOptional() @IsString() @MaxLength(2000) description?: string;
@IsOptional() @IsUUID() genreId?: string;
@IsOptional() @IsInt() @Min(1) durationSeconds?: number;
@IsBoolean() @IsOptional() explicit?: boolean;
@IsOptional() @IsDateString() releaseDate?: string;
@IsOptional() @IsUrl() coverImageUrl?: string;
@IsOptional() @IsUrl() audioUrl?: string;
```

**`add-credit.dto.ts`:**
```typescript
@IsString() @MinLength(1) @MaxLength(100) name: string;
@IsString() @MinLength(1) @MaxLength(80) role: string;
@IsOptional() @IsUUID() userId?: string;
```

---

### 2.4 Playlists Module

**Files to create:**
```
apps/api/src/playlists/
  playlists.module.ts
  playlists.controller.ts
  playlists.service.ts
  dto/
    create-playlist.dto.ts
    update-playlist.dto.ts
    add-track.dto.ts
    reorder-tracks.dto.ts
```

**`playlists.service.ts`** methods:
- `create(userId, dto)` — creates playlist for authenticated user
- `findMine(userId, page, pageSize)` — user's own playlists
- `findPublic(page, pageSize)` — public playlists
- `findOne(id, requestingUserId?)` — returns playlist if public, or if owned by requestingUserId
- `update(id, userId, dto)` — owner only
- `delete(id, userId)` — owner only
- `addTrack(id, userId, dto)` — appends track at next position, increments `trackCount`
- `removeTrack(playlistId, trackId, userId)` — removes track, decrements `trackCount`
- `reorderTracks(id, userId, dto)` — updates `position` for all `PlaylistTrack` rows in a transaction

**`playlists.controller.ts`** routes:
- `GET /api/v1/playlists` — public playlists
- `GET /api/v1/playlists/me` — `@UseGuards(JwtAuthGuard)`, own playlists
- `GET /api/v1/playlists/:id` — public or owned
- `POST /api/v1/playlists` — `@UseGuards(JwtAuthGuard)`
- `PATCH /api/v1/playlists/:id` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/playlists/:id` — `@UseGuards(JwtAuthGuard)`
- `POST /api/v1/playlists/:id/tracks` — `@UseGuards(JwtAuthGuard)`
- `DELETE /api/v1/playlists/:id/tracks/:trackId` — `@UseGuards(JwtAuthGuard)`
- `PATCH /api/v1/playlists/:id/tracks/reorder` — `@UseGuards(JwtAuthGuard)`

**`create-playlist.dto.ts`:**
```typescript
@IsString() @MinLength(1) @MaxLength(200) title: string;
@IsOptional() @IsString() @MaxLength(1000) description?: string;
@IsOptional() @IsUrl() coverImageUrl?: string;
@IsBoolean() @IsOptional() isPublic?: boolean;
```

**`add-track.dto.ts`:**
```typescript
@IsUUID() trackId: string;
```

**`reorder-tracks.dto.ts`:**
```typescript
@IsArray() @ValidateNested({ each: true }) @Type(() => TrackPositionDto)
tracks: TrackPositionDto[];
// TrackPositionDto: { @IsUUID() trackId: string; @IsInt() @Min(0) position: number; }
```

---

### 2.5 Feed Module

**Files to create:**
```
apps/api/src/feed/
  feed.module.ts
  feed.controller.ts
  feed.service.ts
```

**`feed.service.ts`** methods:
- `getHomeFeed(userId?, page, pageSize)` — returns recently published tracks ordered by `createdAt DESC`; if `userId` provided, boosts tracks from followed artists (simple SQL `ORDER BY CASE WHEN artistProfileId IN (...follows) THEN 0 ELSE 1 END, createdAt DESC`)
- `getNewReleases(page, pageSize)` — published tracks from last 30 days ordered by `releaseDate DESC`
- `getTrending(page, pageSize)` — published tracks ordered by `playCount DESC` (last 7 days — filter by `createdAt >= now()-7d` on playback events when available; fall back to all-time `playCount`)
- `getByGenre(genreSlug, page, pageSize)` — published tracks for a genre

**`feed.controller.ts`** routes (all public, optional JWT for personalisation):
- `GET /api/v1/feed` — home feed
- `GET /api/v1/feed/new-releases` — new releases
- `GET /api/v1/feed/trending` — trending
- `GET /api/v1/feed/genre/:slug` — genre feed

Use `@UseGuards(JwtAuthGuard)` with `@Public()` alternative pattern not needed here — use optional guard by checking `req.user` in the service rather than blocking unauthenticated requests.

**Decision:** Feed uses Prisma queries only (no Redis caching) for Phase 3. Redis caching can be layered in Phase 4 after query patterns are confirmed.

---

### 2.6 Search Module

**Files to create:**
```
apps/api/src/search/
  search.module.ts
  search.controller.ts
  search.service.ts
  search.service.spec.ts
```

**`search.service.ts`** methods:
- `search(query: string, type: 'tracks'|'artists'|'playlists'|'all', page, pageSize)` — uses PostgreSQL `ILIKE '%query%'` across relevant fields; never returns non-published tracks to unauthenticated callers
- `searchTracks(query, page, pageSize)` — `WHERE (title ILIKE $1 OR description ILIKE $1) AND status = 'PUBLISHED'`
- `searchArtists(query, page, pageSize)` — `WHERE stageName ILIKE $1 AND verificationStatus = 'APPROVED'`
- `searchPlaylists(query, page, pageSize)` — `WHERE title ILIKE $1 AND isPublic = true`

**Decision:** PostgreSQL `ILIKE` for Phase 3 (already in stack, zero extra infra). Meilisearch migration is a Phase 4 concern, as the roadmap notes.

**`search.controller.ts`** routes:
- `GET /api/v1/search?q=...&type=all&page=1&pageSize=10` — public

---

### 2.7 AppModule Wiring

**File to update:** `apps/api/src/app.module.ts`

Add imports (in order, after existing modules):
```typescript
import { GenresModule } from './genres/genres.module';
import { ArtistsModule } from './artists/artists.module';
import { TracksModule } from './tracks/tracks.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FeedModule } from './feed/feed.module';
import { SearchModule } from './search/search.module';
```

Add all six to the `imports` array of `@Module({...})`.

---

## SECTION 3 — Next.js Pages and Components

### 3.1 Install TanStack Query

TanStack Query is NOT currently installed. Add to `apps/web/package.json`:

```bash
pnpm --filter @unis-music/web add @tanstack/react-query@^5.40.0 @tanstack/react-query-devtools@^5.40.0
```

> Pin to `^5.40.0` (React Query v5 — compatible with React 18 and Next.js 14 App Router).

### 3.2 QueryProvider

**File to create:** `apps/web/src/providers/QueryProvider.tsx`

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**File to update:** `apps/web/src/app/layout.tsx` — wrap `{children}` with `<QueryProvider>` (import the provider above the `RootLayout` return).

### 3.3 API query hooks

**Files to create:** `apps/web/src/lib/hooks/`
```
use-tracks.ts       — useQuery for GET /api/v1/tracks, GET /api/v1/tracks/:slug
use-artists.ts      — useQuery for GET /api/v1/artists, GET /api/v1/artists/:id
use-genres.ts       — useQuery for GET /api/v1/genres
use-playlists.ts    — useQuery for GET /api/v1/playlists, /playlists/me, /playlists/:id
use-feed.ts         — useQuery for GET /api/v1/feed, /feed/new-releases, /feed/trending, /feed/genre/:slug
use-search.ts       — useQuery for GET /api/v1/search
```

Each hook uses `apiFetch` from `apps/web/src/lib/api.ts` (already exists).  
Pattern:
```typescript
export function useTracks(params?: TrackQueryParams) {
  return useQuery({
    queryKey: ['tracks', params],
    queryFn: () => apiFetch<PaginatedResponse<TrackDto>>(`/api/v1/tracks?${qs(params)}`),
  });
}
```

### 3.4 Shared UI Components (new)

**Files to create:** `apps/web/src/components/`
```
ui/
  Spinner.tsx          — loading spinner (accessible aria-label="Loading")
  Badge.tsx            — genre/status pill
  Avatar.tsx           — image with initials fallback, rounded
  Card.tsx             — generic surface card with optional press handler
  EmptyState.tsx       — empty list placeholder with icon + message
  Pagination.tsx       — prev/next page controls
music/
  TrackCard.tsx        — cover art + title + artist + duration + like button
  TrackList.tsx        — maps TrackCard[] with loading skeleton
  ArtistCard.tsx       — artist avatar + stage name + follower count + follow button
  PlaylistCard.tsx     — cover + title + track count + public/private badge
  GenreChip.tsx        — genre pill with imageUrl background, links to genre feed
layout/
  PageHeader.tsx       — back arrow + title + optional right action
  SectionHeader.tsx    — section title + optional "See all" link
```

### 3.5 Pages to create/update

**New pages:**

| Route | File | Auth Required | Notes |
|---|---|---|---|
| `/discover` | `app/discover/page.tsx` | No | Genre grid + trending + new releases feeds |
| `/genre/[slug]` | `app/genre/[slug]/page.tsx` | No | Genre feed page with TrackList |
| `/search` | `app/search/page.tsx` | No | Search input + tabbed results (Tracks / Artists / Playlists) |
| `/tracks/[slug]` | `app/tracks/[slug]/page.tsx` | No | Track detail — cover, credits, like/playlist actions |
| `/artists/[id]` | `app/artists/[id]/page.tsx` | No | Artist profile — header, bio, tracks, follow button |
| `/playlists` | `app/playlists/page.tsx` | Yes | User's own playlists |
| `/playlists/[id]` | `app/playlists/[id]/page.tsx` | No (public) | Playlist detail |
| `/playlists/new` | `app/playlists/new/page.tsx` | Yes | Create playlist form |
| `/upload` | `app/upload/page.tsx` | Yes (ARTIST) | Track upload form (update existing stub) |
| `/artist/dashboard` | `app/artist/dashboard/page.tsx` | Yes (ARTIST) | Upload CTA, track list, stats stub |

**Pages to update:**
- `app/page.tsx` — connect genre teaser chips to `/genre/[slug]` routes
- `app/connect/page.tsx` — update stubs to use real artist browse from `useArtists()`
- `app/earn/page.tsx` — retain as stub; will be wired in Phase 4 (monetisation)

### 3.6 Middleware (auth protection)

**File to create:** `apps/web/src/middleware.ts`

Use Next.js middleware to redirect unauthenticated users away from protected routes (`/playlists/new`, `/upload`, `/artist/dashboard`). Check for the `access_token` cookie.

```typescript
import { NextRequest, NextResponse } from 'next/server';
const PROTECTED = ['/playlists/new', '/upload', '/artist/dashboard'];
export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token');
  if (PROTECTED.some(p => req.nextUrl.pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/playlists/new', '/upload', '/artist/dashboard'] };
```

---

## SECTION 4 — Contracts Package Updates

**File to update:** `packages/contracts/src/index.ts`

Add the following types/enums:

```typescript
// New enum
export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Update existing ArtistProfileDto (add fields):
export interface ArtistProfileDto {
  id: string;
  userId: string;
  stageName: string;
  bio?: string;
  imageUrl?: string;
  headerImageUrl?: string;
  country?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  isVerified: boolean;               // keep for backward compat
  verificationStatus: VerificationStatus;
  totalFollowers: number;
  totalTracks: number;
}

// Update existing TrackDto (fix artistId alias, add missing fields):
export interface TrackDto {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: TrackStatus;
  artistProfileId: string;    // renamed from artistId to match schema column
  genreId?: string;
  durationSeconds?: number;
  explicit: boolean;
  playCount: number;
  likeCount: number;
  coverImageUrl?: string;
  audioUrl?: string;
  releaseDate?: string;
  createdAt: string;
}

// New interfaces:
export interface GenreDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface TrackCreditDto {
  id: string;
  trackId: string;
  userId?: string;
  name: string;
  role: string;
}

export interface PlaylistDto {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrackDto {
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  track?: TrackDto;
}

export interface FollowDto {
  followerId: string;
  artistProfileId: string;
  createdAt: string;
}

export interface SearchResultDto {
  tracks: PaginatedResponse<TrackDto>;
  artists: PaginatedResponse<ArtistProfileDto>;
  playlists: PaginatedResponse<PlaylistDto>;
}

// Feed section type used by home feed endpoint
export interface FeedSectionDto {
  title: string;
  tracks: TrackDto[];
}
```

---

## SECTION 5 — Tests

### 5.1 `tracks.service.spec.ts`

**File:** `apps/api/src/tracks/tracks.service.spec.ts`

Follow the exact mock-builder pattern in `auth.service.spec.ts`: construct a mock `PrismaService` with `vi.fn()` per method, then `new TracksService(prisma)`.

**Key test cases:**

```
describe('TracksService')
  describe('create')
    ✓ creates track with DRAFT status and auto-generated slug
    ✓ throws NotFoundException if artist profile not found for userId
    ✓ throws ForbiddenException if user role is not ARTIST

  describe('findAll')
    ✓ returns only PUBLISHED tracks for unauthenticated query
    ✓ returns own DRAFT tracks when artistProfileId filter matches requesting user
    ✓ filters by genreId when provided
    ✓ returns paginated result (correct page/pageSize math)

  describe('findOne')
    ✓ returns track by slug when status is PUBLISHED
    ✓ throws NotFoundException for non-existent slug
    ✓ throws NotFoundException when track is DRAFT (public access)

  describe('update')
    ✓ artist can update own DRAFT track
    ✓ throws ForbiddenException when artist tries to update another artist's track
    ✓ throws ForbiddenException when track status is PUBLISHED (edit lock for artists)

  describe('likeTrack')
    ✓ creates Like row and increments likeCount in transaction
    ✓ throws ConflictException when Like already exists

  describe('unlikeTrack')
    ✓ deletes Like row and decrements likeCount in transaction
    ✓ throws NotFoundException when Like does not exist

  describe('incrementPlayCount')
    ✓ calls prisma.$executeRaw with correct trackId
```

### 5.2 `search.service.spec.ts`

**File:** `apps/api/src/search/search.service.spec.ts`

**Key test cases:**

```
describe('SearchService')
  describe('searchTracks')
    ✓ queries with ILIKE on title and description
    ✓ always filters status = PUBLISHED
    ✓ returns empty array for blank query (no DB call)
    ✓ returns paginated result with correct total

  describe('searchArtists')
    ✓ queries stageName ILIKE
    ✓ filters verificationStatus = APPROVED
    ✓ returns empty array for blank query

  describe('searchPlaylists')
    ✓ queries title ILIKE
    ✓ filters isPublic = true
    ✓ returns empty array for blank query

  describe('search (combined)')
    ✓ calls all three sub-searches and combines into SearchResultDto
    ✓ type="tracks" calls only searchTracks, skips artists and playlists
    ✓ type="artists" calls only searchArtists
```

---

## SECTION 6 — Verification Steps (in order)

Run these from the workspace root in PowerShell after all code is written:

### Step 1 — Run the migration
```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\packages\database'
npx prisma migrate dev --name phase3-catalogue
```
**Expected:** Migration runs without error; `Migration 'phase3-catalogue' applied successfully` message printed.

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
**Expected:** TypeScript compiles to `dist/` with zero errors.

### Step 4 — Run API tests
```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\api'
pnpm test
```
**Expected:** All test suites pass including `tracks.service.spec.ts` and `search.service.spec.ts`. Output: `✓ X tests passed`.

### Step 5 — Typecheck web app
```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC\apps\web'
pnpm run typecheck
```
**Expected:** `tsc --noEmit` exits 0 with no errors.

### Step 6 — Monorepo typecheck
```powershell
cd 'c:\Users\AHMED MANUEL BOATENG\Downloads\UNIS MUSIC'
pnpm -r typecheck
```
**Expected:** All packages typecheck clean.

---

## Dependency order summary

```
Step A  schema.prisma diffs + migration + prisma generate
Step B  packages/contracts/src/index.ts updates
Step C  Genres module (no inter-module deps)
Step D  Artists module (depends on Follow model change from Step A)
Step E  Tracks module (depends on ArtistProfile from Step D being queryable)
Step F  Playlists module (depends on Track from Step E)
Step G  Feed module (depends on Tracks + Artists + Genres)
Step H  Search module (depends on Tracks + Artists + Playlists)
Step I  AppModule wiring (imports all new modules)
Step J  packages/contracts updates (used by web, independent of API modules)
Step K  TanStack Query install + QueryProvider + layout.tsx update
Step L  API hooks (lib/hooks/*.ts)
Step M  Shared UI components
Step N  Pages (consume hooks + components)
Step O  middleware.ts
Step P  All tests written and passing
```
