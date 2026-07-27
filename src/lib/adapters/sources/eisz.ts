import { SourceSystemAdapter, SourceRecord, SourceAccount } from "./types";

/**
 * ЕИСЗ МЗ РК — the national health information system.
 *
 * MOCK ONLY. Production integration would go through
 *   process.env.EISZ_API_URL  (e.g. https://eisz.dsm.gov.kz/api/v1)
 * using the ministry-issued certificate for the clinic. No credentials are
 * available to this project.
 *
 * Note the deliberate divergences from Damumed below: a stale phone number for
 * patient 900101300123 and a different attached clinic for 850712400987. These
 * are the realistic failure mode this whole task exists to expose — the same
 * citizen recorded differently in two systems, with nothing flagging it today.
 */
export class EiszAdapter implements SourceSystemAdapter {
  system = "EISZ" as const;
  label = "ЕИСЗ МЗ РК";

  async fetchRecords(): Promise<SourceRecord[]> {
    return [
      {
        recordType: "patient",
        subjectRef: "900101300123",
        externalId: "EISZ-P-778001",
        payload: {
          fullName: "Сулейменова Айгерим Ержанқызы",
          birthDate: "1990-01-01",
          // Diverges from Damumed — an old number never updated here.
          phone: "+7 701 200 7788",
          attachedClinic: "Поликлиника №1 Шахтинск",
          insuranceStatus: "ОСМС активен",
        },
      },
      {
        recordType: "patient",
        subjectRef: "850712400987",
        externalId: "EISZ-P-778442",
        payload: {
          fullName: "Ахметов Данияр Серікұлы",
          birthDate: "1985-07-12",
          phone: "+7 702 411 8890",
          // Diverges from Damumed — patient moved, only one system knows.
          attachedClinic: "Поликлиника №5 Абай",
          insuranceStatus: "ОСМС активен",
        },
      },
      {
        recordType: "staff",
        subjectRef: "TAB-1187",
        externalId: "EISZ-E-5510",
        payload: {
          fullName: "Алимов Алим Мұратұлы",
          specialty: "Терапевт",
          position: "Врач-терапевт участковый",
          employmentStatus: "ACTIVE",
        },
      },
    ];
  }

  async fetchAccounts(): Promise<SourceAccount[]> {
    return [
      { externalId: "EISZ-E-5510", displayName: "alimov_am", email: "doctor@daryger.kz" },
      { externalId: "EISZ-A-0091", displayName: "admin_kgd", email: "admin@daryger.kz" },
    ];
  }
}
