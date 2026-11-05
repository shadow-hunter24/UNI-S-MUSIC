# ADR-002: PostgreSQL as Primary Database with Prisma ORM

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-04 |
| **Deciders** | Engineering lead, product owner |
| **Supersedes** | — |
| **Superseded by** | — |

---

## Context

Uni's Music needs a primary data store for transactional application data: user accounts, artist profiles, music catalogue, playlists, financial ledger entries, moderation records, and audit logs. Several alternatives were considered:

**PostgreSQL** — Mature, battle-tested relational database. Strong ACID guarantees, excellent support for complex queries and joins, rich constraint system (foreign keys, unique constraints, check constraints, enums), native UUID support, full-text search, `timestamptz` for timezone-aware timestamps, JSON columns for semi-structured data. Widely supported by managed hosting providers.

**MySQL / MariaDB** — Similar capabilities but historically weaker constraint enforcement, less expressive SQL, and a smaller ecosystem for the specific stack chosen (NestJS, Prisma). Prisma supports it but has historically prioritised PostgreSQL compatibility.

**MongoDB** — Document model is flexible but provides weaker consistency guarantees, no foreign keys, and makes financial ledger design significantly harder. Financial data (ledger entries, payout records) benefits from relational integrity.

**SQLite** — Not suitable for a multi-process, server-side application with concurrent writers.

For the **ORM and migration layer**, Prisma was chosen over:
- Raw `pg` / `node-postgres`: Type safety requires manual work; migrations require a separate tool.
- TypeORM: More complex configuration, historically more bugs in type generation, decorator-heavy approach.
- Drizzle ORM: Newer, less mature ecosystem at time of decision.
- Knex: Query builder, not a full ORM; type safety requires additional setup.

For the **cache and queue layer**, Redis was evaluated as an alternative primary store but rejected for that role (see below).

---

## Decision

### Primary database: PostgreSQL with Prisma ORM

PostgreSQL is the primary transactional database. All persistent application data lives in PostgreSQL except:
- Audio binaries and media files (stored in S3-compatible object storage — see ADR-003).
- Short-lived cache entries (stored in Redis).
- Job queue state (managed by BullMQ in Redis).

Prisma is used for:
- Schema definition (the `packages/database/prisma/schema.prisma` file is the canonical schema).
- Database migrations (`prisma migrate dev` / `prisma migrate deploy`).
- Type-safe query client shared across `apps/api` and `apps/worker`.

### Data modelling conventions

The following conventions apply to all tables and are enforced through code review and Prisma schema linting:

#### Primary keys
- All entities that are referenced externally (exposed in API responses, used in URLs, referenced across module boundaries) use **UUID v4 primary keys**.
- Auto-increment integers may be used for internal junction tables (e.g., `album_tracks`) where the row is never directly addressed externally.
- UUID generation happens at the application layer (Prisma default) or at the database layer via `gen_random_uuid()` — both are acceptable.

#### Timestamps
- All timestamp columns use the `timestamptz` type (timezone-aware).
- All timestamps are **stored in UTC**. The API converts to the user's local time for display only.
- Every table that represents a mutable entity includes `created_at timestamptz DEFAULT now() NOT NULL` and `updated_at timestamptz DEFAULT now() NOT NULL` (kept current via Prisma's `@updatedAt`).
- Soft-delete patterns use `deleted_at timestamptz` rather than a boolean `is_deleted` flag where deletion time is relevant for auditing or retention policies.

#### Money and currency
- All monetary amounts are stored as **integer minor units** (e.g., Ghana Pesewas for GHS, US cents for USD). The column type is `BIGINT` or `INTEGER` depending on expected range.
- Every monetary amount column is accompanied by an **ISO 4217 currency code** column (e.g., `amount_minor_units BIGINT NOT NULL`, `currency VARCHAR(3) NOT NULL`).
- Floating-point types (`FLOAT`, `DOUBLE PRECISION`, `REAL`) are **never used for money**. Decimal arithmetic errors make float unsuitable for financial data.
- PostgreSQL `NUMERIC`/`DECIMAL` types may be used for intermediate financial calculations where exact precision is required, but the canonical ledger entry stores the final integer minor unit amount.

#### Enumerations and status fields
- Explicit status fields use PostgreSQL enums (defined in Prisma schema) or constrained `VARCHAR` with a `CHECK` constraint. A `VARCHAR` status column with no constraint is not acceptable.
- Track state example: `DRAFT`, `UPLOADING`, `PROCESSING`, `PROCESSING_FAILED`, `PENDING_REVIEW`, `REJECTED`, `SCHEDULED`, `PUBLISHED`, `TAKEN_DOWN`, `ARCHIVED`.

#### Referential integrity
- Foreign key constraints are declared in the Prisma schema and enforced at the database level.
- Cascading deletes are used only where the child entity's existence is meaningless without the parent. In most cases, soft-delete or explicit application-layer cleanup is preferred to avoid accidental data loss.

#### Sensitive data separation
- Authentication secrets (`password_hash`, recovery tokens, MFA secrets) are stored in a separate `auth_credentials` table, not in the `users` table. This limits the blast radius if the `users` table is read by code that should not see credentials.
- Raw card data, payment PINs, and payment provider secret keys are **never stored in PostgreSQL** or any application database.

### Redis role: cache and queues only

Redis is used for:
- **Short-lived cache:** Track metadata, search result caching, session tokens (with TTL), rate-limit counters.
- **BullMQ job queues:** Audio processing jobs, notification dispatch, analytics ingestion.
- **Ephemeral pub/sub** where needed.

Redis is **not** the source of truth for any data. If the Redis instance is flushed or replaced, the system recovers fully from PostgreSQL. No Redis key may be the authoritative record for user data, financial data, or catalogue data.

---

## Consequences

### Positive

- **ACID guarantees** for all financial ledger operations, moderation records, and user data.
- **Foreign key integrity** prevents orphaned records.
- **Prisma type safety** means a schema change is a compile error in application code, catching contract mismatches before deployment.
- **Single canonical schema** in `packages/database` eliminates drift between services.
- **UUID PKs** prevent enumeration attacks on API endpoints (a sequential integer ID reveals record counts).
- **Integer minor units** eliminate floating-point rounding errors in financial calculations.
- **`timestamptz` + UTC** means timestamps are unambiguous and portable across timezones.
- **Managed PostgreSQL** (e.g., Railway, Supabase, Neon, AWS RDS) is widely available and simplifies operations.

### Negative / risks

- **Prisma migration limitations:** Prisma's migration system is less flexible than raw SQL for complex schema changes (e.g., partial indexes, some constraint types). Mitigated by: allowing raw SQL migrations when needed via `prisma migrate` with a custom migration file.
- **Connection pooling required early:** PostgreSQL has limited concurrent connections compared to some databases. Mitigated by: PgBouncer or a managed connection pooler from day one.
- **Redis is a dependency:** Losing Redis affects queues and cache but not primary data. Mitigated by: managed Redis with persistence and replication enabled for the queue store.
- **UUID storage size:** UUIDs are larger than integers (16 bytes vs 4–8 bytes). For very high-volume event tables (playback events, ad impressions) this adds index and storage overhead. Mitigated by: using time-ordered UUIDs (UUIDv7 or ULID) for high-volume tables to preserve index locality; evaluate before implementing.

---

## References

- [Architecture overview](../architecture/overview.md)
- [ADR-001: Modular monolith monorepo](./ADR-001-modular-monolith-monorepo.md)
- UNIS_MUSIC_MASTER_ROADMAP.md §8 Database architecture
