import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSourceAdapters } from "@/lib/sources/sync";

/**
 * The unified identity for one staff member: their single Daryger account and
 * every external system account it stands in for.
 *
 * This is the answer to §01's "several accounts per employee" problem — one
 * login here, with the per-system accounts it maps onto made explicit rather
 * than maintained separately by hand.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  // Staff may read their own identity; only admins may read anyone else's.
  if (session.id !== userId && session.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accounts = await db.externalAccount.findMany({
    where: { userId },
    orderBy: { system: "asc" },
  });

  const labels = new Map(getSourceAdapters().map((a) => [a.system, a.label]));
  const linked = accounts.map((a) => ({
    system: a.system,
    label: labels.get(a.system) ?? a.system,
    externalId: a.externalId,
    displayName: a.displayName,
    lastSyncedAt: a.lastSyncedAt,
  }));

  const linkedSystems = new Set(linked.map((l) => l.system));
  const unlinked = getSourceAdapters()
    .filter((a) => !linkedSystems.has(a.system))
    .map((a) => ({ system: a.system, label: a.label }));

  return NextResponse.json({
    user,
    linked,
    unlinked,
    accountsReplaced: linked.length,
  });
}
