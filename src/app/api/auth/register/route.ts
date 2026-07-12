import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name, role, town, phone, specialty, clinic, licenseNumber } = await req.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await hashPassword(password);
  const user = await db.user.create({
    data: { email, password: hashed, name, role, town, phone },
  });

  if (role === "DOCTOR") {
    // isVerified: true only for @daryger.kz demo accounts.
    // In production this would go through a medical license validation queue.
    const isVerified = email.endsWith("@daryger.kz");

    await db.doctorProfile.create({
      data: {
        userId: user.id,
        specialty: specialty || "General Practitioner",
        clinic: clinic || "Regional Hospital Karaganda",
        region: "Karaganda",
        licenseNumber: licenseNumber || null,
        isVerified,
      },
    });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    town: user.town,
  };

  const token = await createToken(sessionUser);
  await setSessionCookie(token);

  return NextResponse.json({ user: sessionUser, redirect: role === "DOCTOR" ? "/doctor" : "/patient" });
}
