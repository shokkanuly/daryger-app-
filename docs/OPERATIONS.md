# Operations

Running, seeding, testing and troubleshooting Daryger.

---

## Prerequisites

Node 20+, Docker, and roughly 2 GB free for the ingest image (Docling and OCR
dependencies).

## First run

```bash
docker compose up -d          # postgres · redis · minio · ingest
npm install
cp .env.example .env          # set JWT_SECRET — the app will not boot without it
npm run db:migrate
npm run db:seed
npm run dev
```

`JWT_SECRET` has no fallback by design. Generate one:

```bash
openssl rand -hex 32
```

## Services and ports

| Service | Port | Notes |
|---|---|---|
| Next.js | 3000 | App and API |
| PostgreSQL | 5432 | `meduser` / `medpass` / `medpartners` |
| Redis | 6379 | BullMQ queues and SSE pub/sub |
| MinIO | 9000 / 9001 | Bucket `daryger-documents`; console on 9001 |
| Ingest | 8000 | FastAPI; `/health`, `/parse` |

---

## Seeding demo scenarios

The base seed creates users, clinics and the service catalogue. The three feature
scenarios are seeded separately:

```bash
# Finance — contracts and budget allocations
npx tsx scripts/seed-finance.ts

# Unified IS — consolidate the five systems and detect conflicts
curl -X POST -b cookies.txt localhost:3000/api/sources/sync

# Finance pipeline — import, reconcile, forecast, HR scan
curl -X POST -b cookies.txt localhost:3000/api/finance/run
```

Both endpoints require a `SYSTEM_ADMIN` session:

```bash
curl -c cookies.txt -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@daryger.kz","password":"demo123"}'
```

### Re-parsing price documents

After a parser change, re-run ingestion against stored originals. Existing rows are
archived, never deleted:

```bash
npx tsx scripts/reparse-documents.ts           # dry run
npx tsx scripts/reparse-documents.ts --apply
```

---

## Testing

```bash
npm run test:unit          # 25 tests, no database
npm run test:integration   # end to end against the test database
npm run test:phase1        # … phase4 — feature suites
```

Unit tests cover the matcher's pure functions — OCR normalization, Cyrillic stemming,
bidirectional overlap, Levenshtein guards. They need no services running.

---

## Background jobs

Registered as BullMQ repeatable jobs, started with the worker:

| Job | Interval | Purpose |
|---|---|---|
| `poll-appeals-and-sla` | 5 min | Poll appeal sources, flag overdue |
| `sync-source-systems` | 15 min | Consolidate the five clinic systems |
| `parse-document-job` | on demand | Parse an uploaded price document |

Source consolidation runs less often than the appeals poll: these are whole-registry
pulls, not an inbox.

---

## Troubleshooting

### `JWT_SECRET is not set`

Intended. There is no fallback secret — a default in the source tree is a signing key
every reader of the repo knows. Set it in `.env`.

### `P1001: Can't reach database server`

Docker is not running, or containers are not up.

```bash
docker compose ps
docker compose up -d db redis minio
```

### Port already allocated

Another project is using the port. Check before starting:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

### Ingest returns 500, or documents stay `PENDING`

```bash
curl localhost:8000/health          # → {"status":"ok"}
docker compose logs ingest --tail 50
```

Verify `INGEST_SERVICE_URL` matches the running port.

### Uploaded document parses to zero rows

Check `PriceDocument.parseLog` — per-file failures inside an archive are recorded
there. A known gap: legacy `.xls` is unsupported (openpyxl reads `.xlsx` only); it is
reported as a skipped file rather than silently dropped.

### SSE chat not updating

The stream needs the Node runtime and a long-lived process; it will not work on
serverless. Verify:

```bash
curl -N -b cookies.txt localhost:3000/api/consultations/{id}/stream
```

You should see `event: ready`, then `event: ping` every 20 s. If Redis is down, events
stop but the 30-second `sync` keeps the chat correct.

### Crawler returns `provenance: FALLBACK`

The site is unreachable, robots.txt disallows it, or the DOM changed. The `note` field
says which. Those rows are labelled sample data and stored as `CRAWL_FALLBACK` — they
are never presented as real prices.

---

## Production notes

Before deploying:

- [ ] Generate a fresh `JWT_SECRET`; never reuse the development value
- [ ] Point `DATABASE_URL` at managed Postgres; run `prisma migrate deploy`
- [ ] Replace MinIO with real S3/GCS credentials
- [ ] Supply real API keys, or accept the documented offline fallbacks
- [ ] Replace every mocked adapter in [INTEGRATIONS.md](INTEGRATIONS.md) — none is a
      working integration
- [ ] Keep the Node runtime: SSE requires a long-lived process
- [ ] Review Redis `maxclients` — each open chat holds one subscriber connection

### Known limitations

| Limitation | Impact |
|---|---|
| Matcher stem collision (`магния` / `магнитотерапия`) | Some lab tests match procedures; caps normalization near 63 % |
| Legacy `.xls` unsupported | Those price lists are skipped and reported |
| invitro.kz crawler not implemented | Prices are client-side rendered |
| One Redis connection per open chat | Fine at pilot scale; needs multiplexing in the thousands |
