# ADR-003: S3-Compatible Object Storage and CDN for Audio Delivery

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-04 |
| **Deciders** | Engineering lead, product owner |
| **Supersedes** | — |
| **Superseded by** | — |

---

## Context

Uni's Music needs to store and deliver audio files: uploaded masters (potentially hundreds of megabytes each), transcoded renditions (multiple bitrates per track), cover artwork, waveform data, and export artefacts. Several design questions were in scope:

1. **Where do audio files live?** Options: PostgreSQL large objects (inappropriate), a self-hosted file server (operational burden), an S3-compatible object storage service.
2. **How are files delivered to listeners?** Options: proxy bytes through the NestJS API, or serve directly from object storage / CDN with signed URLs.
3. **Where does audio processing run?** Options: inline in the NestJS API request handler, or in an isolated worker process.
4. **What delivery format?** Options: progressive download, HLS adaptive bitrate, DASH.

---

## Decision

### Object storage: S3-compatible service (Cloudflare R2 preferred)

All audio masters, renditions, artwork, waveform data, and exports are stored in an S3-compatible object storage service. **Cloudflare R2** is the preferred provider because:
- No egress fees for data delivered through Cloudflare's CDN.
- Native integration with Cloudflare Workers and CDN for signed URL verification.
- S3-compatible API means the code works against any S3-compatible service (AWS S3, MinIO for local development, etc.).

The storage namespace uses two logical prefixes (or separate buckets depending on provider configuration):

| Prefix / Bucket | Purpose | Access |
|---|---|---|
| `quarantine/` | Uploaded files awaiting validation | Private; no public access |
| `assets/` | Validated and published renditions, artwork | Private; accessible only via short-lived signed URLs |

No object in either prefix is publicly accessible without a signed URL issued by the API.

### Audio delivery: short-lived signed URLs via CDN — NOT proxied through the NestJS API

When a listener requests playback:
1. The NestJS API checks track availability, territory restrictions, and account status.
2. If authorised, the API generates a **short-lived signed URL** pointing to the CDN/R2 asset (expiry: seconds to a few minutes, tuned for the expected client buffer size).
3. The client streams audio directly from the CDN. Audio bytes **never pass through the NestJS API process**.

**Reasons for this design:**
- Proxying audio through the API wastes egress bandwidth and CPU, adds latency, and creates a scaling bottleneck.
- The API is stateless with respect to the audio stream. It authorises once and hands off.
- Signed URLs are access controls: they expire, they are single-purpose, and they do not expose storage credentials.

**Signed URL limitations acknowledged:**
- Signed URLs are not full DRM. A determined user can record the audio stream.
- Signed URLs can be shared during their validity window. Expiry time must be kept short.
- The system does not promise prevention of all copying. It implements reasonable access control proportionate to the threat model.

CDN cache policy must be configured so that responses without a valid signature are not cached and served to other users. Cloudflare's signed URL validation at the edge is the recommended approach.

### Audio processing: isolated `apps/worker` process with resource limits

FFmpeg processing runs in the `apps/worker` application, which is a **separate deployable process** from `apps/api`.

**Reasons:**
- FFmpeg is CPU-intensive and can consume significant memory. Running it in the API process would degrade API response times and could starve request handling.
- A misbehaving or maliciously crafted media file could cause FFmpeg to crash, consume excessive resources, or exhaust disk space. Isolation limits the blast radius.
- Workers can be scaled independently of the API.

**Processing steps in `apps/worker`:**
1. Receive `audio:process` job from BullMQ queue (Redis).
2. Download the uploaded file from the quarantine prefix.
3. Verify checksum (SHA-256) against the value stored at upload time.
4. Run **FFprobe** to inspect the actual media structure, codec, duration, and format — do not trust the file extension or client-supplied MIME type.
5. Validate codec, duration, sample rate, and channel count against the platform's upload policy.
6. Run malware/content scanning if a scanner is configured.
7. Transcode to approved renditions (e.g., 64 kbps, 128 kbps, 256 kbps AAC in an appropriate container).
8. Generate waveform visualisation data and preview clip if required.
9. Store rendition files, metadata, and checksums in the `assets/` prefix.
10. Update the `track` state in PostgreSQL and enqueue a notification for the artist.
11. On failure: update the `track` state to `PROCESSING_FAILED`, log the error with full detail, and notify the artist.

**Worker resource limits (to be configured at container/process level):**
- CPU: limited to prevent a single job from starving other workers.
- Memory: limited to prevent OOM conditions affecting the host.
- Wall-clock time: job timeout enforced by BullMQ (e.g., 15 minutes maximum per job). Exceeded jobs are marked failed.
- Output file size: FFmpeg `-fs` flag limits output size; prevents disk exhaustion from maliciously large transcodes.
- Disk: working directory cleaned up after each job regardless of success or failure.

### Delivery format: progressive download initially; HLS when justified

**Initial delivery:** Progressive audio delivery (standard HTTP range requests against a single rendition file). Simpler to implement, lower player complexity, and sufficient for most use cases.

**HLS adaptive bitrate delivery** will be added when evidence justifies the additional complexity:
- Measured user experience degradation on variable-bandwidth connections in target markets.
- Track lengths where progressive buffering is insufficient.
- Player support across target browsers and devices has been validated.

HLS requires generating segment files and manifest (`.m3u8`) per rendition, additional CDN configuration, and player-side complexity. The cost must be justified by measurable benefit.

DASH is not planned for the initial roadmap.

---

## Consequences

### Positive

- **No egress cost for audio delivery** (Cloudflare R2 + CDN).
- **API is not in the audio delivery hot path.** Scaling audio delivery is independent of scaling the API.
- **Fault isolation for processing.** A crashing FFmpeg job does not crash the API.
- **Worker scaling is independent.** During high-upload periods, more worker replicas handle the queue without affecting API capacity.
- **S3 API compatibility** means local development uses MinIO, staging/production uses R2 (or AWS S3 if R2 does not meet requirements). The application code does not change.
- **Short-lived signed URLs** provide meaningful access control without DRM complexity.

### Negative / risks

- **Signed URL expiry requires careful tuning.** Too short and clients rebuffer unnecessarily. Too long and the access window is wider than intended. Initial default: 5 minutes (covers a typical track with buffer). Tune based on observed behaviour.
- **CDN signed URL verification must be configured correctly.** Misconfiguration could serve private content without signature validation. Mitigated by: testing signed URL enforcement in staging before launch; see threat model.
- **Worker queue saturation during upload spikes.** If many artists upload simultaneously, the queue may grow large. Mitigated by: per-artist concurrent upload limits, BullMQ job priorities, horizontal worker scaling.
- **FFprobe/FFmpeg vulnerability surface.** Parsing untrusted media files with FFprobe/FFmpeg carries inherent risk (parser vulnerabilities). Mitigated by: keeping FFmpeg up to date, running workers in containers with read-only filesystems where possible, applying OS-level resource limits (seccomp, ulimits), and not running workers as root.
- **Progressive delivery limitation.** Some very long tracks may require large initial buffers before playback starts on slow connections. Monitor and add HLS if this becomes a measured problem.

---

## References

- [Architecture overview](../architecture/overview.md)
- [ADR-001: Modular monolith monorepo](./ADR-001-modular-monolith-monorepo.md)
- [Threat model](../architecture/threat-model.md)
- UNIS_MUSIC_MASTER_ROADMAP.md §9 Audio pipeline and streaming
