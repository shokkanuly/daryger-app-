import { db } from "@/lib/db";

/**
 * Resolves which clinic a price list belongs to from its filename.
 *
 * A partner archive holds one price list per clinic ("Клиника 3 прайс 2026.pdf",
 * "Клиника 7_Прайс 2026.xls"), and the upload endpoint only knows the archive.
 * Previously every row in such an archive was filed against a single clinic —
 * whichever `db.clinic.findFirst()` happened to return — which collapsed eight
 * clinics into one and left the comparison view with nothing to compare.
 */

/** Strips the extension and the year/price noise from a price-list filename. */
export function clinicNameFromFile(fileName: string): string | null {
  const base = fileName
    .replace(/\.[^.]+$/, "") // extension
    .replace(/[_]+/g, " ")
    .trim();

  // "Клиника 3 прайс 2026" / "Клиника 7 Прайс 2026" / "Клиника 1 2026"
  const numbered = base.match(/(клиника|clinic)\s*№?\s*(\d+)/i);
  if (numbered) return `Клиника ${numbered[2]}`;

  // Named laboratories that also arrive as partner documents.
  const known: Record<string, string> = {
    kdl: "KDL Laboratory",
    invitro: "Invitro Clinic",
    doq: "Doq Diagnostic Center",
    helix: "Helix",
    olymp: "Olymp",
  };
  for (const [needle, name] of Object.entries(known)) {
    if (base.toLowerCase().includes(needle)) return name;
  }

  // Fall back to the cleaned filename minus year and "прайс" noise, so an
  // unrecognized layout still gets its own clinic rather than being merged
  // into someone else's.
  const cleaned = base
    .replace(/\b(прайс|price|прайс-лист)\b/gi, "")
    .replace(/\b20\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * Finds or creates the clinic for a given source file.
 *
 * Falls back to the document's own clinic when the filename carries no usable
 * identity, so a single-file upload where the operator already chose a clinic
 * still behaves as before.
 */
export async function resolveClinicForFile(
  fileName: string,
  fallbackClinicId: string,
  city = "Karaganda"
): Promise<string> {
  const name = clinicNameFromFile(fileName);
  if (!name) return fallbackClinicId;

  const existing = await db.clinic.findFirst({ where: { name } });
  if (existing) return existing.id;

  const created = await db.clinic.create({
    data: { name, city, sourceType: "PARTNER" },
  });
  return created.id;
}
