# Chat realtime — polling → SSE

Replaces 5-second full-consultation polling with a Server-Sent Events stream
backed by Redis pub/sub.

## Why

Both chat clients (`patient/consult/[id]`, `doctor/consultations/[id]`) call
`GET /api/consultations/[id]` on a 5s `setInterval`. Each response carries the
whole consultation — patient, doctor, every message, triage data. The product
targets rural 3G, so this is the wrong shape twice over: latency up to 5s, and
constant bandwidth on an idle chat.

## Decision

SSE + Redis pub/sub, with a periodic DB reconciliation inside the same stream.

Considered and rejected:

- **SSE + polling Postgres inside the stream.** No Redis needed, ~1s latency,
  but one query per second per viewer forever. Kept as the *reconciliation*
  mechanism at 30s rather than the primary transport.
- **Keep polling, add a `?since=` cursor.** Smallest change and fixes the
  bandwidth half, but leaves latency at 5s.

Redis is already a hard dependency (BullMQ), so this adds no new infrastructure.
It does introduce pub/sub as a **new architectural pattern** in this codebase —
the first streaming endpoint here.

### Accepted costs

- **One Redis subscriber connection per open chat.** ioredis in subscriber mode
  blocks its connection, so the shared instance in `src/lib/queue.ts` cannot be
  reused. At pilot scale (14 clinics) this is tens of connections against a
  10,000 default `maxclients`. Revisit with a shared multiplexing subscriber if
  concurrent chats approach the low thousands.
- **A dropped publish loses that event.** Mitigated by the 30s re-sync, so the
  worst case degrades to today's behaviour rather than a dead chat.

### Requires a long-lived server

`start.sh` runs a persistent Node process and no route declares a runtime, so
handlers default to the Node runtime. SSE depends on that. If this ever moves to
serverless, long-lived streams need re-evaluating.

## Contract

`GET /api/consultations/[id]/stream` — `text/event-stream`, same participant
authorization as the existing `GET /api/consultations/[id]`.

| Event | Payload | Meaning |
|---|---|---|
| `message` | the created `Message` incl. `sender` | append to the transcript |
| `sync` | `{}` | refetch full consultation (status, diagnosis, prescription) |
| `ping` | `{}` | 20s heartbeat, keeps proxies from idling the connection |

Redis channel: `consultation:<id>`.

## Stages

### Stage 1 — Publish side ✅
**Goal:** message creation emits an event; nothing consumes it yet.
**Steps:** add `src/lib/realtime.ts` (`publish`, `subscribe`) using a dedicated
ioredis connection; call `publish` from the `POST` in
`api/consultations/[id]/messages/route.ts`.
**Done when:** `redis-cli SUBSCRIBE consultation:<id>` prints a frame when a
message is posted.

### Stage 2 — Stream endpoint ✅
**Goal:** an authorized client can hold an open stream and receive events.
**Depends on:** Stage 1.
**Steps:** `api/consultations/[id]/stream/route.ts` — authorize, subscribe,
write SSE frames, heartbeat every 20s, re-sync every 30s, clean up on abort.
**Done when:** `curl -N` with a session cookie prints `event: message` frames as
messages are posted, and unauthorized callers get 403.

### Stage 3 — Clients ✅
**Goal:** both chats live-update; polling removed.
**Depends on:** Stage 2.
**Steps:** replace `setInterval(load, 5000)` with an `EventSource` in both
pages; append on `message`, call `load()` on `sync` and on reconnect.
**Done when:** two browsers in one consultation see each other's messages
without a visible delay, and no 5s request loop appears in the network log.
