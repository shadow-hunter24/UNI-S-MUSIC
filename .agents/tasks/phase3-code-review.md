# Phase 3 — Catalogue, Discovery & Social

Phase 3 adds the six API modules that make the platform publicly usable: genres, artists, tracks, playlists, feed, and search. The schema migrates Follow from User→User to User→ArtistProfile and adds TrackCredit, slug, likeCount, and cover art to Track. The web app gets seven new pages (home, browse, genre, artist, library, search, landing refresh) wired to these APIs via React Query.

Watch for: `apply()` creates an ArtistProfile and then updates the User role in two separate non-atomic operations — a crash between them leaves the user with an ARTIST profile but a LISTENER role (confirmed). The `getTrending` fallback in FeedService issues a second full-catalogue query when the recent window has fewer than `limit` results; the two result sets are disjoint and could return duplicates if a track crosses the boundary (likely). All social write endpoints are correctly guarded; `audioUrl` is nowhere in any select set.

**Verdict**: NEEDS_CHANGES

---

## High-level view

All six API modules are present and registered in `AppModule`. The PUBLISHED filter is consistently applied across every public endpoint and `audioUrl` never appears in any select or mapper — confirmed by reading all six services and the `TrackResponseDto` comment. BigInt `playCount` is converted to `Number` in every mapper.

`apply()` runs two database writes outside a transaction: `artistProfile.create` then `user.update({ role: 'ARTIST' })`. A failure between them leaves the user permanently stranded — an ArtistProfile row exists but the role stays LISTENER, locking them out of `GET /artists/me` and `PATCH /artists/me`.

The Follow model correctly moved from User→User to User→ArtistProfile, with schema, migration, and service all consistent. Follow and unfollow counter updates run in `$transaction`, but both are exposed to a TOCTOU race because the existence check runs outside the transaction. On the unfollow path this can drive `totalFollowers` negative, since the `Int` column has no non-negative constraint.

`getTrending()` silently switches between two datasets — recent-window and all-time — based on result count, with no indication to the caller. When the 7-day window has fewer than `limit` results, those results are discarded wholesale and replaced by an all-time query. This path is untested and the behavioral contract is undocumented.

`tracks.service.spec.ts` and `search.service.spec.ts` cover the required cases from the review brief. `FeedService` has zero test coverage, and the non-atomic `apply()` path is also untested.

---

<details>
<summary>Issues (5)</summary>

1. **Non-atomic artist apply** — `apply()` calls `artistProfile.create` then `user.update({ role: 'ARTIST' })` in two separate operations. A failure between them leaves the user with an ArtistProfile but LISTENER role, making their own profile endpoints return 403. Wrap both writes in `this.prisma.$transaction([...])`.

2. **getTrending fallback logic** — When fewer than `limit` tracks exist in the 7-day window, the function discards those results entirely and re-queries all-time. This means the caller silently receives a different dataset than expected (all-time popular vs recent-trending) with no indication of the switch. Either merge the two sets or document the fallback contract clearly. The fallback path has no test coverage.

3. **genre filter silently ignored on unknown slug** — In `TracksService.getPublishedTracks`, if `query.genre` is provided but `prisma.genre.findUnique` returns null, the filter is dropped and the full published catalogue is returned instead of a 404 or empty set. This is a correctness issue: a caller filtering by `?genre=nonexistent` gets all tracks with no indication the filter was ignored.

4. **unfollowArtist counter can go negative** — `unfollowArtist` does a `findUnique` check then deletes + decrements in a transaction, but the check is outside the transaction. Under concurrent requests, two simultaneous unfollows could both pass the `findUnique` check, then the second `delete` would fail with a Prisma not-found error, leaving `totalFollowers` decremented an extra time (or reaching -1 if the DB allows it). The `Int` column in Postgres will go negative since there is no `CHECK (totalFollowers >= 0)` constraint. Confirmed via schema.

5. **Missing tests for FeedService** — `getFeed`, `getTrending`, and `getNewReleases` have no test coverage. The PUBLISHED filter in feed queries is verified only by reading the code, not by any test. Given that the feed is the most visible surface of Phase 3, this is a meaningful gap.

</details>

<details>
<summary>Details</summary>

### Non-atomic artist apply

`apply()` executes two writes sequentially:

```ts
const profile = await this.prisma.artistProfile.create({ ... });
await this.prisma.user.update({ where: { id: userId }, data: { role: 'ARTIST' } });
```

If the second write fails — database timeout, connection reset, OOM — the user has a dangling `ArtistProfile` row but retains `LISTENER` role. `GET /artists/me` and `PATCH /artists/me` require `ARTIST` role via `RolesGuard`, so the user is permanently locked out of their own profile without manual intervention. The fix is wrapping both in `$transaction`.

### getTrending fallback

```ts
if (tracks.length < limit) {
  const allTime = await this.prisma.track.findMany({ where: { status: 'PUBLISHED' }, ... });
  return allTime.map(mapTrack);
}
```

The recent results are silently discarded. The front-end hook (`useTrending`) has no way to know which dataset it received. On a fresh install with fewer than 20 published tracks, every call to `/feed/trending` will return the all-time set — which happens to be the same tracks. On a populated platform with 15 recent trending tracks, those 15 are silently dropped in favour of up to 20 all-time tracks. The fallback path is also not covered by any test, so a regression here would go undetected.

### genre filter silently ignored

In `getPublishedTracks`:

```ts
if (query.genre) {
  const genre = await this.prisma.genre.findUnique({ where: { slug: query.genre } });
  if (genre) where.genreId = genre.id;  // silently skips if genre not found
}
```

The `if (genre)` guard means an invalid genre slug causes the filter to be dropped entirely. A client requesting `?genre=typo` receives the entire published catalogue. A 400 or empty paginated result would be more correct.

### Follow counter race condition

The `followArtist` idempotency check and the `unfollowArtist` counter decrement are both exposed to time-of-check/time-of-use races because the uniqueness guard runs outside the transaction:

```ts
// Check outside transaction
const follow = await this.prisma.follow.findUnique({ ... });
if (!follow) throw new NotFoundException('Not following this artist');

// Transaction executes after the check
await this.prisma.$transaction([
  this.prisma.follow.delete({ ... }),
  this.prisma.artistProfile.update({ data: { totalFollowers: { decrement: 1 } } }),
]);
```

Two concurrent unfollow calls can both pass the `findUnique` check. The second `delete` inside the transaction will throw a Prisma P2025 (record not found), but `totalFollowers` will already have been decremented once, or the transaction could partially apply. Since `totalFollowers` is an `Int` with no non-negative constraint in the schema, this can produce a negative value on a busy endpoint.

The `followArtist` concurrent-create path will throw a Prisma P2002 (unique constraint violation) on the second request rather than a 409, so concurrent first-follows surface as unhandled 500s rather than clean conflict responses.

### Test coverage gaps

`tracks.service.spec.ts` covers all the required cases from the brief: PUBLISHED filter, BigInt conversion, cursor pagination, DRAFT rejection, `audioUrl` absence, like/unlike lifecycle. `search.service.spec.ts` covers minimum query length, PUBLISHED filter, case-insensitive matching, and empty results.

What's not tested:
- `FeedService` entirely — `getFeed`, `getTrending` (including the fallback branch), `getNewReleases`
- `ArtistsService.apply` — the non-atomic two-write path
- `GenresService.findAll` — the N+1 count query pattern
- Playlist `addTrack` with a DRAFT track (verified correct by code reading, but no test)

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `apps/api/src/app.module.ts` | Registers 6 new modules |
| `apps/api/src/genres/` | New module: list all genres with PUBLISHED track counts, cursor-paginated genre browse |
| `apps/api/src/artists/` | New module: artist apply, public profile, follow/unfollow, cursor-paginated followers |
| `apps/api/src/tracks/` | New module: cursor-paginated PUBLISHED tracks, single track, like/unlike |
| `apps/api/src/playlists/` | New module: CRUD playlists, add/remove PUBLISHED tracks, private playlist enforcement |
| `apps/api/src/feed/` | New module: home feed, trending, new releases (optional auth for personalisation) |
| `apps/api/src/search/` | New module: multi-entity search with 2-char minimum, PUBLISHED-only tracks |
| `apps/api/src/auth/guards/optional-jwt-auth.guard.ts` | New guard: passes user if JWT present, null if not — used by feed and playlist GET |
| `apps/api/src/auth/dto/request-password-reset.dto.ts` | Adds email DTO for password reset |
| `apps/api/src/auth/auth.service.spec.ts` | Auth test updated: cookie-based token, no accessToken in body |
| `packages/contracts/src/index.ts` | Adds TrackDto, ArtistProfileDto, GenreDto, PlaylistDto, FeedDto, SearchResultDto, FollowDto, VerificationStatus |
| `packages/database/prisma/schema.prisma` | Follow→ArtistProfile, TrackCredit model, slug/likeCount/audioUrl/coverImageUrl on Track, verificationStatus/totalFollowers/totalTracks on ArtistProfile, description/trackCount on Playlist |
| `packages/database/prisma/migrations/20261105101946_phase3_catalogue/migration.sql` | Corresponding migration |
| `apps/web/src/app/home/page.tsx` | New: home feed page (trending, new releases, from-following) |
| `apps/web/src/app/browse/page.tsx` | New: SSR genre browse page |
| `apps/web/src/app/genre/[slug]/page.tsx` | New: infinite-scroll genre page via React Query |
| `apps/web/src/app/artist/[id]/page.tsx` | New: artist public profile page |
| `apps/web/src/app/library/page.tsx` | New: user library with playlists/liked/following tabs |
| `apps/web/src/app/search/page.tsx` | New: debounced search with tab filtering |
| `apps/web/src/app/page.tsx` | Updated landing with genre quick-links |
| `apps/web/src/app/auth/verify-email/page.tsx` | Token moved from query string to POST body; aria-live added |
| `apps/web/src/components/music/` | New: TrackCard, ArtistCard, GenreCard, PlaylistCard, MiniPlayer stub |
| `apps/web/src/lib/hooks/` | New: useFeed, useTracks, useArtist, useDebounce |
| `apps/web/src/providers/QueryProvider.tsx` | React Query provider with staleTime=60s |
| `apps/web/package.json` | Adds @tanstack/react-query, @tanstack/react-query-devtools |
| `apps/web/tsconfig.json` | Adds path alias for @unis-music/contracts |

Full diff: `git diff 26b7e4d HEAD`

</details>
