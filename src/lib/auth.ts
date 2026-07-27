import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

// No fallback value. A default secret that ships in the source tree is a
// signing key every reader of this repo knows, which lets anyone mint a valid
// session cookie for any role — including SYSTEM_ADMIN. Failing at import time
// turns that into an obvious misconfiguration instead of a silent hole.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Generate one (openssl rand -hex 32) and add it to .env — " +
      "sessions cannot be signed safely without it."
  );
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "PATIENT" | "DOCTOR" | "CLINIC_ADMIN" | "PARTNER_OPERATOR" | "FINANCE_ANALYST" | "HR_ANALYST" | "SYSTEM_ADMIN";
  town?: string | null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("daryger-session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(role?: "PATIENT" | "DOCTOR" | "CLINIC_ADMIN" | "PARTNER_OPERATOR" | "FINANCE_ANALYST" | "HR_ANALYST" | "SYSTEM_ADMIN") {
  const session = await getSession();
  if (!session) return null;
  if (role && session.role !== role) return null;
  return session;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("daryger-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("daryger-session");
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    town: user.town,
  };
}
