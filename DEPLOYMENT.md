# Deployment Guide — Uni's Music

## Architecture

| App | Where to deploy | Notes |
|-----|----------------|-------|
| `apps/web` (Next.js) | Cloudflare Pages | Uses `@cloudflare/next-on-pages` |
| `apps/api` (NestJS) | Railway / Render / Fly.io | Node.js server, needs Postgres + Redis |
| `apps/worker` (BullMQ) | Same server as API | Needs Redis |

---

## 1. Deploy the API first (Railway recommended)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select the `shadow-hunter24/UNI-S-MUSIC` repo
3. Set root directory to `apps/api`
4. Set build command: `pnpm run build`
5. Set start command: `node dist/main.js`
6. Add all environment variables from `.env.example` (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
7. Note the deployed API URL — e.g. `https://unis-music-api.railway.app`

---

## 2. Deploy the web app to Cloudflare Pages

### In the Cloudflare Pages dashboard:

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → Create a project → Connect to Git
2. Select `shadow-hunter24/UNI-S-MUSIC`
3. Configure the build:

| Setting | Value |
|---------|-------|
| **Framework preset** | `Next.js (Static HTML Export)` — then override below |
| **Build command** | `cd apps/web && pnpm install && pnpm pages:build` |
| **Build output directory** | `apps/web/.vercel/output/static` |
| **Root directory** | *(leave blank — repo root)* |

4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your deployed API URL (e.g. `https://unis-music-api.railway.app`) |
| `NODE_VERSION` | `20` |

5. Click **Save and Deploy**

### What the build does:
- `pnpm install` — installs all dependencies including `@cloudflare/next-on-pages`
- `pnpm pages:build` — runs `npx @cloudflare/next-on-pages` which:
  1. Runs `next build`
  2. Compiles the output to Cloudflare Workers edge runtime
  3. Outputs to `.vercel/output/static`

---

## 3. Environment variables for the API

Copy everything from `.env.example` and fill in real values:

```
NODE_ENV=production
DATABASE_URL=         # Neon Postgres connection string
REDIS_URL=            # Upstash Redis TLS URL
JWT_SECRET=           # min 32 chars random string
SESSION_SECRET=       # min 32 chars random string
S3_ENDPOINT=          # Cloudflare R2 endpoint
S3_BUCKET=            # R2 bucket name
S3_ACCESS_KEY_ID=     # R2 access key
S3_SECRET_ACCESS_KEY= # R2 secret key
MEDIA_PUBLIC_BASE_URL=# Public R2 URL (e.g. https://pub-xxx.r2.dev)
WEB_URL=              # https://uni-s-music.pages.dev
```

---

## 4. CORS — allow the Pages domain on the API

Once the Pages URL is known (`https://uni-s-music.pages.dev`), add it to the
API's CORS origin list. Check `apps/api/src/main.ts` for the cors config and
add the Pages URL to the `origin` array.

---

## Troubleshooting

**404 on Cloudflare Pages after deploy:**
- Build output directory is wrong — must be `apps/web/.vercel/output/static`
- Build command didn't run `pnpm pages:build` — check the Pages build log

**API calls failing (CORS/network errors):**
- `NEXT_PUBLIC_API_URL` environment variable is not set in Pages settings
- API not deployed yet — web is trying to reach localhost

**`output: 'standalone'` error:**
- Already removed in `next.config.mjs` — this was the original cause of the 404
