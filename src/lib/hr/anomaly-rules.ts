import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

/**
 * HR process assistant — MedHub task 10.
 *
 * Personnel events (termination, transfer, unpaid leave, contract expiry,
 * return from parental leave) are tracked by hand today, so procedures are left
 * half-finished and nobody notices. Each rule below is a check a human would
 * otherwise have to remember to run.
 *
 * Rules are data, not a hardcoded chain, so adding one is a config change.
 */

export interface HrFinding {
  employeeRef: string;
  employeeName?: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  detail: string;
}

/**
 * An employee terminated in 1С who is still ACTIVE in a clinical system.
 *
 * Reuses the Track 1 consolidation rather than a separate HR feed: that layer
 * already holds each system's own view of a staff member, which is exactly what
 * makes this detectable. A terminated doctor with live clinical accounts can
 * still open patient records, so this is the highest-severity rule here.
 */
async function unclosedTerminations(): Promise<HrFinding[]> {
  const staff = await db.consolidatedRecord.findMany({
    where: { recordType: "staff", isActive: true },
  });

  const bySubject = new Map<string, typeof staff>();
  for (const r of staff) {
    const list = bySubject.get(r.subjectRef) ?? [];
    list.push(r);
    bySubject.set(r.subjectRef, list);
  }

  const findings: HrFinding[] = [];

  for (const [subjectRef, records] of bySubject) {
    const statuses = records.map((r) => ({
      system: r.system,
      status: String((r.payload as Record<string, unknown>)?.employmentStatus ?? ""),
      name: (r.payload as Record<string, unknown>)?.fullName as string | undefined,
    }));

    const terminated = statuses.filter((s) => s.status === "TERMINATED");
    const stillActive = statuses.filter((s) => s.status === "ACTIVE");

    if (terminated.length > 0 && stillActive.length > 0) {
      findings.push({
        employeeRef: subjectRef,
        employeeName: terminated[0].name ?? stillActive[0].name,
        type: "unclosed_termination",
        severity: "HIGH",
        detail:
          `Уволен в ${terminated.map((t) => t.system).join(", ")}, ` +
          `но остаётся активным в ${stillActive.map((s) => s.system).join(", ")}. ` +
          `Учётные записи не закрыты — сохраняется доступ к данным пациентов.`,
      });
    }
  }

  return findings;
}

/**
 * A staff member present in the clinical systems but absent from 1С.
 *
 * Usually means a hire whose personnel file was never completed — they are
 * working and seeing patients without an employment record behind them.
 */
async function missingPersonnelRecord(): Promise<HrFinding[]> {
  const staff = await db.consolidatedRecord.findMany({
    where: { recordType: "staff", isActive: true },
  });

  const bySubject = new Map<string, Set<string>>();
  const names = new Map<string, string>();
  for (const r of staff) {
    const systems = bySubject.get(r.subjectRef) ?? new Set<string>();
    systems.add(r.system);
    bySubject.set(r.subjectRef, systems);
    const n = (r.payload as Record<string, unknown>)?.fullName;
    if (typeof n === "string") names.set(r.subjectRef, n);
  }

  const findings: HrFinding[] = [];
  for (const [subjectRef, systems] of bySubject) {
    const inClinical = systems.has("DAMUMED") || systems.has("EISZ") || systems.has("AIGYN");
    if (inClinical && !systems.has("ONEC")) {
      findings.push({
        employeeRef: subjectRef,
        employeeName: names.get(subjectRef),
        type: "missing_personnel_record",
        severity: "MEDIUM",
        detail:
          `Работает в ${[...systems].join(", ")}, но отсутствует в 1С — ` +
          `кадровые документы не оформлены.`,
      });
    }
  }

  return findings;
}

/** Every rule, in one place. */
const RULES: (() => Promise<HrFinding[]>)[] = [
  unclosedTerminations,
  missingPersonnelRecord,
];

/**
 * Runs every rule and records what it finds.
 *
 * Findings are upserted on (employeeRef, type, status) so a re-run refreshes
 * rather than duplicating, and anything an operator already resolved stays
 * resolved.
 */
export async function runHrAnomalyScan(actorId = "system"): Promise<number> {
  const findings = (await Promise.all(RULES.map((r) => r()))).flat();

  for (const f of findings) {
    const existing = await db.hrAnomaly.findFirst({
      where: { employeeRef: f.employeeRef, type: f.type, status: "OPEN" },
    });

    if (existing) {
      await db.hrAnomaly.update({
        where: { id: existing.id },
        data: { detail: f.detail, severity: f.severity, employeeName: f.employeeName },
      });
    } else {
      // A previously RESOLVED finding is not re-raised — an operator already
      // ruled on it, and re-opening it every scan would train them to ignore
      // the queue.
      const resolved = await db.hrAnomaly.findFirst({
        where: { employeeRef: f.employeeRef, type: f.type, status: "RESOLVED" },
      });
      if (resolved) continue;

      await db.hrAnomaly.create({
        data: {
          employeeRef: f.employeeRef,
          employeeName: f.employeeName,
          type: f.type,
          severity: f.severity,
          detail: f.detail,
        },
      });
    }
  }

  await logAction(actorId, "RUN_HR_ANOMALY_SCAN", "HrAnomaly", "all", {
    findings: findings.length,
  });

  return findings.length;
}
