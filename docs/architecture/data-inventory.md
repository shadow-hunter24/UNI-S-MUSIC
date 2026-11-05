# Uni's Music — Data Inventory and Privacy Classification

**Status:** Initial draft — legal review required before public launch  
**Version:** 1.0  
**Date:** 2026-11-04  
**Review cadence:** Review at each major phase; mandatory review before accepting payments or launching publicly

---

## 1. Legal and regulatory context

Uni's Music operates initially in Ghana and is designed for international expansion. The primary applicable data protection legislation is the **Ghana Data Protection Act, 2012 (Act 843)**.

### Key obligations under Act 843

- **Registration:** Data controllers must register with the **Data Protection Commission (DPC)** of Ghana before processing personal data. **Registration and DPC compliance review are required before public launch.**
- **Data principles:** Personal data must be collected for a specified, explicit, and legitimate purpose; not processed in a manner incompatible with that purpose; adequate, relevant, and not excessive; accurate and up to date; not retained longer than necessary.
- **Data subject rights:** Individuals have rights to access, correct, and request deletion of their personal data.
- **Security:** Appropriate technical and organisational measures must be applied to protect personal data.
- **Sensitive data:** Additional restrictions apply to processing sensitive personal information (e.g., health data, political opinions). The platform should avoid collecting sensitive categories unless strictly necessary.
- **Cross-border transfers:** **Personal data must not be transferred outside Ghana without adequate safeguards.** This must be evaluated carefully for any third-party services (analytics, email providers, payment processors) that process personal data outside Ghana. Adequate safeguards include standard contractual clauses, adequacy decisions, or binding corporate rules as recognised by the DPC.

### Action required before launch

- [ ] Register with the Data Protection Commission as a data controller.
- [ ] Prepare and publish a Privacy Policy in plain English explaining data collection, use, retention, and user rights.
- [ ] Prepare a Data Processing Register (internal record of all processing activities).
- [ ] Assess all third-party data processors (payment providers, email services, analytics) for cross-border transfer compliance.
- [ ] Engage qualified legal counsel to review the Privacy Policy and DPC registration.
- [ ] Define and implement data subject rights workflows (access requests, deletion requests, correction requests).

---

## 2. Data inventory table

The table below inventories the personal data and sensitive data processed by the platform. Non-PII records are included for completeness.

### 2.1 Identity and authentication

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **User** | `users` | `email` (normalised), `created_at`, `updated_at`, `deleted_at`, `status` | Yes — `email` | High | Contract (account creation and platform use) | Account lifetime + 30 days post-deletion (to handle disputes and chargebacks) | Email is the primary identifier. Normalised before storage. |
| **AuthCredentials** | `auth_credentials` | `password_hash`, `mfa_secret` (if enabled), `last_password_changed_at` | Yes — indirect (linked to User) | Critical | Contract | Same as User | Stored in a separate table from `users`. Never included in API responses. Argon2id hashing. |
| **Session** | `sessions` | `session_token` (hashed), `user_id`, `created_at`, `expires_at`, `ip_address`, `user_agent` | Yes — `ip_address`, `user_agent`, `session_token` | High | Contract (maintaining authenticated state) | Until expiry (active sessions); expired sessions purged by scheduled job after 7 days | Token stored as hash. IP and user-agent retained for security event correlation only. |
| **AuthEvent** | `auth_events` | `user_id`, `event_type` (login, logout, password_reset, etc.), `ip_address`, `user_agent`, `created_at`, `success` | Yes — `ip_address`, `user_agent` | Medium | Legitimate interest (security monitoring) | 90 days for general events; 2 years for security-relevant events (failed logins, suspicious activity) | Used for breach detection and account support. Not used for advertising. |

### 2.2 User profiles

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **UserProfile** | `user_profiles` | `display_name`, `bio`, `avatar_url`, `website_url`, `location` (optional, user-supplied), `updated_at` | Yes — `display_name` is PII; others are voluntary | Medium | Consent (user chooses to provide this information) | Account lifetime; `display_name` must be anonymised or deleted within 30 days of account deletion request | User may edit or delete profile fields at any time. `avatar_url` points to object storage — underlying file must be deleted when profile is deleted. |
| **ConsentRecord** | `consent_records` | `user_id`, `consent_type`, `version`, `granted_at`, `revoked_at`, `ip_address` | Yes — `ip_address` | High | Legal obligation (evidence of consent) | Lifetime of account + 7 years (legal retention for consent records) | Records when and how consent was given or withdrawn. Required for audit. |

### 2.3 Artist profiles

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **ArtistProfile** | `artist_profiles` | `stage_name`, `bio`, `hero_image_url`, `social_links`, `country`, `verification_status`, `created_at` | Yes — `stage_name` may identify an individual | Medium | Contract (artist onboarding and platform participation) | Account lifetime + 30 days post-deletion | `stage_name` may be a legal name or pseudonym. Bio and image treated as PII if they can identify an individual. |
| **ArtistVerification** | `artist_verifications` | `artist_id`, `verification_type`, `submitted_documents` (reference only — documents stored in private object storage), `verified_at`, `verified_by` | Yes — verification documents may contain legal name, ID document references | Critical | Legal obligation / Contract (rights declaration) | Retained for the life of the artist relationship + 7 years (legal and rights dispute purposes) | Actual document files stored in a private, access-controlled prefix. Database stores only reference keys, not document contents. |

### 2.4 Music catalogue

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **Track** | `tracks` | `title`, `description`, `artist_id`, `genre_ids`, `status`, `release_date`, `explicit`, `duration_seconds`, `created_at` | No (catalogue metadata) | Low | Contract | Retained while the artist account is active; archived (not deleted) on account deletion to preserve financial records | `title` and credits may mention individuals — treat as public data where the artist has explicitly published it. |
| **TrackCredit** | `track_credits` | `track_id`, `person_name`, `role` (songwriter, producer, etc.) | Yes — `person_name` if it identifies an individual | Medium | Contract / Consent | Same as Track | Credits are typically voluntarily provided and intended for public display. Individuals named in credits should have a mechanism to request correction. |

### 2.5 Media assets

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **MediaAsset** | `media_assets` | `upload_session_id`, `storage_key`, `bucket`, `mime_type`, `size_bytes`, `checksum`, `created_at` | No (storage references) | Medium (indirect — links to audio IP) | Contract | Retained as long as the associated track is active. Masters may be retained longer per storage policy and artist agreement. | Storage keys are UUIDs. Never expose internal storage paths or credentials. |
| **AudioRendition** | `audio_renditions` | `media_asset_id`, `bitrate_kbps`, `codec`, `storage_key`, `size_bytes`, `checksum`, `created_at` | No | Medium (indirect) | Contract | Same as MediaAsset | Multiple renditions per master. |
| **UploadSession** | `upload_sessions` | `artist_id`, `status`, `storage_key` (quarantine), `size_limit_bytes`, `expires_at`, `created_at` | No | Low | Contract | Purged 24 hours after expiry or completion | Abandoned sessions cleaned up by a scheduled job. |

### 2.6 Engagement and social

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **Follow** | `follows` | `follower_id`, `followee_id`, `created_at` | No (non-PII engagement) | Low | Consent | Until unfollowed or account deleted | Deletion of either account cascades to removal of the follow record. |
| **Like** | `likes` | `user_id`, `track_id`, `created_at` | No (non-PII engagement) | Low | Consent | Until unliked or account deleted | — |
| **Playlist** | `playlists`, `playlist_tracks` | `owner_id`, `title`, `description`, `is_public`, `created_at` | `title` may be personal expression | Low–Medium | Consent | Until deleted by user or account deleted | Private playlists must not appear in public search or feeds. |

### 2.7 Playback and analytics

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **PlaybackSession** | `playback_sessions` | `user_id` (nullable for anonymous), `track_id`, `started_at`, `ended_at`, `duration_played_seconds`, `client_type`, `territory` | Pseudonymous — linked to `user_id` but not directly identifying | Medium | Legitimate interest (royalty calculation, analytics) | **Retention policy TBD** — to be defined before payments are enabled. Provisional: 2 years for royalty-eligible events, 90 days for anonymous events. | Client-supplied events are not trusted for royalty calculations without server-side validation. See threat model. |
| **ListeningEvent** | `listening_events` | `playback_session_id`, `event_type`, `position_seconds`, `timestamp` | Pseudonymous | Low–Medium | Legitimate interest | Same as PlaybackSession | High-volume table — partition by time when volume justifies it. |

### 2.8 Financial

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **RoyaltyLedgerEntry** | `royalty_ledger_entries` | `artist_id`, `amount_minor_units`, `currency`, `source_event_id`, `rule_version`, `created_at` | Indirect — `artist_id` links to PII | Critical | Contract / Legal obligation | **7 years** (financial record-keeping obligation) | Append-only. No UPDATE or DELETE. Corrections are new entries. |
| **PayoutRequest** | `payout_requests` | `artist_id`, `amount_minor_units`, `currency`, `status`, `payout_account_id`, `requested_at`, `approved_at`, `completed_at` | Indirect | Critical | Contract | 7 years | Payout account details stored separately in `payment_accounts`. |
| **PaymentAccount** | `payment_accounts` | `artist_id`, `account_type` (Mobile Money, bank), `provider`, `masked_account_reference`, `created_at` | Yes — financial account data | Critical | Contract | Until artist removes it or account deleted + 7 years for records | **Full account numbers / phone numbers are not stored in clear text.** Store only masked reference and provider-held token. Never store Mobile Money PINs. |
| **PaymentWebhookEvent** | `payment_webhook_events` | `provider`, `event_id`, `payload` (JSON), `received_at`, `processed_at`, `idempotency_key` | Possibly — provider payload may contain personal data | Critical | Legal obligation (audit trail) | 7 years | Used for idempotency and reconciliation. Payload may need to be scrubbed of card data if provider sends it. |

### 2.9 Trust, safety, and governance

| Entity | Table(s) | Data fields | PII? | Sensitivity | Legal basis | Retention | Notes |
|---|---|---|---|---|---|---|---|
| **AuditLog** | `audit_logs` | `actor_id`, `action_type`, `target_type`, `target_id`, `metadata` (JSON), `ip_address`, `created_at` | Yes — `actor_id`, `ip_address` | High | Legal obligation (security and compliance audit) | **2 years** (security and compliance purposes) | `ip_address` is PII under Act 843 and many other frameworks. Must be protected accordingly. |
| **Report** | `reports` | `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `created_at` | Yes — `reporter_id` | High | Legitimate interest (trust and safety) | Until resolved + 2 years | Reporter identity must be protected. Do not expose to the reported party. |
| **ModerationCase** | `moderation_cases` | `reported_content_ref`, `moderator_id`, `decision`, `reason`, `created_at` | Indirect | High | Legal obligation / Legitimate interest | Same as Report | Moderation history retained for appeals and legal compliance. |
| **PrivacyRequest** | `privacy_requests` | `user_id`, `request_type` (access/deletion/correction), `status`, `submitted_at`, `completed_at` | Yes | High | Legal obligation (Act 843 data subject rights) | 3 years after completion | Records must be kept to demonstrate compliance with data subject rights obligations. |

---

## 3. Cross-border data transfer risk register

This register must be completed before public launch. For each third-party service that processes personal data:

| Service category | Likely providers | Data transferred | Country | Safeguard required |
|---|---|---|---|---|
| Email (transactional) | SendGrid, Postmark, AWS SES | Email address, name | US | Standard Contractual Clauses (SCCs) or adequacy assessment |
| Error monitoring | Sentry | Stack traces (may include PII) | US/EU | SCCs; ensure PII scrubbing in SDK config |
| Analytics | TBD | User behaviour, IP addresses | TBD | Assess before enabling |
| Payment processing | TBD (Mobile Money, card) | Financial data, identity data | TBD | DPC-approved transfer mechanism |
| CDN / object storage | Cloudflare | Audio files, metadata | Global | Assess data residency options; EU-US DPF or SCCs |
| Managed database hosting | TBD | All personal data | TBD | Prefer Ghana or Africa-region hosting where available |

> **Action:** Engage legal counsel to complete this register and obtain DPC guidance on transfer mechanisms before any service is enabled.

---

## 4. Data minimisation principles

The following principles must be applied during feature development:

- Collect only the data fields that have a defined purpose. Do not add "useful for later" columns without a recorded legal basis.
- Do not collect sensitive personal data (health, political opinion, religion, ethnicity, biometrics) unless a specific justified purpose is defined and legally reviewed.
- Do not log PII (email, names, IP addresses) in application logs. Use anonymised identifiers in logs where possible.
- Do not store raw payment credentials, card numbers, or Mobile Money PINs.
- Apply retention schedules. Implement automated deletion or anonymisation jobs for data past its retention window.
- Default analytics to pseudonymous where possible. Avoid linking analytics events to PII unnecessarily.

---

## 5. Data subject rights implementation checklist

Before public launch:

- [ ] Account deletion flow: deletes or anonymises all PII within 30 days. Retains records required by law (financial, audit) in anonymised form where possible.
- [ ] Data access request flow: allows a user to export their personal data in a machine-readable format within 30 days.
- [ ] Data correction flow: allows a user to correct inaccurate personal data.
- [ ] Consent withdrawal flow: allows a user to withdraw consent for optional data processing (e.g., analytics).
- [ ] Privacy request tracking: `privacy_requests` table records all requests and their completion status.
- [ ] DPC complaint referral: Privacy Policy must include the DPC contact details and the user's right to lodge a complaint.

---

## 6. Related documents

- [Threat model](./threat-model.md)
- [Architecture overview](./overview.md)
- [ADR-002: PostgreSQL primary database](../adr/ADR-002-postgresql-primary-database.md)
- Ghana Data Protection Act, 2012 (Act 843) — [Data Protection Commission](https://www.dataprotection.org.gh/)
