import { AppealDraft, AppealSourceAdapter, addBusinessDays } from "./types";

export class EotinishAdapter implements AppealSourceAdapter {
  channel = "EOTINISH";

  async fetchNew(): Promise<AppealDraft[]> {
    // Return mock data for E-Otinish (Kazakhstan government portal for citizens requests)
    // Production integration: query Smart Bridge SOAP/REST API gateway
    // endpoint: process.env.EOTINISH_GATEWAY_URL || "https://eotinish.gov.kz/api/external"
    const now = new Date();
    return [
      {
        channel: "EOTINISH",
        externalRef: "EOT-2026-000451",
        subject: "Unavailability of Cardiology consultation in Saran",
        body: "Citizens from Saran cannot get scheduled appointments for cardiologists. The regional clinic redirects to Karaganda, which is too far.",
        slaDueAt: addBusinessDays(now, 5),
        createdAt: now,
      }
    ];
  }

  async markHandled(externalRef: string): Promise<void> {
    console.log(`[E-Otinish Adapter] Swapped state for ${externalRef} to handled.`);
  }
}
