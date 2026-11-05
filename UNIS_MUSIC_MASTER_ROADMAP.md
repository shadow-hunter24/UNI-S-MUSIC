# Uni's Music --- Master Development Roadmap

**Document status:** Baseline technical blueprint\
**Version:** 1.0\
**Prepared:** 4 November 2026\
**Product:** Uni's Music\
**Tagline:** Music for Everyone. Opportunities for Artists.

------------------------------------------------------------------------

## 1. Executive summary

Uni's Music is a music-streaming and artist-monetisation platform
inspired by products such as Audiomack, with its own brand, artist
tools, listener experience, community features and revenue model.

The initial product is a responsive web application delivered as a
Progressive Web App (PWA). It should be installable on supported Android
and desktop browsers and usable on iOS through Add to Home Screen. The
architecture should allow future native mobile applications to reuse the
same backend APIs.

The platform must be designed around five outcomes:

1.  Listeners can discover, stream, save and share music reliably,
    including on constrained mobile networks.
2.  Artists can upload and manage music, understand their audience and
    receive transparent, auditable earnings.
3.  Administrators can operate the platform safely, review content,
    handle disputes and manage payouts.
4.  The system protects user privacy, creator rights, payments and
    platform integrity.
5.  The platform can grow incrementally from an early-stage launch to
    millions of registered accounts without an avoidable rewrite.

**Important:** "Millions of users" is a design target, not a claim that
the first deployment will support millions of concurrent listeners.
Capacity must be established through workload modelling, load testing,
monitoring and progressive scaling.

------------------------------------------------------------------------

## 2. Product vision and principles

### 2.1 Vision

Build an inclusive music platform where listeners discover music and
artists can build an audience and earn through transparent, legitimate
opportunities.

### 2.2 Product principles

-   Listener-first: playback, discovery and navigation should be simple
    and dependable.
-   Artist-respecting: creator ownership, credits, analytics and
    earnings must be clear.
-   Mobile-first: optimise for phones, smaller screens, variable
    connectivity and limited data.
-   Accessible by design: target WCAG 2.2 AA for the web experience.
-   Privacy by design: collect the minimum data needed and explain how
    it is used.
-   Secure by default: apply least privilege, secure sessions,
    validation and audit trails.
-   Transparent monetisation: distinguish estimated, approved, payable
    and paid earnings.
-   Incremental architecture: start with a modular monolith and extract
    services only when justified by evidence.
-   Observable operations: important actions, errors, queues, costs and
    service health must be measurable.

### 2.3 Non-goals for the first release

Unless explicitly approved, the first release should not attempt to
build: - Native Android and iOS applications. - A complex recommendation
model or machine-learning platform. - Live audio rooms, livestreaming or
real-time broadcasting. - Cryptocurrency, tokenised royalties or
speculative financial products. - Unlicensed music catalogues or
automated rights clearance. - A microservices architecture with many
independently deployed services.

------------------------------------------------------------------------

## 3. Decisions and provisional defaults

The following product decisions were not confirmed in the planning
discussion. Use these defaults to keep implementation moving, but record
any change in an Architecture Decision Record (ADR).

  -----------------------------------------------------------------------
  Decision                Provisional default     Confirmation required
  ----------------------- ----------------------- -----------------------
  Initial market          Ghana-first, designed   Yes
                          for international       
                          expansion               

  Monetisation            Free, ad-supported      Yes
                          listening first;        
                          premium subscriptions   
                          later                   

  Upload eligibility      Open registration for   Yes
                          listeners; artist       
                          upload subject to       
                          account verification    
                          and rights declarations 

  Infrastructure          Cloudflare for          Yes
                          DNS/CDN/R2 where        
                          suitable; managed       
                          application and         
                          PostgreSQL hosting      

  Launch strategy         MVP first, then phased  Yes
                          expansion               

  Currency                GHS for Ghana-facing    Yes
                          financial displays;     
                          store money as integer  
                          minor units plus ISO    
                          currency code           

  Languages               English first;          Yes
                          architecture should     
                          support localisation    

  Minimum age             Set policy with legal   Yes
                          advice before public    
                          launch; implement       
                          age-appropriate         
                          safeguards              

  Music availability      Territory and rights    Yes
                          restrictions must be    
                          supported in the data   
                          model                   

  Payout provider         Select after            Yes
                          commercial, compliance  
                          and API due diligence   
  -----------------------------------------------------------------------

Do not silently convert provisional defaults into permanent business
policy.

------------------------------------------------------------------------

## 4. Recommended technology stack

### 4.1 Application stack

  -----------------------------------------------------------------------
  Layer                   Recommended technology  Responsibility
  ----------------------- ----------------------- -----------------------
  Web frontend            Next.js, React,         Responsive listener,
                          TypeScript              artist and admin
                                                  interfaces

  UI styling              Tailwind CSS            Design tokens and
                                                  responsive styling

  UI primitives           Accessible component    Consistent,
                          primitives such as      keyboard-accessible
                          Radix UI; shadcn/ui     components
                          patterns where useful   

  Forms and validation    React Hook Form + Zod   Typed client-side forms
                                                  and validation

  Data fetching           TanStack Query where    Caching, retries and
                          client-side server      invalidation
                          state is needed         

  Backend                 NestJS + TypeScript     Modular API and
                                                  business rules

  API contract            REST with OpenAPI       Versioned, documented
                                                  API

  Primary database        PostgreSQL              Transactional system of
                                                  record

  ORM                     Prisma                  Schema, migrations and
                                                  typed database access

  Cache and queues        Redis + BullMQ          Caching, rate-limit
                                                  support and background
                                                  jobs

  Object storage          Cloudflare R2 or        Audio masters,
                          equivalent              renditions, artwork and
                          S3-compatible object    exports
                          storage                 

  Audio processing        FFmpeg in isolated      Validation, probing,
                          workers                 transcoding and
                                                  waveform generation

  Media delivery          CDN; progressive        Reliable global media
                          delivery initially, HLS delivery
                          when justified          

  Search                  PostgreSQL full-text    Track, artist, album
                          initially; Meilisearch  and playlist search
                          or OpenSearch when      
                          needed                  

  Analytics               Start with PostgreSQL   Product and streaming
                          aggregates or a managed analytics
                          analytics pipeline;     
                          ClickHouse at higher    
                          event volume            

  Testing                 Vitest/Jest, Supertest, Unit, integration and
                          Playwright              end-to-end tests

  Observability           Structured logs,        Operational visibility
                          metrics, tracing and    
                          error monitoring        

  CI/CD                   GitHub Actions          Automated checks and
                                                  deployment

  Package manager         pnpm workspaces         Monorepo dependency
                                                  management
  -----------------------------------------------------------------------

### 4.2 Architecture guidance

Start with a **modular monolith** in NestJS. Keep modules independent at
the code and domain level, but deploy one API application initially. Run
background workers separately so audio processing and long-running tasks
do not block web requests.

Do not introduce microservices merely because the platform is intended
to scale. Extract a module only when there is a demonstrated need for
independent scaling, deployment, ownership or fault isolation.

### 4.3 Version policy

Use currently supported stable releases at project initialization. Pin
versions through the package manager lockfile. Review framework and
runtime support before upgrades. Do not use unpinned "latest"
dependencies in production builds.

------------------------------------------------------------------------

## 5. High-level system architecture

``` text
Listener PWA       Artist Portal       Admin Portal
      \                 |                 /
       \                |                /
            HTTPS / CDN / WAF
                    |
              Next.js Web App
                    |
             Versioned REST API
                    |
                NestJS API
                    |
  ------------------------------------------------
  | Identity | Catalogue | Artist | Playlists     |
  | Streaming | Payments | Ads | Moderation       |
  | Messaging | Notifications | Administration   |
  ------------------------------------------------
       |          |          |          |
   PostgreSQL   Redis     Object      Analytics
                         Storage      Pipeline
                            |
                      Audio Workers
                         FFmpeg
                            |
                    Processed Renditions
                            |
                       CDN / HLS
                            |
                         Listener
```

### 5.1 Main request paths

**Normal application request** 1. Browser requests the Next.js
application. 2. The application calls the versioned NestJS API. 3. The
API authenticates and authorises the request. 4. The API reads or
updates PostgreSQL, using Redis where appropriate. 5. The API returns a
typed response.

**Audio upload** 1. Artist requests an upload session. 2. API verifies
the artist's permissions, quota and upload policy. 3. API creates an
upload record and returns a short-lived signed upload URL. 4. Browser
uploads directly to object storage. 5. Storage event or verified
completion callback enqueues a processing job. 6. Worker probes and
processes the file in an isolated environment. 7. Worker stores
renditions and metadata. 8. API updates the track state and makes it
available for review or publication.

**Audio playback** 1. Listener requests playback authorisation for a
published track. 2. API checks availability, territory, account
restrictions and any applicable access rules. 3. API returns a
short-lived media URL or manifest URL. 4. Client streams from the
CDN/object-storage delivery path, not through the NestJS API. 5. Client
sends playback telemetry; the server validates events before they affect
analytics or earnings.

------------------------------------------------------------------------

## 6. Monorepo structure

Recommended initial structure:

``` text
unis-music/
├── apps/
│   ├── web/                     # Next.js PWA
│   ├── api/                     # NestJS REST API
│   └── worker/                  # BullMQ workers and FFmpeg jobs
├── packages/
│   ├── database/                # Prisma schema, migrations, seed scripts
│   ├── contracts/               # Shared API types and schemas
│   ├── validation/              # Shared Zod schemas where appropriate
│   ├── ui/                      # Shared design system components
│   ├── config/                  # Shared lint, TypeScript and tooling config
│   └── test-utils/              # Shared test helpers
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

Keep secrets out of source control. Commit `.env.example` with variable
names and safe placeholders only.

------------------------------------------------------------------------

## 7. Functional requirements and modules

### 7.1 Listener experience

**MVP** - Landing, onboarding and account registration. - Login, logout,
password reset and account recovery. - Home feed with curated or
editorial sections. - Browse genres and categories. - Search tracks,
artists and albums. - Track detail and artist profile pages. - Audio
player with play, pause, seek, next and previous. - Queue, shuffle and
repeat. - Like/save tracks. - Follow artists. - Create, edit and delete
personal playlists. - Recently played and listening history, with
privacy controls. - Share public track and artist links. - Responsive
navigation and persistent mini-player.

**Later** - Personalised recommendations. - Collaborative playlists. -
Offline listening, only after licensing and platform limitations are
addressed. - Premium listening features. - Rich social features.

### 7.2 Artist portal

**MVP** - Apply for or enable an artist profile. - Artist profile,
biography, image and links. - Upload single tracks. - Enter title,
description, genre, language, release date and explicit-content flag. -
Add featured artists, producers, songwriters and composers. - Declare
ownership or authority to distribute. - Save drafts. - View upload and
moderation status. - Edit metadata subject to publication rules. - View
basic track-level listening statistics.

**Later** - Albums and EPs. - Scheduled releases. - Lyrics and timed
lyrics. - Advanced analytics and audience insights. - Artist
verification badge. - Promotion campaigns. - Messaging and fan
engagement. - Downloadable statements and tax documents where
applicable.

### 7.3 Music catalogue and moderation

Track states should be explicit, for example:

``` text
DRAFT
UPLOADING
PROCESSING
PROCESSING_FAILED
PENDING_REVIEW
REJECTED
SCHEDULED
PUBLISHED
TAKEN_DOWN
ARCHIVED
```

Requirements: - Validate file extension, actual media signature,
duration and size. - Never trust client-supplied MIME type alone. - Scan
uploads where supported. - Run FFmpeg in a sandboxed worker with CPU,
memory, time and file-size limits. - Preserve an original master where
storage policy and rights permit. - Record processing versions and
failures. - Keep a moderation reason and decision history. - Provide an
appeal or dispute route. - Support takedown and territory restrictions.

### 7.4 Search and discovery

MVP search should support: - Track title. - Artist name. - Album title
when albums are implemented. - Genre. - Prefix and typo tolerance where
supported by the selected search engine.

Do not expose private, rejected or unpublished catalogue records through
public search.

### 7.5 Social and messaging

Defer direct messaging until the platform has reporting, blocking, abuse
handling, rate limits and moderation workflows. For an initial release,
artist follows, likes, playlists and sharing are safer and easier to
operate.

When messaging is introduced: - Only authenticated users can send
messages. - Provide block, report and mute controls. - Rate-limit new
conversations and message sending. - Define retention and deletion
rules. - Protect minors and vulnerable users through a reviewed safety
policy. - Do not promise end-to-end encryption unless it is actually
implemented and independently reviewed.

### 7.6 Administration

-   Role-based admin access.
-   User and artist account lookup.
-   Artist application review.
-   Track moderation queue.
-   Copyright complaint queue.
-   Reports and appeals.
-   Payout review and approval.
-   Advertisement review.
-   Account suspension and reinstatement.
-   Audit log viewer.
-   Operational dashboard for failed jobs and service health.

Require MFA for privileged accounts. Separate support, moderator,
finance and super-admin permissions.

------------------------------------------------------------------------

## 8. Database architecture

PostgreSQL is the primary transactional database. It stores application
records and financial ledgers, not audio binaries.

### 8.1 Core entities

  -----------------------------------------------------------------------
  Domain                              Suggested tables
  ----------------------------------- -----------------------------------
  Identity                            users, user_profiles, sessions,
                                      roles, user_roles, auth_events

  Artist                              artist_profiles, artist_members,
                                      artist_verifications

  Catalogue                           tracks, albums, album_tracks,
                                      genres, track_genres, track_credits

  Media                               media_assets, audio_renditions,
                                      upload_sessions, processing_jobs

  Engagement                          follows, likes, playlists,
                                      playlist_tracks, comments

  Playback                            playback_sessions,
                                      listening_events,
                                      playback_quality_events

  Monetisation                        royalty_rules,
                                      royalty_ledger_entries,
                                      artist_balances, payout_requests

  Payments                            payment_accounts,
                                      payment_transactions,
                                      payment_webhook_events

  Advertising                         ad_campaigns, advertisements,
                                      ad_impressions, ad_events

  Trust and safety                    reports, moderation_cases,
                                      moderation_actions,
                                      copyright_claims

  Communication                       notifications,
                                      notification_preferences,
                                      conversations, messages

  Governance                          consent_records, privacy_requests,
                                      audit_logs
  -----------------------------------------------------------------------

### 8.2 Data modelling rules

-   Use UUID primary keys for externally referenced entities.
-   Use `timestamptz` for timestamps and store in UTC.
-   Store money as integer minor units plus an ISO 4217 currency code;
    never use floating-point types for money.
-   Use explicit status enums or constrained status fields.
-   Add `created_at` and `updated_at` where appropriate.
-   Use foreign keys and appropriate unique constraints.
-   Define deletion and retention behaviour for each sensitive entity.
-   Avoid storing unnecessary personal data.
-   Use separate tables for authentication secrets and public profile
    information.
-   Never store raw card data, payment PINs or provider secret
    credentials.

### 8.3 Important indexes

Plan indexes based on real query patterns and confirm them with
`EXPLAIN ANALYZE`. Likely candidates include: - Unique user
email/normalised username. - Track status + release date. - Track artist
ID + publication state. - Track genre relationship. - Playlist owner +
updated date. - Follow target and follower IDs. - Listening event
user/track/time access patterns. - Payout status + created date. -
Payment provider reference with a unique constraint. - Moderation
status + created date.

Do not create every possible index automatically; indexes add write and
storage cost.

### 8.4 Scale strategy

1.  Begin with a managed PostgreSQL instance and connection pooling.
2.  Monitor query latency, locks, connections, storage and replication.
3.  Add indexes and improve queries before scaling hardware.
4.  Add read replicas for read-heavy workloads when justified.
5.  Partition high-volume event tables by time after measuring volume
    and query patterns.
6.  Move analytical workloads to a separate analytics store when they
    burden transactional operations.
7.  Use Redis for short-lived cache data, not as the only source of
    truth.
8.  Test backup restoration and point-in-time recovery.

------------------------------------------------------------------------

## 9. Audio pipeline and streaming

### 9.1 Upload policy

Set explicit limits before launch: - Allowed input formats. - Maximum
upload size. - Maximum duration. - Minimum/maximum sample rate and
channel policy. - Artist storage quota. - Concurrent upload limit. -
Upload expiry and abandoned-upload cleanup.

Accept only formats that the processing pipeline can safely inspect and
decode. Do not trust file names or browser MIME headers.

### 9.2 Processing workflow

1.  Create upload record.
2.  Upload to a private quarantine bucket or prefix.
3.  Verify object size and checksum.
4.  Probe media using FFprobe.
5.  Validate codec, duration and media structure.
6.  Run malware/content scanning where available.
7.  Transcode to approved renditions.
8.  Generate waveform or preview data if needed.
9.  Store rendition metadata and checksums.
10. Move media to the publishable storage location after validation.
11. Update track state and notify the artist.

### 9.3 Audio quality and delivery

Possible initial renditions: - 64 kbps for low-data playback. - 128 kbps
standard. - 256 kbps high quality.

These are planning values, not mandatory formats. Choose codec,
container and bitrate after device/browser compatibility tests and
listening-quality evaluation. Avoid unnecessary transcoding that
degrades quality.

Start with progressive audio delivery if it meets product requirements.
Add HLS adaptive bitrate delivery when the expected benefit justifies
the added processing, storage and player complexity. HLS renditions and
manifests must be tested on target browsers and devices.

### 9.4 Playback authorisation

-   Use short-lived signed URLs or signed cookies where appropriate.
-   Do not expose storage credentials.
-   Check track publication and territory rules before issuing playback
    access.
-   Avoid placing long-lived private object URLs in public pages.
-   Ensure CDN cache policy does not leak private or restricted content.
-   Recognise that signed URLs are access controls, not complete DRM.
-   Do not promise that browser playback can prevent all copying or
    recording.

### 9.5 Playback analytics integrity

A client-side "play" event is not proof of a legitimate stream. Define a
server-verifiable listening-event policy before royalties depend on
plays. Consider minimum listen duration, duplicate suppression, bot
signals, suspicious device/account patterns and review procedures.
Publish the policy in understandable language and provide a dispute
process.

------------------------------------------------------------------------

## 10. Payments, artist earnings and monetisation

### 10.1 Financial architecture

Use an append-only, auditable ledger for financial events. Avoid editing
an artist's balance directly as the primary accounting mechanism.

Separate: - Estimated earnings. - Validated earnings. - Approved payable
balance. - Pending payout. - Completed payout. - Reversed or disputed
amounts.

Every ledger entry should reference its source event, currency, amount,
rule version and timestamp.

### 10.2 Payment controls

-   Use established payment providers and their hosted or tokenised
    payment flows.
-   Verify webhook signatures.
-   Make webhook processing idempotent.
-   Store provider references and event payloads only as needed and with
    appropriate protection.
-   Reconcile provider settlements against internal records.
-   Require additional approval for high-value or unusual payouts.
-   Keep a clear audit trail for finance actions.
-   Never collect or store Mobile Money PINs.

### 10.3 Royalty policy

Before paying artists, define: - Which plays qualify. - How advertising
or subscription revenue is allocated. - Platform fees and deductions. -
Collaborator splits. - Currency conversion rules. - Taxes and
withholding where applicable. - Minimum payout threshold. - Payout
schedule. - Refunds, fraud adjustments and disputes. - Treatment of
removed or disputed tracks.

Do not advertise guaranteed earnings or fixed per-stream rates unless
the business model and contractual obligations support them.

### 10.4 Monetisation rollout

Recommended order: 1. Launch free streaming and establish rights and
operating costs. 2. Introduce clearly labelled sponsored placements. 3.
Validate advertising reporting and revenue reconciliation. 4. Introduce
artist earnings only when the royalty policy and funding source are
operational. 5. Add premium subscriptions after payment, entitlement and
customer-support processes are ready.

------------------------------------------------------------------------

## 11. PWA and mobile experience

### 11.1 PWA requirements

-   Web App Manifest with name, short name, icons, theme colour and
    standalone display.
-   Valid HTTPS deployment.
-   Service worker with a deliberate caching strategy.
-   Install guidance appropriate to each browser.
-   App-shell caching.
-   Offline fallback page.
-   Update notification and safe service-worker activation.
-   Responsive layouts and touch-friendly controls.
-   Push notifications only after permission and preference flows are
    implemented.

### 11.2 Installation expectations

-   Supported Android browsers may offer an install prompt when PWA
    criteria are met.
-   Desktop installation depends on browser and operating system
    support.
-   On iOS, provide clear instructions for Safari's Share \> Add to Home
    Screen flow; do not promise a universal one-tap install prompt.

### 11.3 Offline and caching rules

Cache static assets and non-sensitive app-shell resources. Do not cache
private account pages, payment responses or sensitive API data
indiscriminately. Offline music downloads require separate licensing,
encryption/access-control design and platform-specific feasibility work.

### 11.4 Playback behaviour

Test: - Background playback on supported browsers. - Media Session API
integration where supported. - Lock-screen controls where supported. -
Audio focus and interruption handling. - Bluetooth headset controls. -
Network switching. - Incoming call interruption. - Battery and memory
use. - Behaviour when the PWA is closed or suspended.

Document browser-specific limitations rather than promising identical
behaviour across every device.

------------------------------------------------------------------------

## 12. HCI, visual design and accessibility

The supplied brand reference uses a dark purple/black visual direction
with bright violet accents. Preserve the identity while ensuring
contrast and readability.

### 12.1 Design system

Define tokens for: - Brand purple and accent violet. - Background and
surface levels. - Primary and secondary text. - Success, warning, error
and information states. - Spacing scale. - Typography scale. - Border
radius and elevation. - Focus rings and disabled states.

Use colour plus text/icon labels for statuses; never communicate meaning
through colour alone.

### 12.2 HCI requirements

  -----------------------------------------------------------------------
  Principle                           Product implementation
  ----------------------------------- -----------------------------------
  Visibility of system status         Upload, processing, playback and
                                      payment progress

  Match to real-world language        Familiar terms such as Play, Queue,
                                      Artist and Earnings

  User control and freedom            Cancel, undo where safe, pause,
                                      skip and manage preferences

  Consistency                         Reusable navigation, controls and
                                      visual patterns

  Error prevention                    Validation, confirmation for
                                      irreversible actions

  Recognition over recall             Recent tracks, saved playlists and
                                      clear labels

  Flexibility and efficiency          Search, keyboard shortcuts where
                                      useful, sensible defaults

  Minimalist design                   Prioritise listening and discovery;
                                      avoid clutter

  Error recovery                      Explain errors and give a useful
                                      next action

  Help and documentation              Contextual help for uploads,
                                      royalties and account settings
  -----------------------------------------------------------------------

### 12.3 WCAG 2.2 AA checklist

-   Keyboard access to all functionality.
-   Visible focus indicator.
-   Correct semantic headings and landmarks.
-   Accessible names for icon-only controls.
-   Sufficient text and non-text contrast.
-   Text resizing and zoom support.
-   Form labels and useful error descriptions.
-   Screen-reader announcements for asynchronous status.
-   Touch targets sized appropriately.
-   Reduced-motion support.
-   Captions/transcripts for relevant spoken or promotional media.
-   No autoplay with unexpected sound.
-   Accessible authentication and recovery.

### 12.4 Usability testing

Test with representative listeners and artists, including people
using: - Low-cost Android phones. - Small screens. - Screen readers. -
Keyboard-only navigation. - Slow or unstable mobile data. - Limited
digital literacy.

Observe task completion, errors, time on task and user understanding. Do
not rely only on developer opinion.

------------------------------------------------------------------------

## 13. Privacy, security, ethics and Ghana-specific governance

This section is a product and engineering checklist, not legal advice.
Obtain Ghanaian legal and regulatory review before public launch,
especially for music licensing, payments, privacy and minors.

### 13.1 Privacy

-   Map personal data collected, its purpose, legal basis and retention
    period.
-   Publish a clear privacy notice.
-   Obtain and record consent where consent is the appropriate legal
    basis.
-   Provide processes for access, correction, deletion and other
    applicable data-subject rights.
-   Minimise analytics and advertising data.
-   Avoid collecting precise location unless essential and justified.
-   Define retention and deletion schedules.
-   Review third-party processors and cross-border data transfers.
-   Protect backups and exported reports.
-   Assess applicable Data Protection Commission registration and
    compliance requirements under Ghana's Data Protection Act, 2012 (Act
    843).

### 13.2 Security baseline

Use OWASP ASVS as a verification reference and OWASP Top 10 as an
awareness checklist.

-   HTTPS everywhere.
-   Secure, HttpOnly and appropriate SameSite cookies.
-   CSRF protection where cookie-based authentication requires it.
-   Password hashing with a modern password-hashing algorithm such as
    Argon2id.
-   MFA for administrators and finance roles.
-   Role-based access control and least privilege.
-   Server-side validation and output encoding.
-   Parameterised database access.
-   Rate limiting and abuse detection.
-   Secure password reset and email verification.
-   Secrets manager or protected deployment secrets.
-   Dependency and container scanning.
-   Upload isolation and FFmpeg sandboxing.
-   Audit logs for privileged and financial actions.
-   Tested backups and recovery.
-   Security incident response plan.
-   Regular penetration testing before major public launch.

Never log passwords, access tokens, payment credentials or unnecessary
personal data.

### 13.3 Copyright and creator rights

Before an artist can publish, require a clear declaration that they own
or are authorised to distribute the recording and associated artwork.
This declaration does not replace actual licensing verification.

Implement: - Copyright policy and complaint process. - Takedown and
counter-notice/appeal workflow reviewed by counsel. - Rights and
territory metadata. - Collaborator and contributor credits. - Evidence
and decision history. - Repeat-infringer policy consistent with
applicable law. - Procedures for disputed ownership and royalty holds. -
Clear artist terms defining the licence granted to the platform.

Review Ghana's Copyright Act, 2005 (Act 690), as amended, and any
applicable collective management, neighbouring-rights and international
licensing obligations.

### 13.4 Payments and financial regulation

Assess provider terms and applicable Bank of Ghana requirements. Use
appropriately authorised payment providers. Obtain legal/accounting
advice on payment facilitation, artist payouts, tax, withholding and
reporting obligations.

### 13.5 Ethical product rules

-   Clearly label paid promotions and sponsored tracks.
-   Explain major factors influencing recommendations.
-   Give users meaningful controls over personalisation.
-   Do not sell or expose private listening histories without a valid
    legal basis and transparent disclosure.
-   Do not manipulate artists with misleading earnings dashboards.
-   Provide understandable reasons for moderation decisions.
-   Provide an appeal process.
-   Monitor recommendation and moderation outcomes for unfair patterns.
-   Design safety and age protections before enabling unrestricted
    messaging.

------------------------------------------------------------------------

## 14. API design conventions

Use a versioned REST API, initially under `/api/v1`.

Example endpoint groups:

  --------------------------------------------------------------------------------
  Area                                Example routes
  ----------------------------------- --------------------------------------------
  Authentication                      `POST /api/v1/auth/register`,
                                      `POST /api/v1/auth/login`,
                                      `POST /api/v1/auth/logout`

  Users                               `GET /api/v1/users/me`,
                                      `PATCH /api/v1/users/me`

  Artists                             `POST /api/v1/artists/apply`,
                                      `GET /api/v1/artists/:id`

  Tracks                              `GET /api/v1/tracks`,
                                      `GET /api/v1/tracks/:id`

  Uploads                             `POST /api/v1/uploads`,
                                      `POST /api/v1/uploads/:id/complete`

  Playlists                           `POST /api/v1/playlists`,
                                      `GET /api/v1/playlists/:id`

  Follows                             `POST /api/v1/artists/:id/follow`,
                                      `DELETE /api/v1/artists/:id/follow`

  Playback                            `POST /api/v1/tracks/:id/playback-session`

  Analytics                           `GET /api/v1/artists/me/analytics`

  Payouts                             `GET /api/v1/artists/me/earnings`,
                                      `POST /api/v1/payout-requests`

  Moderation                          `GET /api/v1/admin/moderation/tracks`
  --------------------------------------------------------------------------------

These are examples, not a final API contract. Document request/response
schemas, authentication, permissions, pagination, errors and rate limits
in OpenAPI.

### API conventions

-   Use consistent JSON response shapes.
-   Use cursor pagination for large or frequently changing collections
    where appropriate.
-   Validate all inputs on the server.
-   Use idempotency keys for financial and other retry-sensitive
    operations.
-   Return safe error messages without leaking internal details.
-   Add correlation/request IDs.
-   Apply rate limits by route and risk.
-   Maintain backward compatibility or version changes deliberately.

------------------------------------------------------------------------

## 15. HCI-informed screen inventory

Use the supplied 22-screen reference as inspiration, not as a rigid
specification. Consolidate duplicate and overlapping screens into
coherent user journeys.

### Public and listener screens

1.  Landing / splash.
2.  Onboarding.
3.  Registration.
4.  Login and account recovery.
5.  Home.
6.  Search.
7.  Genres and browse.
8.  Artist profile.
9.  Full music player.
10. Library and playlists.
11. Track and album detail.
12. Listener profile and settings.

### Artist screens

13. Artist application and verification.
14. Artist dashboard.
15. Upload wizard.
16. Credits and featured artists.
17. Lyrics editor.
18. Release management.
19. Analytics.
20. Earnings and payout history.
21. Promotion campaign management.

### Administration screens

22. Admin overview.
23. User and artist management.
24. Track moderation.
25. Verification review.
26. Payout review.
27. Copyright complaints and appeals.
28. Advertising review.
29. Audit logs and platform settings.

Each screen specification must define: - User goal. - Entry point and
navigation. - Primary and secondary actions. - Data required. - Loading,
empty, error and success states. - Permission rules. - Responsive
behaviour. - Keyboard and screen-reader behaviour. - Analytics events,
if justified.

------------------------------------------------------------------------

## 16. Development phases and acceptance criteria

### Phase 0 --- Product and architecture decisions

Deliverables: - Confirm target market, revenue model and upload
policy. - Confirm MVP scope. - Architecture Decision Records. - Threat
model and data inventory. - Initial user journeys and screen
inventory. - Initial cost model and capacity assumptions.

Exit criteria: - Product owner approves scope. - Key legal and rights
questions have owners. - Technical architecture and environments are
documented.

### Phase 1 --- Repository and foundation

Deliverables: - Git repository and pnpm monorepo. - Next.js
application. - NestJS application. - PostgreSQL and Prisma. - Redis. -
Docker-based local development. - CI checks for lint, typecheck and
tests. - Design tokens and responsive application shell.

Exit criteria: - A developer can clone the repository and run the
documented setup. - CI passes on a clean commit. - Database migration
and seed process work. - No secrets are committed.

### Phase 2 --- Identity and access

Deliverables: - Registration, login, logout and recovery. - Email
verification. - Session management. - User, artist, moderator, finance
and admin permissions. - Profile management. - Admin MFA.

Exit criteria: - Automated tests cover authentication and role
boundaries. - Users cannot access another user's private resources. -
Privileged actions are audited.

### Phase 3 --- Catalogue and listener MVP

Deliverables: - Genres. - Artist profiles. - Track catalogue. - Home and
browse. - Search. - Track details. - Likes, follows and playlists.

Exit criteria: - Public catalogue only exposes published and available
content. - Pagination and indexes are tested. - Main journeys work on
mobile and desktop.

### Phase 4 --- Upload and streaming MVP

Deliverables: - Signed direct uploads. - Quarantine and validation. -
FFmpeg processing worker. - Audio renditions. - Playback
authorisation. - CDN delivery. - Persistent player and queue. - Basic
playback analytics.

Exit criteria: - Malformed and oversized uploads are rejected safely. -
Worker failure can be retried without duplicate publication. - Playback
works on target browsers and devices. - API servers do not proxy audio
bytes. - Storage and delivery costs are measurable.

### Phase 5 --- Moderation and artist tools

Deliverables: - Track review queue. - Rejection reasons and appeals. -
Artist dashboard. - Upload history. - Credits and metadata management. -
Basic analytics.

Exit criteria: - Every moderation action has an actor, timestamp and
reason. - Artists can understand track status. - Unpublished tracks
remain inaccessible to unauthorised users.

### Phase 6 --- Monetisation

Deliverables: - Ad campaign model and sponsored placement labelling. -
Validated listening-event rules. - Royalty ledger. - Earnings
statements. - Payment provider integration. - Webhook verification and
reconciliation. - Payout approval workflow.

Exit criteria: - Financial calculations are deterministic and tested. -
Duplicate webhooks cannot create duplicate credits. - Payouts are
auditable and permission-controlled. - Terms, fee rules and payout
policy are published and approved.

### Phase 7 --- Community and expansion

Deliverables: - Comments and reporting. - Notifications. - Messaging
only after safety controls are ready. - Premium subscriptions if
approved. - Improved recommendations. - Additional territories and
localisation.

Exit criteria: - Abuse reporting and blocking work. - Notification
preferences are respected. - Recommendation and advertising disclosures
are available.

### Phase 8 --- Production readiness

Deliverables: - Load and stress testing. - Security assessment. -
Accessibility audit. - Backup restore drill. - Incident response
runbook. - Monitoring and alerting. - Privacy and legal review. -
Production deployment and rollback plan.

Exit criteria: - Agreed performance SLOs are met under tested
workloads. - Critical/high security findings are resolved or formally
risk-accepted. - Backup restoration is demonstrated. - Operational
owners and escalation procedures are documented.

------------------------------------------------------------------------

## 17. Testing strategy

### Unit tests

Test business rules, validators, royalty calculations, permissions and
state transitions.

### Integration tests

Test PostgreSQL transactions, Redis queues, object-storage interactions,
webhook processing and API permissions.

### End-to-end tests

Use Playwright for: - Registration and login. - Search and playback. -
Playlist creation. - Artist upload journey. - Moderation workflow. -
Payout request journey.

### Media tests

Maintain a safe test corpus containing valid, malformed, oversized and
unusual media files. Test FFmpeg timeouts, corrupted inputs, retry
behaviour and worker isolation.

### Accessibility tests

Combine automated checks with manual keyboard and screen-reader testing.
Automated scans alone do not prove WCAG conformance.

### Performance tests

Model distinct workloads: - Registered users browsing. - Concurrent
playback sessions. - Search traffic. - Artist uploads. - Playback event
ingestion. - Admin reporting. - Peak release-day traffic.

Measure API latency, error rate, queue delay, stream startup time,
buffering, database saturation and cost per listening hour.

------------------------------------------------------------------------

## 18. Observability, reliability and operations

Track: - API request rate, latency and error rate. - Database query
latency, connections, locks and storage. - Redis memory, hit rate and
queue depth. - Upload success/failure rate. - Processing duration and
worker failure rate. - Playback start success and time to first audio. -
Buffering and playback errors. - CDN cache behaviour and media delivery
cost. - Payment webhook failures and reconciliation differences. -
Suspicious play and account activity.

Define service-level objectives only after establishing realistic
baselines. Create alerts for user-impacting failures, not every
transient warning.

Operational runbooks should cover: - Database outage. - Storage or CDN
outage. - Audio processing backlog. - Compromised administrator
account. - Payment provider outage. - Copyright takedown escalation. -
Suspected data breach. - Failed deployment and rollback.

------------------------------------------------------------------------

## 19. Cost and capacity planning

Do not choose infrastructure based only on registered-user counts. The
most important drivers include: - Monthly active listeners. - Concurrent
streams at peak. - Average listening hours per listener. - Average
delivered bitrate. - Audio catalogue size and number of renditions. -
Upload volume. - CDN cache hit ratio. - Analytics event volume. -
Retention and backup requirements.

Use this simple estimate for delivered audio data:

`GB delivered ≈ bitrate_kbps × listening_seconds ÷ 8 ÷ 1,000,000`

This is an approximate decimal-GB calculation and excludes protocol
overhead and retries.

Before public launch, build a cost model for: - Object storage. -
CDN/media delivery. - Transcoding compute. - Database. - Redis. -
Search. - Analytics. - Email/SMS/push. - Payment provider fees. -
Monitoring and backups.

Set usage alerts and quotas. Protect the platform against automated
scraping, hotlinking and uncontrolled media egress.

------------------------------------------------------------------------

## 20. Kiro IDE execution instructions

Kiro should treat this document as the governing project specification.

### 20.1 Working rules for Kiro

1.  Read this roadmap and the relevant documents under `docs/` before
    implementing a phase.
2.  Do not implement all phases in one generation.
3.  Work in small, reviewable milestones.
4.  Before coding a milestone, state the files to be created or changed
    and the acceptance criteria being addressed.
5.  Preserve existing working functionality.
6.  Do not invent API contracts or database fields without documenting
    the decision.
7.  Use migrations for database changes; never silently alter production
    data.
8.  Add tests with each feature.
9.  Run lint, typecheck and relevant tests before declaring a milestone
    complete.
10. Report commands run and actual results. Never claim tests passed if
    they were not run.
11. Keep secrets in environment variables or a secrets manager.
12. Update documentation and the project checklist after each completed
    milestone.
13. Ask before introducing a paid service, irreversible data migration
    or material scope change.
14. Use accessible components and follow the design system.
15. Treat uploaded audio, metadata, lyrics, artwork and user-generated
    content as untrusted input.

### 20.2 First Kiro task

Start with Phase 0 and Phase 1 only.

Ask Kiro to: - Inspect the current workspace before changing anything. -
Report whether it is empty or contains an existing project. - Propose
the exact monorepo setup. - Create the initial documentation and
architecture decisions. - Scaffold the Next.js, NestJS and worker
applications. - Configure PostgreSQL, Prisma and Redis for local
development. - Add health-check endpoints. - Add lint, typecheck and
test scripts. - Write clear setup instructions. - Run the available
checks and report their real output.

Do not start music uploads, payments or royalty calculations until the
foundation and security boundaries are established.

------------------------------------------------------------------------

## 21. Initial environment variable template

Create `.env.example` with placeholders only. The exact variables depend
on the selected providers.

``` dotenv
NODE_ENV=development

WEB_URL=http://localhost:3000
API_URL=http://localhost:4000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unis_music
REDIS_URL=redis://localhost:6379

SESSION_SECRET=replace_with_a_long_random_secret

S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

MEDIA_PUBLIC_BASE_URL=

EMAIL_PROVIDER=
EMAIL_FROM=

PAYMENT_PROVIDER=
PAYMENT_WEBHOOK_SECRET=

LOG_LEVEL=debug
```

Never commit real credentials. Use different credentials and storage
buckets for development, staging and production. Validate required
variables at application startup and fail safely when production secrets
are missing.

------------------------------------------------------------------------

## 22. Definition of done

A feature is not complete merely because its screen looks correct.

A feature is done only when: - Requirements and permissions are
documented. - UI works at supported screen sizes. - Loading, empty,
error and success states exist. - Server-side validation is
implemented. - Authentication and authorisation are tested. - Relevant
automated tests pass. - Accessibility has been checked. - Sensitive
actions are logged appropriately. - Documentation is updated. -
Monitoring and failure handling exist where needed. - The change has
been reviewed and merged.

------------------------------------------------------------------------

## 23. Immediate action checklist

Use this checklist to start the project:

-   [ ] Confirm the five provisional product decisions in Section 3.
-   [ ] Create the GitHub repository `unis-music`.
-   [ ] Open the repository in Kiro IDE.
-   [ ] Save this document as `UNIS_MUSIC_MASTER_ROADMAP.md` at the
    repository root.
-   [ ] Create `docs/architecture/` and `docs/adr/`.
-   [ ] Write ADR-001: modular monolith and monorepo.
-   [ ] Write ADR-002: PostgreSQL as the transactional source of truth.
-   [ ] Write ADR-003: object storage and CDN for audio delivery.
-   [ ] Scaffold Next.js, NestJS and the worker.
-   [ ] Configure local PostgreSQL and Redis.
-   [ ] Add CI for lint, typecheck and tests.
-   [ ] Demonstrate a clean local setup before implementing product
    features.

**First milestone:** A developer can clone Uni's Music, install
dependencies, start the local services, run database migrations, launch
the web and API applications, and pass the initial automated checks.

------------------------------------------------------------------------

## 24. Reference material to verify during implementation

Use current official documentation and review version compatibility
before implementation:

-   Next.js: https://nextjs.org/docs
-   React: https://react.dev
-   NestJS: https://docs.nestjs.com
-   PostgreSQL: https://www.postgresql.org/docs/
-   Prisma: https://www.prisma.io/docs
-   Redis: https://redis.io/docs/
-   BullMQ: https://docs.bullmq.io/
-   Cloudflare R2: https://developers.cloudflare.com/r2/
-   Cloudflare caching: https://developers.cloudflare.com/cache/
-   FFmpeg: https://ffmpeg.org/documentation.html
-   MDN PWA: https://developer.mozilla.org/docs/Web/Progressive_web_apps
-   WCAG 2.2: https://www.w3.org/TR/WCAG22/
-   OWASP ASVS:
    https://owasp.org/www-project-application-security-verification-standard/
-   Ghana Data Protection Commission: https://dataprotection.org.gh/
-   Ghana Copyright Office: https://www.copyright.gov.gh/
-   Bank of Ghana: https://www.bog.gov.gh/

Review current law, provider terms and technical documentation rather
than treating this roadmap as a substitute for legal or security review.

------------------------------------------------------------------------

**End of master roadmap.**

**Guiding principle:** Build a trustworthy music ecosystem first. Scale
the infrastructure as real listener, artist and media-delivery workloads
demonstrate the need.
