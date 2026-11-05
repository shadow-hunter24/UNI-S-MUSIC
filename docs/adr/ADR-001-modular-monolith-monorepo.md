# ADR-001: Modular Monolith + pnpm Workspaces Monorepo

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-04 |
| **Deciders** | Engineering lead, product owner |
| **Supersedes** | — |
| **Superseded by** | — |

---

## Context

Uni's Music is a greenfield platform. The team is small, the domain boundaries are not yet fully proven, and the near-term scaling target is an MVP audience rather than millions of concurrent users. Several architectural styles were considered:

**Option A — Traditional modular monolith, single repository**  
One deployable API. Fast to develop, easy to reason about, no network hops between domain logic. Becomes harder to manage as codebase grows if module boundaries are not enforced at the code level.

**Option B — Monorepo with modular monolith + pnpm workspaces**  
One deployable API (same as A) but with the frontend, workers, and shared packages co-located in one repository under pnpm workspaces. Module boundaries enforced by TypeScript import rules and NestJS module encapsulation.

**Option C — Microservices from day one**  
Separate deployable services per domain (Identity service, Catalogue service, Payments service, etc.). Provides independent scaling and deployment but introduces distributed-system complexity: network latency, distributed transactions, service discovery, inter-service auth, much more complex CI/CD and observability, and a higher operations burden that is disproportionate for a small team at early stage.

**Option D — Separate repositories per application**  
Frontend, API, and workers in separate repos. Simpler per-repo but makes sharing types, schemas, and tooling configuration harder and more error-prone. Dependency updates require coordinated PRs across repositories.

---

## Decision

**Use Option B: a NestJS modular monolith deployed as a single API application, inside a pnpm workspaces monorepo.**

The monorepo layout is:

```
apps/web      — Next.js PWA
apps/api      — NestJS REST API (single deployable)
apps/worker   — BullMQ job consumers and FFmpeg audio pipeline (separate process)
packages/database   — Prisma schema, migrations, seed scripts
packages/contracts  — Shared API types, DTOs, Zod schemas
packages/ui         — Shared design-system components
packages/config     — Shared ESLint, TypeScript, tooling config
packages/test-utils — Shared test helpers and fixtures
```

The NestJS API is structured as a set of domain modules (Identity, Catalogue, Artist, Streaming, Payments, Moderation, etc.). Modules communicate through exported service interfaces. Direct cross-module database access is prohibited; a module may only read another module's data by calling its published service methods.

The `apps/worker` process is a **separate deployable** from the first day specifically because audio processing (FFmpeg) is CPU-intensive and long-running. It must not compete with HTTP request handling in the API process. This is a process/deployment boundary, not a microservice — it shares the same codebase, Prisma schema, and Redis instance.

### Conditions for extracting a module into a separate service

A module should only be extracted when **at least one** of the following applies and the cost-benefit is clearly positive:

1. **Independent scaling:** The module's resource profile (CPU, memory, concurrency) differs substantially from the rest of the API, and horizontal scaling of the entire API is inefficient.
2. **Independent deployment cadence:** The module is owned by a separate team that needs to deploy on its own schedule without coupling to other modules' release cycles.
3. **Independent ownership:** A separate team owns the domain and the coupling to the main API creates meaningful coordination overhead.
4. **Fault isolation:** Failures in the module cause unacceptable impact on the rest of the platform, and circuit-breaking within the monolith is insufficient.

Desire for perceived architectural sophistication, team preference, or "preparing for scale" without evidence are **not** sufficient reasons to extract a service.

---

## Consequences

### Positive

- **Fast initial development:** No network hops between domain logic, no distributed-transaction complexity, no inter-service authentication setup.
- **Shared types eliminate contract drift:** `packages/contracts` is the single source of truth for request/response shapes. The Next.js frontend and the NestJS API import the same Zod schemas and TypeScript types. A breaking API change is a TypeScript compile error.
- **Shared Prisma schema:** `packages/database` contains the single canonical schema and migration history. There is no risk of two services using different versions of the schema.
- **Unified CI:** One GitHub Actions pipeline lints, type-checks, builds, and tests all packages in dependency order.
- **Refactoring is cheaper:** Moving logic between modules does not require deploying or versioning separate services.
- **Module boundaries are still enforced:** NestJS module encapsulation and TypeScript path aliases prevent accidental cross-module coupling. The codebase can be split into services later if justified, because the boundaries already exist.

### Negative / risks

- **Single deployment unit for the API:** A critical bug in one module requires redeploying the whole API. Mitigated by: thorough testing, feature flags, rolling deployments.
- **Monorepo tooling overhead:** pnpm workspaces, Turborepo (if adopted), and composite TypeScript configs add initial setup complexity. Mitigated by: investing in good tooling from the start, documented conventions.
- **Module boundary discipline:** Boundaries must be enforced by convention and tooling (ESLint import rules, NestJS module exports). A lack of discipline leads to a big ball of mud. Mitigated by: code review standards, linting, documented module ownership.
- **All modules share the same database connection pool:** A runaway query in one module affects others. Mitigated by: query timeouts, connection pool limits, index design, monitoring.

### Neutral

- The monorepo does not prevent future extraction of services. If a module needs to become a service, the domain boundary already exists in the code. The cost is adding a transport layer (HTTP client, message broker), not refactoring domain logic.

---

## References

- [Architecture overview](../architecture/overview.md)
- UNIS_MUSIC_MASTER_ROADMAP.md §4.2 Architecture guidance, §6 Monorepo structure
