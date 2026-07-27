# Integrations

**Every external system in this list is mocked.** Daryger holds no credentials for any
government or vendor system. This document states exactly what is real, what is not,
and what it takes to make each one real.

Nothing here should be demonstrated as a working integration.

---

## Status at a glance

| System | Purpose | Status | Adapter |
|---|---|---|---|
| КМИС Damumed | Clinical records | 🔴 mock | `src/lib/adapters/sources/damumed.ts` |
| ЕИСЗ МЗ РК | National health IS | 🔴 mock | `…/sources/eisz.ts` |
| Aigýn | Scheduling, encounters | 🔴 mock | `…/sources/aigyn.ts` |
| Qalqan | Immunisation registry | 🔴 mock | `…/sources/qalqan.ts` |
| 1С | HR and inventory | 🔴 mock | `…/sources/onec.ts` |
| ЕСОМП | Insurance payments | 🔴 mock export | `…/finance/esomp.ts` |
| Казына | Treasury execution | 🔴 mock export | `…/finance/kazyna.ts` |
| 1С (finance) | Accounting | 🔴 mock export | `…/finance/onec.ts` |
| iKomek | Citizen appeals | 🔴 mock | `…/appeals/ikomek.ts` |
| CRM | Citizen appeals | 🔴 mock | `…/appeals/crm.ts` |
| E-Өтініш | Citizen appeals | 🔴 mock | `…/appeals/eotinish.ts` |
| SMS gateway | Screening invitations | 🟡 stub | `src/lib/notifications/sms.ts` |
| Gemini 2.5 Flash | Narration, triage | 🟢 real, optional | direct HTTPS |
| Daily.co | WebRTC video | 🟢 real, optional | direct HTTPS |
| KDL Olymp | Public lab prices | 🟢 **real crawler** | `…/crawler/sources/kdl.ts` |
| doq.kz | Public consult prices | 🟢 **real crawler** | `…/crawler/sources/doq.ts` |
| invitro.kz | Public lab prices | 🔴 not implemented | — |

---

## The adapter pattern

All three families follow one shape, so a real integration is a swap rather than a
rewrite:

```ts
export interface SourceSystemAdapter {
  system: SourceSystemName;
  label: string;
  fetchRecords(): Promise<SourceRecord[]>;
  fetchAccounts(): Promise<SourceAccount[]>;
}
```

Each mock documents its production endpoint beside the environment variable that would
carry it. To go live: implement the same interface against the real API, register it in
the factory, set the variable.

Sync isolates failures per source — one unreachable system does not stop the others.

---

## Clinical systems

| Variable | Production endpoint |
|---|---|
| `DAMUMED_API_URL` | `https://api.damumed.kz/v2` — per-clinic API key, page `/patients`, `/employees` |
| `EISZ_API_URL` | `https://eisz.dsm.gov.kz/api/v1` — ministry-issued certificate |
| `AIGYN_API_URL` | `https://aigyn.kz/integration/v1` — OAuth client credentials |
| `QALQAN_API_URL` | `https://qalqan.kz/api` — clinic API token |
| 1С | Typically a scheduled export, not an API — read from `ONEC_EXPORT_DIR` |

### The mock data is designed to expose real failure modes

The sample records contain **deliberate cross-system disagreements**, because a
consolidation layer that never finds a conflict proves nothing:

| Subject | Field | Disagreement |
|---|---|---|
| Dr. Alimov | `employmentStatus` | 1С: **TERMINATED** · Damumed & ЕИСЗ: **ACTIVE** |
| Patient 850712400987 | `attachedClinic` | Damumed: Сарань · ЕИСЗ: Абай |
| Patient 900101300123 | `phone` | ЕИСЗ holds a stale number; 2 of 3 agree |
| Encounter | `diagnosisCode` | Damumed: J06.9 · Aigýn: J06.8 |
| Hepatitis-B vaccine | `quantity` | Qalqan: 240 · 1С: 198 |

The first row is the flagship case: a terminated doctor retaining live clinical
accounts. It is flagged `HIGH` by the HR anomaly scanner and surfaced in red.

---

## Financial systems

Realistically reachable as periodic spreadsheet exports rather than live APIs, so the
adapters parse CSV/XLSX rather than call a service. `parseExport(csv)` is real code
against real column layouts; `sampleExport()` stands in for a file during development.

| Variable | Expected |
|---|---|
| `ESOMP_EXPORT_DIR` | Quarterly ЕСОМП export |
| `KAZYNA_EXPORT_DIR` | Treasury export |
| `ONEC_EXPORT_DIR` | 1С accounting export |

To go live, upload a real export through `/admin/finance` — the parser is already
wired; only the sample generator becomes unused.

---

## Appeal sources

Same pattern. Polled every 5 minutes by a BullMQ repeatable job, deduplicated on
`(channel, externalRef)`.

| Variable | System |
|---|---|
| `IKOMEK_API_URL` | iKomek municipal line |
| `CLINIC_CRM_URL` | Clinic CRM |
| `EOTINISH_GATEWAY_URL` | E-Өтініш portal |

---

## Optional AI and video

These are **real integrations** that degrade rather than fail when unconfigured:

| Variable | Without it |
|---|---|
| `GEMINI_API_KEY` | Triage uses the deterministic rules engine; clinical explanations render a templated factor list; the management summary uses a computed template |
| `DAILY_API_KEY` | Video room creation is skipped; text chat is unaffected |
| `SMS_PROVIDER_KEY` | Invitations log to console with full status transitions |

Gemini never computes a clinical score. It receives factors the rules engine already
produced and is asked only to narrate them.

---

## Public-site crawlers

Two sources produce **genuinely scraped data**, tagged `provenance: "LIVE"`.

| Source | URL | Yield |
|---|---|---|
| KDL Olymp | `kdlolymp.kz/pricelist/astana` | ~295 lab services with durations |
| doq.kz | `doq.kz/doctors/astana/{specialty}` | 5 specialties, entry price |

Both check robots.txt before every fetch and enforce a delay between requests. Both
target **Astana**.

### Provenance is recorded, not assumed

Each adapter has a `getFallbackData()` path used when a site is unreachable. Those rows
are representative, **not real prices** — so `CrawlResult` carries
`provenance: "LIVE" | "FALLBACK"` and the ingest pipeline writes `sourceType`
accordingly. A fallback row can never be mistaken for a scraped one.

### invitro.kz is not implemented

Its service pages render no price server-side — prices come from a client-side API. A
bounded crawl cannot reach them, and no fake adapter was written to fill the gap.

### When a crawler breaks

These target third-party DOM structures and **will** break. Both previous URLs were
already dead when this work started (`doq.kz/services` returned 404). Symptom:
`provenance: FALLBACK` with a `note` explaining why. Fix: find the current price URL,
update the selectors, verify the run reports `LIVE`.
