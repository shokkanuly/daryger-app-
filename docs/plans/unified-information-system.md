# Track 1 · Task 01 — Единая информационная система

Consolidates the five systems a polyclinic runs in parallel (КМИС Damumed,
ЕИСЗ МЗ РК, Aigýn, Qalqan, 1С) into one environment with role-based access.

## Why

Staff need a separate account in every system. That means accounts to create and
maintain per person, time lost re-authenticating, and the same patient drifting
out of sync between systems with no way to tell which copy is right.

## Decision

Federated identity plus consolidated records that carry provenance.

- `ExternalAccount` maps one Daryger user to their account in each system.
- `ConsolidatedRecord` stores a synced record tagged with the system it came
  from — never merged destructively.
- `RecordConflict` surfaces fields where systems disagree, for a human to
  resolve.

Considered and rejected:

- **Read-through federation** (query all five live per request). No staleness and
  no sync job, but one unreachable source breaks the page, every view costs five
  network calls, and nothing is auditable after the fact. These are fragmented
  government systems — unavailability is the normal case, not the exception.
- **Full ETL into the existing `User`/domain models.** Simplest to read, but it
  destroys provenance: you cannot answer "which system said this?", and a faulty
  sync corrupts primary clinical records irreversibly.

Provenance is the point. §01's expected effect is fewer errors and consolidated
oversight, which requires knowing the origin of every fact and flagging
disagreement rather than silently picking a winner.

### No credentials exist

Daryger has no access to any of these five systems. Every adapter ships with
clearly-labelled mock data and the production endpoint documented in a comment
next to its env var — exactly the pattern Phase 3 used for iKomek / CRM /
E-Өtinish. **Nothing here is a working integration.** Swapping in a real one
should be a config change, not a rewrite.

## Reused, not reinvented

- Adapter interface + mock-with-documented-endpoint style from
  `src/lib/adapters/appeals/`
- BullMQ repeatable job and per-source `try/catch` isolation from
  `src/lib/worker.ts`
- `logAction()` from `src/lib/audit.ts`
- Existing `Role` enum for access control — no new permission system
- Gemini-with-deterministic-fallback pattern from `src/lib/clinical-ai/explain.ts`

## Stages

### Stage 1 — Schema + first adapter ✅
**Goal:** Damumed mock records land in Postgres with provenance.
**Steps:** `SourceSystem` enum, `ExternalAccount`, `ConsolidatedRecord`,
`RecordConflict`; `src/lib/adapters/sources/types.ts`; `damumed.ts`;
`src/lib/sources/sync.ts`.
**Done when:** a script syncs Damumed and rows appear tagged `DAMUMED`.

### Stage 2 — All five adapters + conflict detection ✅
**Goal:** every system syncs; disagreements become conflicts.
**Depends on:** Stage 1.
**Steps:** `eisz.ts`, `aigyn.ts`, `qalqan.ts`, `onec.ts`; conflict detection in
`sync.ts`; repeatable BullMQ job.
**Done when:** all five sync with one source failing without stopping the rest,
and a seeded disagreement produces a `RecordConflict`.

### Stage 3 — Unified identity ✅
**Goal:** one Daryger login resolves to a staff member's accounts everywhere.
**Depends on:** Stage 1.
**Done when:** `GET /api/sources/identity/[userId]` returns the linked accounts.

### Stage 4 — Operator UI ✅
**Goal:** an admin can see consolidated records, per-field provenance, and
resolve conflicts.
**Depends on:** Stages 2-3.
**Done when:** `/admin/sources` lists systems and lets a conflict be resolved.

### Stage 5 — AI analytics ✅
**Goal:** plain-language management summary over consolidated data.
**Depends on:** Stage 2.
**Done when:** the panel renders with Gemini, and renders a deterministic
fallback with no API key.
