/**
 * Seeds the contract and allocation data Track 2 reasons over.
 *
 * FinanceRecords arrive from the source adapters, but contracts and budget
 * allocations are configured by the clinic rather than imported, so they need a
 * starting state. Figures are representative, not real.
 *
 * Usage: npx tsx scripts/seed-finance.ts
 */
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const period = "2026-Q3";

  // ── Contracts (task 7) ────────────────────────────────────────────────────
  // ОСМС/ГОБМП contracts run annually, which also means enough of the period
  // has elapsed for a run-rate projection to be stable.
  const startsAt = new Date("2026-01-01");
  const endsAt = new Date("2026-12-31");

  // Delivered volumes are derived from how much of the year has actually
  // elapsed, so the three risk states hold whenever this is run rather than
  // only on the day it was written.
  const elapsed =
    (Date.now() - startsAt.getTime()) / (endsAt.getTime() - startsAt.getTime());

  const contracts = [
    {
      contractNumber: "ОСМС-2026-0431",
      programme: "ОСМС",
      serviceCategory: "Амбулаторно-поликлиническая помощь",
      plannedVolume: 42000,
      plannedAmount: 210_000_000,
      // Running at half the required rate — недоосвоение.
      rate: 0.5,
    },
    {
      contractNumber: "ГОБМП-2026-0118",
      programme: "ГОБМП",
      serviceCategory: "Скрининговые обследования",
      plannedVolume: 9000,
      plannedAmount: 45_000_000,
      // Well ahead of plan — volume that will not be reimbursed.
      rate: 1.6,
    },
    {
      contractNumber: "ОСМС-2026-0512",
      programme: "ОСМС",
      serviceCategory: "Лабораторная диагностика",
      plannedVolume: 25000,
      plannedAmount: 62_500_000,
      rate: 1.0,
    },
  ];

  for (const c of contracts) {
    const { rate, ...fields } = c;
    const share = Math.min(elapsed * rate, 1);
    const data = {
      ...fields,
      period,
      startsAt,
      endsAt,
      deliveredVolume: Math.round(fields.plannedVolume * share),
      deliveredAmount: Math.round(fields.plannedAmount * share),
    };
    await db.contract.upsert({
      where: { contractNumber: c.contractNumber },
      create: data,
      update: data,
    });
  }

  // ── Allocations (task 9) ──────────────────────────────────────────────────
  // `committed` is the utilisation figure; `spent` is the cash already paid out
  // of that commitment, so spent <= committed always holds.
  const allocations = [
    // Healthy: ~86% committed.
    { programme: "ОСМС", category: "Амбулаторно-поликлиническая помощь", allocated: 210_000_000, committed: 180_000_000, spent: 168_000_000 },
    { programme: "ОСМС", category: "Лабораторная диагностика", allocated: 62_500_000, committed: 51_000_000, spent: 44_100_000 },
    // Over-committed against allocation — spend beyond the funded limit.
    { programme: "ГОБМП", category: "Скрининговые обследования", allocated: 45_000_000, committed: 52_400_000, spent: 36_400_000 },
    // Badly under-used with the year two-thirds gone — недоосвоение risk.
    { programme: "ГОБМП", category: "Лекарственное обеспечение", allocated: 88_000_000, committed: 24_800_000, spent: 19_800_000 },
    { programme: "ОСМС", category: "Оплата труда", allocated: 96_000_000, committed: 61_000_000, spent: 58_500_000 },
  ];

  for (const a of allocations) {
    await db.budgetAllocation.upsert({
      where: {
        period_programme_category: {
          period,
          programme: a.programme,
          category: a.category,
        },
      },
      create: { ...a, period },
      update: { ...a, period },
    });
  }

  console.log(`Seeded ${contracts.length} contracts and ${allocations.length} allocations for ${period}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
