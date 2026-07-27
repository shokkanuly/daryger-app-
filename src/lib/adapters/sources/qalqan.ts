import { SourceSystemAdapter, SourceRecord, SourceAccount } from "./types";

/**
 * Qalqan — immunisation and preventive-care registry.
 *
 * MOCK ONLY. Production integration would read
 *   process.env.QALQAN_API_URL  (e.g. https://qalqan.kz/api)
 * with a clinic API token. No credentials are available to this project.
 */
export class QalqanAdapter implements SourceSystemAdapter {
  system = "QALQAN" as const;
  label = "Qalqan";

  async fetchRecords(): Promise<SourceRecord[]> {
    return [
      {
        recordType: "patient",
        subjectRef: "900101300123",
        externalId: "QL-IMM-6001",
        payload: {
          fullName: "Сулейменова Айгерим Ержанқызы",
          birthDate: "1990-01-01",
          phone: "+7 701 555 0123",
          attachedClinic: "Поликлиника №1 Шахтинск",
          lastImmunisation: "2025-10-03",
          hepatitisBVaccinated: true,
        },
      },
      {
        recordType: "resource",
        subjectRef: "VAC-HEPB",
        externalId: "QL-STOCK-4410",
        payload: {
          name: "Вакцина против гепатита B",
          quantity: 240,
          unit: "доза",
          expiresAt: "2027-03-01",
        },
      },
    ];
  }

  async fetchAccounts(): Promise<SourceAccount[]> {
    return [{ externalId: "QL-EMP-0310", displayName: "immun.kgd", email: "ops@daryger.kz" }];
  }
}
