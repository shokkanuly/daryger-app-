# Deploying to Railway

## The crash loop, and what caused it

A first deployment failed with this on repeat:

```
[ioredis] Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379
npm error signal SIGTERM
Stopping Container
```

Three separate faults stacked up:

1. **No Redis service existed in the project.** With `REDIS_URL` unset, the code
   fell back to `redis://127.0.0.1:6379` — an address that cannot exist inside a
   container.
2. **No error listener on the connection.** ioredis emits `error` on every failed
   reconnect. Unhandled, that terminates the process — hence SIGTERM and the loop.
3. **The connection opened at module import.** `queue.ts` connected as a side
   effect of being imported, so startup began dialling Redis before any request
   needed a queue.

All three are fixed in `src/lib/redis.ts`. Connections are now lazy, always carry
an error listener, and a missing `REDIS_URL` in production raises a message that
names the fix. The app boots and serves traffic even with Redis unavailable —
only the queues and live chat degrade.

---

## Services to create

| Railway service | Source | Required |
|---|---|---|
| **Postgres** | Railway plugin | Yes |
| **Redis** | Railway plugin | Yes — queues and live chat |
| **daryger-app** | this GitHub repo | Yes |
| **ingest** | `services/ingest/Dockerfile` | Only for document upload |

> Railway has no MinIO. Document ingestion needs an S3-compatible bucket —
> Cloudflare R2 or AWS S3. Everything else runs without it.

---

## Variables

On the **app** service. `${{...}}` is Railway's reference syntax — it wires
services together without copying credentials.

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Required. The app refuses to boot without it — there is no fallback secret.
#   openssl rand -hex 32
JWT_SECRET=<generate one>

NEXTAUTH_URL=https://<your-app>.up.railway.app
NEXT_PUBLIC_APP_URL=https://<your-app>.up.railway.app
NEXT_PUBLIC_BASE_URL=https://<your-app>.up.railway.app
```

Optional — each has a documented offline fallback, so leave blank to deploy
without them:

```bash
GEMINI_API_KEY=      # empty -> deterministic rules engine, templated explanations
DAILY_API_KEY=       # empty -> video skipped, text chat unaffected
SMS_PROVIDER_KEY=    # empty -> invitations log to stdout

# Document ingestion (external S3, e.g. Cloudflare R2)
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
INGEST_SERVICE_URL=  # http://ingest.railway.internal:8000
```

`PORT` is set by Railway; `next start` already respects it. Do not set it.

---

## Build and start

`railway.json` handles this — Nixpacks builds, then:

```
npx prisma migrate deploy && npm run start
```

Migrations run on every deploy. `prisma generate` runs via `postinstall`, so the
client is always built against the current schema.

**SSE requires the long-lived Node process Railway provides.** Do not move this
to a serverless target without reworking `/api/consultations/[id]/stream`.

---

## Verifying a deploy

`GET /api/health` reports each dependency without failing on any of them — a
deploy that cannot reach Postgres still comes up and says so, instead of being
killed by the probe with no readable error:

```jsonc
{
  "status": "ok",
  "database": "ok",              // or "unreachable"
  "redisConfigured": true,
  "storageConfigured": false,
  "timestamp": "..."
}
```

Then seed demo data. From the Railway shell on the app service:

```bash
npm run db:seed
npx tsx scripts/seed-finance.ts
```

---

## Troubleshooting

**`ECONNREFUSED 127.0.0.1:6379`** — the Redis service is missing, or `REDIS_URL`
is not referenced from the app service. Add the plugin and set
`REDIS_URL=${{Redis.REDIS_URL}}`.

**`JWT_SECRET is not set`** — intended. There is no fallback, because a default
committed to a repo is a signing key every reader of that repo holds. Generate
one and set it.

**Health shows `database: unreachable`** — check `DATABASE_URL` references the
Postgres service, and that migrations ran in the deploy logs.

**Document upload fails** — expected without S3. Everything else is unaffected.

**Build fails on a Prisma type** — `src/generated/prisma` is gitignored, so each
environment generates its own. `postinstall` covers this; if you changed the
build command, keep `prisma generate` in it.
