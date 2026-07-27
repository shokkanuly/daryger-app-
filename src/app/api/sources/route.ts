import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSourceAdapters } from "@/lib/sources/sync";

/**
 * Consolidation status per source system.
 *
 * ⚠️ Every system behind this is mocked — see
 * docs/plans/unified-information-system.md.
 */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adapters = getSourceAdapters();

  const systems = await Promise.all(
    adapters.map(async (a) => {
      const [records, accounts, latest] = await Promise.all([
        db.consolidatedRecord.count({ where: { system: a.system, isActive: true } }),
        db.externalAccount.count({ where: { system: a.system } }),
        db.consolidatedRecord.findFirst({
          where: { system: a.system },
          orderBy: { fetchedAt: "desc" },
          select: { fetchedAt: true },
        }),
      ]);
      return {
        system: a.system,
        label: a.label,
        records,
        linkedAccounts: accounts,
        lastSyncedAt: latest?.fetchedAt ?? null,
        isMocked: true,
      };
    })
  );

  const openConflicts = await db.recordConflict.count({ where: { status: "OPEN" } });
  const subjects = await db.consolidatedRecord.findMany({
    where: { isActive: true },
    select: { subjectRef: true },
    distinct: ["subjectRef"],
  });

  return NextResponse.json({
    systems,
    openConflicts,
    consolidatedSubjects: subjects.length,
  });
}
