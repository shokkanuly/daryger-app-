import { SourceSystemAdapter, SourceRecord, SourceAccount } from "./types";

/**
 * КМИС Damumed — the primary polyclinic medical information system.
 *
 * MOCK ONLY. Production integration would authenticate against
 *   process.env.DAMUMED_API_URL  (e.g. https://api.damumed.kz/v2)
 * with a per-clinic API key and page through /patients and /employees.
 * No credentials are available to this project.
 */
export class DamumedAdapter implements SourceSystemAdapter {
  system = "DAMUMED" as const;
  label = "КМИС Damumed";

  async fetchRecords(): Promise<SourceRecord[]> {
    return [
      {
        recordType: "patient",
        subjectRef: "900101300123",
        externalId: "DM-PT-40021",
        payload: {
          fullName: "Сулейменова Айгерим Ержанқызы",
          birthDate: "1990-01-01",
          phone: "+7 701 555 0123",
          attachedClinic: "Поликлиника №1 Шахтинск",
          lastVisit: "2026-06-14",
        },
      },
      {
        recordType: "patient",
        subjectRef: "850712400987",
        externalId: "DM-PT-40088",
        payload: {
          fullName: "Ахметов Данияр Серікұлы",
          birthDate: "1985-07-12",
          phone: "+7 702 411 8890",
          attachedClinic: "Поликлиника №3 Сарань",
          lastVisit: "2026-07-02",
        },
      },
      {
        recordType: "staff",
        subjectRef: "TAB-1187",
        externalId: "DM-EMP-1187",
        payload: {
          fullName: "Алимов Алим Мұратұлы",
          specialty: "Терапевт",
          position: "Врач-терапевт участковый",
          employmentStatus: "ACTIVE",
        },
      },
      {
        recordType: "encounter",
        subjectRef: "900101300123",
        externalId: "DM-ENC-99120",
        payload: {
          patientRef: "900101300123",
          date: "2026-06-14",
          diagnosisCode: "J06.9",
          department: "Терапия",
        },
      },
    ];
  }

  async fetchAccounts(): Promise<SourceAccount[]> {
    return [
      { externalId: "DM-EMP-1187", displayName: "a.alimov", email: "doctor@daryger.kz" },
      { externalId: "DM-ADM-0042", displayName: "ops.karaganda", email: "ops@daryger.kz" },
    ];
  }
}
