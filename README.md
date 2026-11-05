# Uni's Music

> **Music for Everyone. Opportunities for Artists.**

Uni's Music is a music streaming and artist monetisation progressive web app (PWA). Listeners discover and stream music across every genre, while artists publish releases, manage royalties, and grow their audience — all in one platform.

---

## Monorepo structure

```
unis-music/
├── apps/
│   ├── web/          # Next.js PWA — listener & artist front-end
│   ├── api/          # Fastify REST + tRPC API server
│   └── worker/       # Background job processor (BullMQ)
├── packages/
│   ├── database/     # Prisma schema, migrations, seed scripts
│   ├── contracts/    # Shared TypeScript types & Zod schemas
│   ├── ui/           # Shared React component library
│   ├── config/       # ESLint, Prettier, Tailwind base configs
│   └── test-utils/   # Shared test helpers and fixtures
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20 |
| pnpm | 9 |
| Docker Desktop | latest stable |

---

## Quick start

```bash
# 1. Clone the repository
git clone <repo-url> unis-music
cd unis-music

# 2. Copy environment variables and fill in any blanks
cp .env.example .env

# 3. Install all workspace dependencies
pnpm install

# 4. Start local infrastructure (Postgres, Redis, Adminer)
docker compose up -d

# 5. Run database migrations
cd packages/database && npx prisma migrate dev

# 6. Seed initial data
npx prisma db seed
cd ../..

# 7. Start all apps in parallel (web :3000, api :4000, worker)
pnpm dev
```

Adminer (database GUI) is available at <http://localhost:8080>.

---

## Running checks

```bash
# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck

# Run all test suites
pnpm test
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Front-end | Next.js 14, React 18, Tailwind CSS, Radix UI |
| API | Fastify, tRPC, Zod |
| Background jobs | BullMQ (Redis-backed) |
| Database | PostgreSQL 16, Prisma ORM |
| Cache / queues | Redis 7 |
| Object storage | Cloudflare R2 (S3-compatible) |
| Auth | Session-based (iron-session) |
| Payments | Pluggable provider via `PAYMENT_PROVIDER` env |
| Email | Pluggable provider via `EMAIL_PROVIDER` env |
| Language | TypeScript 5 throughout |
| Package manager | pnpm 9 (workspaces) |
| Containerisation | Docker Compose (local dev) |
