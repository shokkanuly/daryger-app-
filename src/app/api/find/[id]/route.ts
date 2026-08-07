import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * One provider's public profile and full open schedule. No session required —
 * this is what a resident sees before deciding to book.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const p = await db.doctorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      timeSlots: {
        where: { isBooked: false, date: { gte: new Date().toISOString().slice(0, 10) } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      },
    },
  });

  if (!p || !p.isAvailable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: p.id,
    providerId: p.user.id,
    name: p.user.name,
    providerType: p.providerType,
    specialty: p.specialty,
    clinic: p.clinic,
    town: p.town,
    offersTelemedicine: p.offersTelemedicine,
    isVerified: p.isVerified,
    bio: p.bio,
    slots: p.timeSlots.map((s) => ({ id: s.id, date: s.date, time: s.time })),
  });
}
