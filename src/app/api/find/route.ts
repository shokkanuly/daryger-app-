import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public provider directory — the pitch's "найти врача в области" surface.
 *
 * Deliberately requires NO session: a resident of Балхаш looking for an
 * orthopedist should not have to register first. Only public, non-sensitive
 * fields are returned. Booking (POST /api/find/book) is where identity is
 * captured, not here.
 */
export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region")?.trim();
  const town = req.nextUrl.searchParams.get("town")?.trim();
  const specialty = req.nextUrl.searchParams.get("specialty")?.trim();
  const type = req.nextUrl.searchParams.get("type")?.trim(); // DOCTOR | FELDSHER
  const telemedicine = req.nextUrl.searchParams.get("telemedicine") === "true";

  const providers = await db.doctorProfile.findMany({
    where: {
      isAvailable: true,
      ...(region ? { region } : {}),
      ...(town ? { town } : {}),
      ...(specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : {}),
      ...(type === "DOCTOR" || type === "FELDSHER" ? { providerType: type } : {}),
      ...(telemedicine ? { offersTelemedicine: true } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      timeSlots: {
        where: { isBooked: false, date: { gte: new Date().toISOString().slice(0, 10) } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: 3,
      },
    },
    orderBy: [{ providerType: "asc" }, { town: "asc" }],
  });

  const results = providers.map((p) => ({
    id: p.id,
    providerId: p.user.id,
    name: p.user.name,
    providerType: p.providerType,
    specialty: p.specialty,
    clinic: p.clinic,
    region: p.region,
    town: p.town,
    offersTelemedicine: p.offersTelemedicine,
    isVerified: p.isVerified,
    bio: p.bio,
    nextSlots: p.timeSlots.map((s) => ({ id: s.id, date: s.date, time: s.time })),
  }));

  // Facets so the UI builds region/town filters from real data. Towns are
  // scoped to the chosen region when one is set, so the town list cascades.
  const [regions, towns] = await Promise.all([
    db.doctorProfile.findMany({
      where: { isAvailable: true },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
    db.doctorProfile.findMany({
      where: { isAvailable: true, ...(region ? { region } : {}) },
      select: { town: true },
      distinct: ["town"],
      orderBy: { town: "asc" },
    }),
  ]);

  return NextResponse.json({
    results,
    facets: {
      regions: regions.map((r) => r.region),
      towns: towns.map((t) => t.town),
    },
  });
}
