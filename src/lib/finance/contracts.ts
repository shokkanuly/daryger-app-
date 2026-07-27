import { db } from "@/lib/db";

/**
 * ОСМС/ГОБМП contract execution monitoring — MedHub task 7.
 *
 * A clinic is penalised at both ends: undelivering contracted volume
 * (недоосвоение) loses funding, overdelivering is not reimbursed. Both are
 * currently caught by hand at period end, which is far too late to correct.
 * This projects each contract forward on its current run-rate so the warning
 * arrives while there is still time to act.
 */

export type ContractRisk = "UNDER_DELIVERY" | "OVER_DELIVERY" | "ON_TRACK";

export interface ContractStatus {
  id: string;
  contractNumber: string;
  programme: string;
  serviceCategory: string;
  /** Fraction of the contract period elapsed, 0-1. */
  timeElapsed: number;
  /** Fraction of planned volume delivered, 0-1. */
  volumeDelivered: number;
  /** Where delivery lands at the current rate, as a fraction of plan. */
  projectedCompletion: number;
  risk: ContractRisk;
  plannedAmount: number;
  deliveredAmount: number;
}

/**
 * Tolerance around a perfect projection before a contract is called at risk.
 *
 * Delivery is never perfectly linear, so a narrow band would flag every
 * contract permanently and the signal would be ignored.
 */
const ON_TRACK_BAND = 0.1;

/**
 * Minimum share of the contract period that must have elapsed before a
 * projection is published.
 *
 * A straight-line extrapolation from a few days of data swings wildly — one
 * busy week reads as 300% over-delivery. Below this the contract is reported
 * ON_TRACK with no projection rather than a confident wrong number.
 */
const MIN_ELAPSED_FOR_PROJECTION = 0.25;

export async function assessContracts(now = new Date()): Promise<ContractStatus[]> {
  const contracts = await db.contract.findMany({ orderBy: { endsAt: "asc" } });

  return contracts.map((c) => {
    const start = c.startsAt.getTime();
    const end = c.endsAt.getTime();
    const span = Math.max(end - start, 1);
    const timeElapsed = Math.min(Math.max((now.getTime() - start) / span, 0), 1);

    const planned = Number(c.plannedVolume);
    const volumeDelivered = planned > 0 ? Number(c.deliveredVolume) / planned : 0;

    // Straight-line projection, suppressed while the period is too young for
    // the extrapolation to mean anything (see MIN_ELAPSED_FOR_PROJECTION).
    const projectable = timeElapsed >= MIN_ELAPSED_FOR_PROJECTION;
    const projectedCompletion = projectable ? volumeDelivered / timeElapsed : 1;

    let risk: ContractRisk = "ON_TRACK";
    if (projectable) {
      if (projectedCompletion < 1 - ON_TRACK_BAND) risk = "UNDER_DELIVERY";
      else if (projectedCompletion > 1 + ON_TRACK_BAND) risk = "OVER_DELIVERY";
    }

    return {
      id: c.id,
      contractNumber: c.contractNumber,
      programme: c.programme,
      serviceCategory: c.serviceCategory,
      timeElapsed: Number(timeElapsed.toFixed(3)),
      volumeDelivered: Number(volumeDelivered.toFixed(3)),
      projectedCompletion: Number(projectedCompletion.toFixed(3)),
      risk,
      plannedAmount: Number(c.plannedAmount),
      deliveredAmount: Number(c.deliveredAmount),
    };
  });
}
