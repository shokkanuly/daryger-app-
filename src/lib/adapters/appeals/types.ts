export interface AppealDraft {
  channel: "IKOMEK" | "CRM" | "EOTINISH" | "DIRECT";
  externalRef: string;
  subject: string;
  body: string;
  slaDueAt: Date;
  createdAt?: Date;
}

export interface AppealSourceAdapter {
  channel: string;
  fetchNew(): Promise<AppealDraft[]>;
  markHandled(externalRef: string): Promise<void>;
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday or Saturday
      added++;
    }
  }
  return result;
}

