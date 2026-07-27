/**
 * Adapters for the clinic systems Daryger consolidates.
 *
 * ⚠️ NONE OF THESE ARE WORKING INTEGRATIONS. Daryger has no credentials for
 * Damumed, ЕИСЗ, Aigýn, Qalqan or 1С. Every adapter returns clearly-labelled
 * mock data and documents the real endpoint next to its env var, so swapping in
 * a live integration is a config change rather than a rewrite. This mirrors the
 * approach already used for the appeal sources in ../appeals/.
 *
 * See docs/plans/unified-information-system.md.
 */

/** Matches the SourceSystem enum in prisma/schema.prisma. */
export type SourceSystemName = "DAMUMED" | "EISZ" | "AIGYN" | "QALQAN" | "ONEC";

export type RecordType = "patient" | "staff" | "encounter" | "resource";

/**
 * A record exactly as one system reports it.
 *
 * `subjectRef` is the identity shared across systems — an IIN for a person, a
 * tab number for staff. It is what lets two systems' versions of the same
 * subject be compared without merging them.
 */
export interface SourceRecord {
  recordType: RecordType;
  subjectRef: string;
  externalId: string;
  /** Whatever that system reports. Field names differ between systems on purpose. */
  payload: Record<string, unknown>;
}

/** A staff account held in an external system. */
export interface SourceAccount {
  externalId: string;
  displayName: string;
  /** Email used to match this account to a Daryger user, when the system exposes one. */
  email?: string;
}

export interface SourceSystemAdapter {
  system: SourceSystemName;
  /** Human-readable name for operator screens. */
  label: string;
  /** Records this system currently holds. */
  fetchRecords(): Promise<SourceRecord[]>;
  /** Staff accounts, used to build the unified identity map. */
  fetchAccounts(): Promise<SourceAccount[]>;
}

/**
 * Fields compared across systems when looking for disagreement.
 *
 * Restricted on purpose: comparing every key would flood the conflict queue
 * with differences that are expected (each system stores its own timestamps and
 * internal ids). These are the fields where a mismatch means real trouble.
 */
export const RECONCILED_FIELDS: Record<RecordType, string[]> = {
  patient: ["fullName", "birthDate", "phone", "attachedClinic"],
  staff: ["fullName", "specialty", "position", "employmentStatus"],
  encounter: ["patientRef", "date", "diagnosisCode"],
  resource: ["name", "quantity", "unit"],
};
