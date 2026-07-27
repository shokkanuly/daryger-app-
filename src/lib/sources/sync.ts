import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import {
  SourceSystemAdapter,
  RECONCILED_FIELDS,
  RecordType,
} from "@/lib/adapters/sources/types";
import { DamumedAdapter } from "@/lib/adapters/sources/damumed";
import { EiszAdapter } from "@/lib/adapters/sources/eisz";
import { AigynAdapter } from "@/lib/adapters/sources/aigyn";
import { QalqanAdapter } from "@/lib/adapters/sources/qalqan";
import { OnecAdapter } from "@/lib/adapters/sources/onec";

/**
 * Pulls every source system into the consolidated layer and raises a conflict
 * wherever two systems disagree about the same subject.
 *
 * See docs/plans/unified-information-system.md. Records are stored per system,
 * never merged — the point is to be able to say which system asserted what.
 */

export function getSourceAdapters(): SourceSystemAdapter[] {
  return [
    new DamumedAdapter(),
    new EiszAdapter(),
    new AigynAdapter(),
    new QalqanAdapter(),
    new OnecAdapter(),
  ];
}

export interface SyncSummary {
  system: string;
  records: number;
  accounts: number;
  error?: string;
}

/**
 * Syncs one system.
 *
 * Errors are captured and returned rather than thrown: one unreachable system
 * must not stop the others, the same source-isolation rule the appeal poller
 * uses.
 */
async function syncOne(adapter: SourceSystemAdapter): Promise<SyncSummary> {
  try {
    const records = await adapter.fetchRecords();
    for (const rec of records) {
      await db.consolidatedRecord.upsert({
        where: {
          system_externalId: { system: adapter.system, externalId: rec.externalId },
        },
        create: {
          recordType: rec.recordType,
          subjectRef: rec.subjectRef,
          system: adapter.system,
          externalId: rec.externalId,
          payload: rec.payload as object,
        },
        update: {
          payload: rec.payload as object,
          fetchedAt: new Date(),
          isActive: true,
        },
      });
    }

    // Link external accounts to Daryger users where the system exposes an email.
    // Accounts without one stay unlinked rather than being guessed at — a wrong
    // identity link is worse than a missing one.
    const accounts = await adapter.fetchAccounts();
    let linked = 0;
    for (const acc of accounts) {
      if (!acc.email) continue;
      const user = await db.user.findUnique({ where: { email: acc.email } });
      if (!user) continue;

      await db.externalAccount.upsert({
        where: {
          system_externalId: { system: adapter.system, externalId: acc.externalId },
        },
        create: {
          userId: user.id,
          system: adapter.system,
          externalId: acc.externalId,
          displayName: acc.displayName,
          lastSyncedAt: new Date(),
        },
        update: { displayName: acc.displayName, lastSyncedAt: new Date() },
      });
      linked++;
    }

    return { system: adapter.system, records: records.length, accounts: linked };
  } catch (err) {
    return {
      system: adapter.system,
      records: 0,
      accounts: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Compares every subject across systems and records disagreements.
 *
 * Only the fields in RECONCILED_FIELDS are compared — every system keeps its own
 * ids and timestamps, and flagging those would bury the conflicts that matter.
 * Existing OPEN conflicts are updated rather than duplicated.
 */
export async function detectConflicts(): Promise<number> {
  const records = await db.consolidatedRecord.findMany({ where: { isActive: true } });

  // subjectRef + recordType -> [{ system, payload }]
  const bySubject = new Map<string, { system: string; payload: Record<string, unknown> }[]>();
  for (const r of records) {
    const key = `${r.recordType}::${r.subjectRef}`;
    const list = bySubject.get(key) ?? [];
    list.push({ system: r.system, payload: (r.payload ?? {}) as Record<string, unknown> });
    bySubject.set(key, list);
  }

  let raised = 0;

  for (const [key, entries] of bySubject) {
    if (entries.length < 2) continue; // nothing to disagree with
    const [recordType, subjectRef] = key.split("::");
    const fields = RECONCILED_FIELDS[recordType as RecordType] ?? [];

    for (const field of fields) {
      const seen = entries
        .filter((e) => e.payload[field] !== undefined && e.payload[field] !== null)
        .map((e) => ({ system: e.system, value: String(e.payload[field]) }));

      if (seen.length < 2) continue;
      const distinct = new Set(seen.map((s) => s.value));
      if (distinct.size < 2) continue; // all systems agree

      await db.recordConflict.upsert({
        where: { subjectRef_field_status: { subjectRef, field, status: "OPEN" } },
        create: { subjectRef, recordType, field, values: seen, status: "OPEN" },
        update: { values: seen },
      });
      raised++;
    }
  }

  return raised;
}

/** Syncs every system, then reconciles. Safe to run repeatedly. */
export async function syncAllSources(actorId = "system"): Promise<{
  systems: SyncSummary[];
  conflicts: number;
}> {
  const summaries: SyncSummary[] = [];
  for (const adapter of getSourceAdapters()) {
    summaries.push(await syncOne(adapter));
  }

  const conflicts = await detectConflicts();

  await logAction(actorId, "SYNC_SOURCE_SYSTEMS", "ConsolidatedRecord", "all", {
    systems: summaries,
    conflicts,
  });

  return { systems: summaries, conflicts };
}
