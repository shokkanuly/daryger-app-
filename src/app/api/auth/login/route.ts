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

  return NextResponse.json({ user, redirect: user.role === "DOCTOR" ? "/doctor" : "/patient" });
}
