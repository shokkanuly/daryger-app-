import { AppealDraft, AppealSourceAdapter, addBusinessDays } from "./types";

export class CrmAdapter implements AppealSourceAdapter {
  channel = "CRM";

  async fetchNew(): Promise<AppealDraft[]> {
    // Return mock data for local clinic CRM system
    // Production integration: query local CRM DB/API
    // endpoint: process.env.CLINIC_CRM_URL || "https://crm.regionalmed.kz/api/tickets"
    const now = new Date();
    return [
      {
        channel: "CRM",
        externalRef: "CRM-10901",
        subject: "Consultation chat timeout feedback",
        body: "A patient complained that they waited over 2 hours for a response in the Daryger chat yesterday from GP. Please check queue routing.",
        slaDueAt: addBusinessDays(now, 5),
        createdAt: now,
      }
    ];
  }

  async markHandled(externalRef: string): Promise<void> {
    console.log(`[CRM Adapter] Marked CRM ticket ${externalRef} as processed.`);
  }
}
