import { SourceSystemAdapter, SourceRecord, SourceAccount } from "./types";

/**
 * Aigýn — outpatient scheduling and encounter registry.
 *
 * MOCK ONLY. Production integration would poll
 *   process.env.AIGYN_API_URL  (e.g. https://aigyn.kz/integration/v1)
 * with an OAuth client credential per clinic. No credentials are available to
 * this project.
 */
export class AigynAdapter implements SourceSystemAdapter {
  system = "AIGYN" as const;
  label = "Aigýn";

  async fetchRecords(): Promise<SourceRecord[]> {
    return [
      {
        recordType: "encounter",
        subjectRef: "850712400987",
        externalId: "AG-VIS-31002",
        payload: {
          patientRef: "850712400987",
          date: "2026-07-02",
          diagnosisCode: "K76.0",
          department: "Гастроэнтерология",
          referredBy: "TAB-1187",
        },
      },
      {
        recordType: "encounter",
        subjectRef: "900101300123",
        externalId: "AG-VIS-31044",
        payload: {
          patientRef: "900101300123",
          date: "2026-06-14",
          // Diverges from the Damumed encounter for the same visit.
          diagnosisCode: "J06.8",
          department: "Терапия",
        },
      },
      {
        recordType: "staff",
        subjectRef: "TAB-2043",
        externalId: "AG-EMP-2043",
        payload: {
          fullName: "Нурланова Сауле Қайратқызы",
          specialty: "Гастроэнтеролог",
          position: "Врач-гастроэнтеролог",
          employmentStatus: "ACTIVE",
        },
      },
    ];
  }

  async fetchAccounts(): Promise<SourceAccount[]> {
    return [{ externalId: "AG-EMP-2043", displayName: "s.nurlanova" }];
  }
}
