import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctors = await db.doctorProfile.findMany({
    where: { isAvailable: true },
    include: {
      user: { select: { id: true, name: true, town: true } },
      timeSlots: { where: { isBooked: false }, orderBy: [{ date: "asc" }, { time: "asc" }] },
    },
  });

  return NextResponse.json(doctors);
}
