import { SourceSystemAdapter, SourceRecord, SourceAccount } from "./types";

/**
 * 1С — HR and inventory accounting.
 *
 * MOCK ONLY. 1С is typically reachable only via a scheduled export rather than
 * a live API, so a production adapter would most likely read a CSV/XLSX drop
 * from process.env.ONEC_EXPORT_DIR instead of calling a service. No credentials
 * or exports are available to this project.
 *
 * Note the employmentStatus divergence below: 1С records a termination that
 * neither Damumed nor ЕИСЗ knows about, so the doctor still holds active
 * clinical accounts there. That is the exact administrative failure §01
 * describes.
 */
export class OnecAdapter implements SourceSystemAdapter {
  system = "ONEC" as const;
  label = "1С";

  async fetchRecords(): Promise<SourceRecord[]> {
    return [
      {
        recordType: "staff",
        subjectRef: "TAB-1187",
        externalId: "1C-EMP-1187",
        payload: {
          fullName: "Алимов Алим Мұратұлы",
          specialty: "Терапевт",
          position: "Врач-терапевт участковый",
          // Diverges from Damumed and ЕИСЗ, which both still say ACTIVE.
          employmentStatus: "TERMINATED",
          terminationDate: "2026-07-10",
        },
      },
      {
        recordType: "staff",
        subjectRef: "TAB-2043",
        externalId: "1C-EMP-2043",
        payload: {
          fullName: "Нурланова Сауле Қайратқызы",
          specialty: "Гастроэнтеролог",
          position: "Врач-гастроэнтеролог",
          employmentStatus: "ACTIVE",
        },
      },
      {
        recordType: "resource",
        subjectRef: "VAC-HEPB",
        externalId: "1C-STOCK-4410",
        payload: {
          name: "Вакцина против гепатита B",
          // Diverges from Qalqan's count — the classic stock-reconciliation gap.
          quantity: 198,
          unit: "доза",
        },
      },
    ];
  }

  async fetchAccounts(): Promise<SourceAccount[]> {
    return [
      { externalId: "1C-EMP-1187", displayName: "alimov.am", email: "doctor@daryger.kz" },
      { externalId: "1C-EMP-2043", displayName: "nurlanova.sk" },
    ];
  }
}
