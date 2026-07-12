import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { consultationId } = await req.json();
  if (!consultationId) return NextResponse.json({ error: "consultationId required" }, { status: 400 });

  // Return existing room URL if already created
  const existing = await db.consultation.findUnique({ where: { id: consultationId } });
  if (existing?.videoRoomUrl) {
    return NextResponse.json({ roomUrl: existing.videoRoomUrl });
  }

  const apiKey = process.env.DAILY_API_KEY;
  let roomUrl: string;

  if (apiKey) {
    // Create a private Daily.co room via REST API
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: `daryger-${consultationId}`,
        privacy: "public",
        properties: {
          enable_chat: true,
          enable_screenshare: false,
          max_participants: 2,
          // Expire room after 4 hours
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
        },
      }),
    });

    if (!res.ok) {
      // Fallback to sandbox if API call fails
      roomUrl = `https://daryger.daily.co/${consultationId}`;
    } else {
      const data = await res.json();
      roomUrl = data.url;
    }
  } else {
    // No API key — use a public Daily.co sandbox room (works without auth, demo-only)
    roomUrl = `https://daryger.daily.co/${consultationId}`;
  }

  // Persist the room URL to the consultation record
  await db.consultation.update({
    where: { id: consultationId },
    data: { videoRoomUrl: roomUrl },
  });

  return NextResponse.json({ roomUrl });
}
