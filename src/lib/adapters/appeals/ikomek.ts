import { AppealDraft, AppealSourceAdapter, addBusinessDays } from "./types";

export class IkomekAdapter implements AppealSourceAdapter {
  channel = "IKOMEK";

  async fetchNew(): Promise<AppealDraft[]> {
    // Return mock data for iKomek (e.g. municipal line 109 appeals)
    // Production integration: query iKomek SOAP/REST API endpoint
    // endpoint: process.env.IKOMEK_API_URL || "https://api.ikomek.kz/v1/appeals"
    const now = new Date();
    return [
      {
        channel: "IKOMEK",
        externalRef: "IKM-2026-9871",
        subject: "No pediatrician in Shakhtinsk polyclinic",
        body: "The only pediatrician is on leave, and parents have to travel to Karaganda for simple checkups. Please assign a replacementGP.",
        slaDueAt: addBusinessDays(now, 5),
        createdAt: now,
      },
      {
        channel: "IKOMEK",
        externalRef: "IKM-2026-1123",
        subject: "Elevator out of service in Regional Hospital",
        body: "The patient elevator in the neurology wing has been broken for 3 days. Disabled patients are forced to climb the stairs.",
        slaDueAt: addBusinessDays(now, 5),
        createdAt: now,
      }
    ];
  }

  async markHandled(externalRef: string): Promise<void> {
    console.log(`[iKomek Adapter] Marked appeal ${externalRef} as handled/synced.`);
  }
}
