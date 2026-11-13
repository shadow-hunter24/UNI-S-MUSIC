# Mobile Responsiveness Audit — Uni's Music Web App

**Audit date:** Read-only static analysis of all 22 page files  
**Viewport scope:** 320px–430px (iPhone SE → iPhone 15 Pro Max)  
**Method:** Code review; no browser execution

---

## Summary of Issues by Severity

| Severity | Count | Top categories |
|----------|-------|----------------|
| HIGH     | 7     | Bottom-nav overlap (player/bottom bar stacking), fixed 480px hero height on landing page, `w-full max-w-xs` artwork crop on upload step, genre grid on landing (`grid-cols-4` on mobile), admin verification payout row overflow, TrackCard uses raw `<img>` instead of next/image, player page has no bottom padding behind BottomNav |
| MEDIUM   | 9     | `pb-20` / `pb-24` inconsistency across pages, artist dashboard top-tracks table 4-column grid on 320px, landing hero h1 `text-5xl` on mobile (~40px), connect page title "Messaging & Fan Engagement" too long for narrow header, `scrollbar-hide` utility not defined in globals.css, notifications avatar width=44px fixed (potential overflow on 320px), 480px hero fixed height clipped on small screens, MiniPlayer + BottomNav combined height ~112px, `pb-36` on some pages vs `pb-24` on others |
| LOW      | 6     | Upload step-labels hidden on `sm:` (not shown on mobile at all), lyrics textarea `rows=8` leaves little viewport on small screens, search `pb-36` bottom padding may be excessive, auth social buttons on 320px can be tight, genre page sub-tabs have no overflow scroll on narrow screens, `max-w-xs` cover upload button constrains artwork on small phones |

---

## Per-Page Findings

### 1. `apps/web/src/app/page.tsx` — Landing / Splash

**HIGH — Hero fixed height 480px with `text-5xl` heading**
- Line: `<div className="relative w-full h-[480px] md:h-[560px] overflow-hidden">`
- `h-[480px]` is a fixed pixel height. On 320px-wide phones this is fine vertically, but the hero text uses `text-5xl` (≈3rem/48px). Combined with `px-6` padding that leaves only 272px of usable width; the brand name "Uni's Music" may be cramped.
- Fix: add `text-4xl md:text-5xl lg:text-7xl` responsive sizing.

**HIGH — Genre grid `grid-cols-4` on mobile**
- Line: `<div className="grid grid-cols-4 sm:grid-cols-8 gap-2">`
- On a 320px screen, 4 columns with `gap-2` gives each genre chip only ~74px. The text "Electronic" (9 chars) and "Afrobeats" at `text-xs font-bold` will almost certainly overflow or be illegible.
- Fix: `grid-cols-2 sm:grid-cols-4 md:grid-cols-8`.

**MEDIUM — Feature badges section uses `flex-wrap` but minimum card width is unbounded**
- Lines: mobile feature badges `flex flex-wrap gap-3` — OK, but on 320px the cards with an icon + two lines of text may wrap oddly. Low risk but worth checking at 320px.

**LOW — Header on mobile has logo + "Log In" + "Sign Up" all visible**
- On 320px, the header row is `flex items-center justify-between`. With the logo block (~120px) and two buttons (~120px) this is tight at ~240px usable width; there is no truncation. At 375px it is fine.

---

### 2. `apps/web/src/app/onboarding/page.tsx` — Onboarding slides

**PASS — Generally good.**
- `max-w-xs` content area, `px-6` padding, `py-3.5` buttons (~42px tall — just under 44px recommendation but acceptable).
- Slide dot tap targets: `width: 8px, height: 8px`. These are only 8×8px — far below the 44×44px touch target minimum. Use an invisible padding wrapper or a larger hit area.
- Fix: wrap each dot `<button>` with `p-3` to expand the tap area visually transparent.

**LOW — Dot buttons are 8px touch targets**
- Each `<button>` for slide indicators has explicit `width: 8px, height: 8px` via inline style. The tap target is 8px — will cause mis-taps on mobile. This is a LOW/MEDIUM accessibility issue.

---

### 3. `apps/web/src/app/home/page.tsx` — Home feed

**MEDIUM — `pb-20` bottom padding may be insufficient with MiniPlayer stacked above BottomNav**
- Root div: `pb-20` (80px). BottomNav is `h-16` (64px). MiniPlayer is `fixed bottom-16` (above BottomNav) and roughly `~56px` tall. Total fixed chrome at the bottom = ~120px.
- With `pb-20` (80px), the last content item is hidden behind the MiniPlayer bar.
- Fix: increase to `pb-36` or `pb-40` on pages that show MiniPlayer.

**MEDIUM — Featured hero banner fixed height `style={{ height: 200 }}`**
- Inline `height: 200` is pixels and unresponsive. On a 320px phone the aspect ratio may look wrong compared to 430px. Use `aspect-video` or a responsive `h-` class instead.

**PASS — Trending horizontal scroll**: `overflow-x-auto -mx-4 px-4` pattern is correct for edge-to-edge scroll with `scrollbar-hide`. However, `scrollbar-hide` utility is NOT defined in `globals.css` — see shared component issue below.

---

### 4. `apps/web/src/app/search/page.tsx` — Search

**MEDIUM — `pb-36` bottom padding (fine) but only MiniPlayer + BottomNav below**
- `pb-36` (144px) is used here. This is correct for pages with both MiniPlayer and BottomNav. Good.

**PASS — Genre grid `grid-cols-2`**: correct for mobile.

**LOW — Filter tabs overflow**: `flex gap-2 overflow-x-auto pb-1 scrollbar-hide` — correct pattern but `scrollbar-hide` is undefined (see shared issue).

---

### 5. `apps/web/src/app/genre/[slug]/page.tsx` — Genre page

**LOW — Sub-tab row has no overflow scroll**
- `<div className="sticky top-0 z-20 flex gap-1 px-4 py-3">`
- Three tabs ("Top Tracks", "Albums", "Playlists") — 3 × ~90px = ~270px + gap = ~280px. On 320px with `px-4` = 288px usable, this is tight but likely fits. However there is no `overflow-x-auto` to handle future additions.

**PASS — Track list rows**: correct responsive flex layout with `truncate` and `min-w-0`.

---

### 6. `apps/web/src/app/artists/[id]/page.tsx` — Artist profile

**MEDIUM — `-mt-12` negative margin on main can cause avatar to overlap header incorrectly on small screens**
- `<main className="flex-1 px-4 -mt-12 relative z-10">` with a 24×24 avatar. The gradient header is `h-52` (208px). The `-mt-12` pulls the avatar up over the gradient, which is intentional. However if the browser chrome shifts anything, it could look broken. Visual concern only.

**PASS** — Action buttons use `flex-1` evenly split; no fixed widths. Bio text is responsive.

---

### 7. `apps/web/src/app/player/page.tsx` — Full-screen player

**HIGH — No BottomNav import, but also no `pb-` bottom padding**
- The player does NOT import BottomNav. Its root div is just `px-4 py-6` with `overflow-hidden`.
- On iOS Safari, the browser chrome (home indicator area) is ~34px. With no `safe-area-inset-bottom` or `pb-safe` padding, the bottom "Up Next" section may be partially hidden.
- Fix: add `pb-8 safe:pb-safe` or `pb-10` to the root div.

**MEDIUM — Cover art is `w-64 h-64` fixed pixels**
- `className="w-64 h-64 rounded-2xl"` — 256×256px. On a 320px phone with `px-4` padding this gives only 288px usable width, so a 256px square fits (88% of width), but it doesn't scale down on 320px. Consider `w-full max-w-[260px] aspect-square`.

**MEDIUM — No `<Image>` component for cover art**
- The player uses a placeholder `<Music>` icon (no real image) so this is not an immediate issue, but once real cover art is loaded it should use `next/image` with appropriate `sizes`.

---

### 8. `apps/web/src/app/artist/upload/page.tsx` — Multi-step upload

**HIGH — Step labels hidden on mobile (`hidden sm:block`)**
- `<span className="text-xs hidden sm:block">`
- On mobile (< 640px) the step labels disappear entirely. Users only see unlabeled icons in the step indicator bar. This can be confusing for a 5-step form.
- Fix: either show abbreviated labels or use tooltips; at minimum show the current step name (already done in `<h2>` below).

**HIGH — `max-w-xs mx-auto` on artwork step**  
- Step 3 cover upload: `className="w-full aspect-square max-w-xs mx-auto rounded-2xl"`
- `max-w-xs` = 320px. On a 320px phone with `px-4` (32px padding) = 288px usable, this is wider than the container, but `w-full` should take precedence. Technically fine, but could clip. Confirm on real device.

**MEDIUM — `pb-20` with no MiniPlayer on this page**
- Upload page has `pb-20` and no MiniPlayer import. BottomNav is 64px (`h-16`), so `pb-20` (80px) is correct here — 16px breathing room above nav. Acceptable.

---

### 9. `apps/web/src/app/artist/lyrics/page.tsx` — Lyrics

**MEDIUM — `rows={8}` textarea on small phones**
- On a 320px phone with standard Chrome keyboard (~260px), an 8-row textarea (~192px) + header (~64px) + upload button + save button leaves very little room. Users will have to scroll while the keyboard is open.
- Fix: `rows={5}` on mobile, or use `min-h-[120px] max-h-[200px] resize-y`.

**PASS** — `pb-24` bottom padding, `px-4` throughout.

---

### 10. `apps/web/src/app/artist/verification/page.tsx` — Get Verified

**PASS** — Simple informational page. `px-4`, `pb-24`, full-width button, responsive text. No issues.

---

### 11. `apps/web/src/app/artist/dashboard/page.tsx` — Artist dashboard

**MEDIUM — Top Tracks `grid-cols-4` table on mobile**
- `<div className="grid grid-cols-4 items-center px-4 py-3">`
- 4-column grid for `#`, `Title (col-span-2)`, `Plays / Earnings`. On 320px with `px-4`:
  - Column 1 (`#`): ~24px — OK
  - Column 2-3 (Title + icon): ~144px — OK
  - Column 4 (Plays/Earnings right-aligned): ~72px. The two lines of text ("24,102" and "$48.20") at `text-xs` and `text-white` are readable but very tight.
- This could overflow if earnings string grows. Consider `text-[10px]` or combining plays/earnings into a single smaller display.

**LOW — `hidden md:flex` sidebar completely absent on mobile**
- The sidebar nav (`hidden md:flex`) is correctly hidden on mobile and replaced by the BottomNav. However the BottomNav only has 4 items (`Stream`, `Upload`, `Earn`, `Connect`) — the artist-specific links (Promotions, Messages, Settings) are only discoverable on desktop. This is a navigation discoverability issue, not a visual overflow.

---

### 12. `apps/web/src/app/earn/page.tsx` — Earn / Ads

**PASS** — `pb-24`, `px-4`, full-width form fields. `grid-cols-2` quick links work at all sizes.

---

### 13. `apps/web/src/app/earn/payouts/page.tsx` — Payouts

**PASS** — Balance card `grid` with two items, `grid-cols-3` earnings overview. At 320px `grid-cols-3` with `gap-3` gives each card ~87px — text "$3.20" and "Today" at `text-xs` and `text-sm` fits.

**LOW** — Earnings overview cards on 320px: "This Week" label is 2 words at `text-xs` — will wrap. Use abbreviated text or allow wrapping.

---

### 14. `apps/web/src/app/earn/payment-methods/page.tsx` — Payment Methods

**PASS** — Full-width cards with `flex` layout, all responsive. No issues.

---

### 15. `apps/web/src/app/connect/page.tsx` — Messaging

**MEDIUM — Header title "Messaging & Fan Engagement" overflows on 320px**
- `<h1 className="text-lg font-bold text-white">Messaging &amp; Fan Engagement</h1>` with a compose button on the right.
- At `text-lg` (18px) this is a 28-character string. On 320px with `px-4` = 288px usable, with the compose button (~36px + gap), title has ~240px — at 18px font this will NOT overflow, but it is very tight. On 360px it's fine.
- Fix: truncate with `truncate` class or shorten to "Messaging".

---

### 16. `apps/web/src/app/admin/page.tsx` — Admin Dashboard

**PASS** — Uses same responsive 2-column grid pattern as Artist Dashboard. No critical mobile issues. Sidebar is `hidden md:flex`.

**LOW** — On mobile, admin navigation entirely relies on BottomNav which has no admin-specific links. Admin users on mobile have no access to Verification or Accounts pages from the nav. Navigation gap only.

---

### 17. `apps/web/src/app/admin/verification/page.tsx` — Admin Verification

**HIGH — Payout approval row crowded on 320px**
- Each payout row: `flex items-center gap-3` with avatar (36px) + name/time + amount text + two buttons ("Approve", "Reject").
- Summing: 36 + 8(gap) + ~80(name) + 8(gap) + ~60(amount) + 8(gap) + ~65(two buttons) = ~265px. On 320px with `px-4` (32px) = 288px usable. This is 265/288 = 92% — extremely tight, especially with the amount "GH₵ 120.00" which is 10 chars. Will almost certainly overflow on 320px, causing the approve/reject buttons to be clipped.
- Fix: stack the name+amount row above the action buttons, or use a vertical layout on small screens.

---

### 18. `apps/web/src/app/admin/accounts/page.tsx` — Account Management

**MEDIUM — Account row crowded on 320px with 4 inline elements**
- Row: avatar (36px) + name+type + status badge + action button — similar to verification page but slightly simpler (no double buttons). On 320px this is tight but workable with `truncate` on the name. Acceptable.

---

### 19. `apps/web/src/app/profile/page.tsx` — Profile

**PASS** — Very well structured. `pb-32` to account for MiniPlayer + BottomNav. Avatar image uses `next/image width=80 height=80`. Liked tracks list uses `sizes="44px"` on the cover thumbnail. Playlist grid uses `sizes="(max-width:640px) 50vw, 25vw"`. No critical issues.

**LOW** — Stats grid `grid-cols-3 gap-2` on 320px: each cell is ~89px. Numbers like "4,820" at `text-lg` font will fit but are snug.

---

### 20. `apps/web/src/app/notifications/page.tsx` — Notifications

**PASS** — Notification rows use `flex items-start gap-3` with avatar `w-11 h-11` (44px), which is at the minimum touch-target size. `min-w-0` on text prevents overflow. `pb-24` is correct.

**LOW** — Avatar images use `width={44} height={44}` fixed on `<Image>` — `sizes` prop is missing. Add `sizes="44px"` to prevent browser fetching an unnecessarily large image.

---

### 21. `apps/web/src/app/auth/login/page.tsx` — Login

**PASS** — `max-w-sm` centered card with `px-4 py-12`. Social buttons `flex gap-3` with `flex-1` each — on 320px each button is ~86px which is fine for `text-xs` label.

---

### 22. `apps/web/src/app/auth/register/page.tsx` — Register

**PASS** — Same pattern as login. `max-w-sm`, `px-4`, form fields full-width. `pb-12` gives space.

---

## Shared / Cross-Cutting Issues

### HIGH — `scrollbar-hide` utility is not defined

- Used in: `home/page.tsx`, `search/page.tsx`, `genre/[slug]/page.tsx`
- `globals.css` does not define `.scrollbar-hide`. The class is typically added by `tailwind-scrollbar-hide` plugin or a manual `@layer utilities` block.
- Without it, horizontal scroll containers will show the browser scrollbar, which on mobile looks bad and uses vertical space.
- Fix: add to `globals.css`:
  ```css
  @layer utilities {
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  }
  ```

### HIGH — `TrackCard` uses raw `<img>` instead of `next/image`

- File: `apps/web/src/components/music/TrackCard.tsx`, line:
  `<img src={coverImageUrl} alt={...} className="w-full h-full object-cover" />`
- `next/image` is not used here. This means no automatic responsive resizing, no lazy loading optimization, and potential layout shift (CLS) since there is no explicit size. The `aspect-square` container prevents layout shift, but the image will be fetched at full source resolution on mobile.
- Fix: replace with `<Image src={coverImageUrl} alt={...} fill className="object-cover" sizes="(max-width:640px) 50vw, 160px" />` inside the existing `relative` container.

### MEDIUM — MiniPlayer + BottomNav combined height vs page `pb-` value

- BottomNav: `h-16` = 64px, `fixed bottom-0`
- MiniPlayer: `fixed bottom-16`, height ~56px (10px top+bottom py-2 × 2 + 44px content)
- Combined fixed chrome: **~120px**
- Pages with both need `pb-32` minimum (128px gives 8px breathing room)
- Current `pb-` values by page:
  - `home/page.tsx`: `pb-20` (80px) — **INSUFFICIENT** (missing ~48px)
  - `search/page.tsx`: `pb-36` (144px) — OK
  - `genre/[slug]/page.tsx`: `pb-36` (144px) — OK
  - `artists/[id]/page.tsx`: `pb-36` (144px) — OK
  - `artist/dashboard/page.tsx`: `pb-20` (80px) — **INSUFFICIENT** if MiniPlayer is shown
  - `connect/page.tsx`: `pb-20` (80px) — MiniPlayer not imported here, BottomNav only. 80px - 64px = 16px gap. Acceptable.
  - `profile/page.tsx`: `pb-32` (128px) — OK (barely)

### LOW — BottomNav `md:hidden` means admin/desktop users have no persistent nav on mobile

- BottomNav hides at `md:` breakpoint (768px+). On medium tablets in portrait mode, neither the sidebar nor BottomNav appears. This is a gap between 640px–768px.

---

## Priority Fix List (Ordered by User Impact)

| Priority | Page / Component | Issue | Fix |
|----------|-----------------|-------|-----|
| 1 | `globals.css` | `scrollbar-hide` undefined — horizontal scroll sections show scrollbar | Add CSS utility to globals.css |
| 2 | `TrackCard.tsx` | Raw `<img>` instead of `next/image` — hurts LCP on mobile | Replace with `<Image fill sizes="...">` |
| 3 | `home/page.tsx` | `pb-20` too short when MiniPlayer + BottomNav both visible | Change to `pb-36` |
| 4 | `artist/dashboard/page.tsx` | `pb-20` too short when MiniPlayer could be visible | Change to `pb-32` |
| 5 | `admin/verification/page.tsx` | Payout row overflows at 320px with amount + 2 action buttons | Stack buttons below amount on small screens |
| 6 | `page.tsx` (landing) | Genre grid `grid-cols-4` on mobile: 4 tiny chips with long text | Change to `grid-cols-2 sm:grid-cols-4 md:grid-cols-8` |
| 7 | `artist/upload/page.tsx` | Step labels `hidden sm:block` — mobile users see only icons | Show abbreviated labels or just the active step name |
| 8 | `player/page.tsx` | No bottom padding — content hidden by iOS home indicator | Add `pb-8` or env(safe-area-inset-bottom) |
| 9 | `home/page.tsx` | Featured banner `height: 200` inline px — not responsive | Use `h-48 sm:h-56` or `aspect-video` |
| 10 | `onboarding/page.tsx` | Slide dot buttons only 8×8px tap target | Wrap in `p-3` to expand hit area |
| 11 | `page.tsx` (landing) | Hero `text-5xl` on smallest phones is very large | Use `text-4xl sm:text-5xl md:text-7xl` |
| 12 | `notifications/page.tsx` | Avatar `<Image>` missing `sizes` prop | Add `sizes="44px"` |
| 13 | `artist/lyrics/page.tsx` | `rows={8}` textarea too tall with keyboard open | Reduce to `rows={5}` |
| 14 | `connect/page.tsx` | Long header title "Messaging & Fan Engagement" at 320px | Shorten to "Messaging" or add `truncate` |
| 15 | `artist/dashboard/page.tsx` | 4-col table grid very tight at 320px | Reduce font sizes or simplify layout |

---

## Notes

- **Images**: All pages that use Unsplash images for backgrounds and banners correctly use `next/image` with `fill` and `sizes="100vw"` or appropriate breakpoint values. The only exception is `TrackCard` (item #2 above).
- **Touch targets**: Most interactive elements (buttons, nav items) meet or are close to the 44px minimum. The only clear violation is onboarding slide dots (8px).
- **Horizontal scroll**: The `-mx-4 px-4 overflow-x-auto` pattern for horizontal carousels is used correctly throughout home and genre pages.
- **Bottom nav bottom padding**: The pattern is inconsistently applied — some pages use `pb-20`, some `pb-24`, some `pb-36`. Pages that render MiniPlayer need at least `pb-36`; pages with only BottomNav need at least `pb-20`.
- **Admin pages**: Both admin pages (`admin/page.tsx`, `admin/accounts/page.tsx`) are functionally mobile-compatible with the 2-column grid + card list pattern. The main admin gap is navigation discoverability, not layout.
