# API reference

54 endpoints. A machine-readable OpenAPI subset is served at `GET /api/docs`.

## Conventions

**Authentication** — JWT in an httpOnly cookie, set by `POST /api/auth/login`. Every
endpoint except the auth routes and public price search requires a session.

**Errors** — always `{ "error": "message" }` with a meaningful status:

| Status | Meaning |
|---|---|
| `400` | Malformed or missing parameters |
| `401` | No session |
| `403` | Authenticated but not permitted — wrong role, or not a participant |
| `404` | Not found |
| `409` | Lost a race (slot taken, already claimed, already resolved) |

**Roles** — `PATIENT`, `DOCTOR`, `CLINIC_ADMIN`, `PARTNER_OPERATOR`,
`FINANCE_ANALYST`, `HR_ANALYST`, `SYSTEM_ADMIN`.

---

## Auth

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create an account |
| `POST` | `/api/auth/login` | — | Start a session |
| `POST` | `/api/auth/logout` | any | End a session |

---

## Care — consultations

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/consultations` | any | List consultations for the caller |
| `POST` | `/api/consultations` | patient | Create from triage; runs risk assessment |
| `GET` `PATCH` | `/api/consultations/[id]` | participant | Read / update a consultation |
| `POST` | `/api/consultations/[id]/claim` | doctor | Claim from the queue |
| `GET` `POST` | `/api/consultations/[id]/messages` | participant | Thread read / send |
| `GET` | `/api/consultations/[id]/stream` | participant | **SSE** live updates |

### `GET /api/consultations/[id]/stream`

Server-Sent Events. Requires a long-lived Node runtime.

| Event | Payload | Meaning |
|---|---|---|
| `ready` | `{ consultationId }` | Stream live; sent on every (re)connect |
| `message` | the created message | Append to the transcript |
| `sync` | `{}` | Refetch the consultation |
| `ping` | `{}` | 20 s heartbeat |

```bash
curl -N -b cookies.txt localhost:3000/api/consultations/{id}/stream
```

> Messages with `isInternal: true` are doctor-to-doctor and are **never** sent to a
> patient's stream, thread read, or list preview.

---

## Care — appointments & video

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` `POST` | `/api/appointments` | patient | List / book. Returns `409` if the slot is taken |
| `GET` | `/api/appointments/check-referral` | patient | Referral status |
| `GET` | `/api/doctors` | any | Available doctors |
| `POST` | `/api/video/room` | participant | Create a Daily.co room |

---

## Clinical AI

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/clinical/assess` | doctor·system | Run a risk assessment |
| `GET` | `/api/clinical/assessments/[patientId]` | doctor | Assessment history |
| `POST` | `/api/clinical/explain` | doctor | Narrate an existing score |
| `POST` | `/api/triage/analyze` | patient | Symptom analysis + urgency |

```jsonc
// POST /api/clinical/assess
{ "patientId": "…", "symptoms": "…", "answers": { } }
// →
{
  "score": 4.5,
  "modelVersion": "hepb-protocol-2025-v1",
  "flags": [{ "factorId": "age_over_40", "name": "…", "weight": 1.0 }]
}
```

---

## Teleconsilium

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/teleconsilium` | doctor | List. Filters: `status`, `specialty`, `mine` |
| `POST` | `/api/teleconsilium` | doctor | Request a specialist opinion |
| `PATCH` | `/api/teleconsilium/[id]` | doctor | `{ action: "claim" \| "complete" }` |

`claim` is a conditional update — a second doctor gets `409`. `complete` requires the
claiming specialist and writes the opinion into the case as an internal message.

---

## Unified information system

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/sources` | admin | Per-system record and account counts |
| `POST` | `/api/sources/sync` | admin | Consolidate all five, then reconcile |
| `GET` | `/api/sources/conflicts` | any | Cross-system disagreements |
| `PATCH` | `/api/sources/conflicts/[id]` | admin | `{ resolvedTo }` — records the decision |
| `GET` | `/api/sources/identity/[userId]` | self·admin | One login → its external accounts |
| `GET` | `/api/sources/analytics` | any | Statistics + management summary |

```jsonc
// GET /api/sources/identity/{userId}
{
  "user": { "name": "Dr. Alim Alimov" },
  "accountsReplaced": 3,
  "linked": [
    { "system": "DAMUMED", "externalId": "DM-EMP-1187", "displayName": "a.alimov" },
    { "system": "EISZ",    "externalId": "EISZ-E-5510", "displayName": "alimov_am" },
    { "system": "ONEC",    "externalId": "1C-EMP-1187", "displayName": "alimov.am" }
  ],
  "unlinked": [{ "system": "AIGYN" }, { "system": "QALQAN" }]
}
```

---

## Finance & HR

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/finance` | finance·admin | Sources, reconciliation, forecasts, allocations, contracts |
| `POST` | `/api/finance/run` | finance·admin | Import → reconcile → forecast → HR scan |
| `GET` | `/api/hr/anomalies` | hr·admin | Open personnel-process anomalies |

---

## Price — public

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/price/search` | any | `?q= &city= &category= &minPrice= &maxPrice=` |
| `GET` | `/api/price/clinics/[id]` | any | One clinic's full price list |
| `GET` | `/api/price/history` | any | Price changes over time |
| `POST` | `/api/price/assistant` | any | Symptoms → suggested services + prices |
| `GET` | `/api/search` | any | Full-text across services and partners |
| `GET` | `/api/services` | any | Catalogue, filterable by category |
| `GET` | `/api/services/[id]/partners` | any | Who offers a service, at what price |
| `GET` | `/api/partners` | any | Partner clinics |
| `GET` | `/api/partners/[id]/services` | any | One partner's services |

---

## Price — operator

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/partners/upload` | admin | Upload a ZIP or single price list |
| `GET` | `/api/partners/documents` | admin | Documents and parse status |
| `GET` | `/api/partners/dashboard/stats` | admin | Live ingestion statistics |
| `GET` | `/api/unmatched` | admin | Items awaiting manual matching |
| `POST` | `/api/match` | admin | Resolve a match |
| `GET` | `/api/admin/match/queue` | admin | Review queue |
| `POST` | `/api/admin/match` | admin | Approve / reassign |
| `GET` `POST` | `/api/admin/services` | admin | Catalogue management |
| `GET` | `/api/admin/verification/pending` | admin | Rows awaiting verification |
| `POST` | `/api/admin/verification/approve` | admin | Verify a row |
| `POST` | `/api/admin/crawl/trigger` | admin | Trigger a crawl |
| `GET` | `/api/admin/crawl/history` | admin | Crawl runs and provenance |

---

## Ops

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/appeals` | admin | Unified inbox, filter by channel/status |
| `PATCH` | `/api/appeals/[id]` | admin | Update status / assignment |
| `GET` | `/api/screening` | admin | Screening programmes |
| `POST` | `/api/screening/invite` | admin | Build a cohort and dispatch invitations |
| `GET` | `/api/screening/[programId]/coverage` | admin | Coverage statistics |
