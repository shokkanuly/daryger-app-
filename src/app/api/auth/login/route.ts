import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createToken(user);
  await setSessionCookie(token);

  let redirect = "/patient";
  if (user.role === "DOCTOR") {
    redirect = "/doctor";
  } else if (user.role === "CLINIC_ADMIN") {
    redirect = "/ops";
  } else if (user.role === "FINANCE_ANALYST") {
    redirect = "/finance";
  } else if (user.role === "SYSTEM_ADMIN" || user.role === "PARTNER_OPERATOR") {
    redirect = "/price/admin";
  }

  return NextResponse.json({ user, redirect });
}
