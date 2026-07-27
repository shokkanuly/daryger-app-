import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscribe, RealtimeEvent } from "@/lib/realtime";

/**
 * Server-Sent Events stream for one consultation.
 *
 * Replaces the 5s full-consultation poll the two chat pages used to run. See
 * docs/plans/chat-realtime.md for the design and its accepted costs.
 *
 * Needs the Node runtime and a long-lived server process — this will not work
 * on a serverless deployment target without rework.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keeps intermediaries from treating an idle connection as dead. */
const HEARTBEAT_MS = 20_000;

/**
 * Safety net for a publish that never arrived (Redis blip, dropped frame).
 * Without this a lost event leaves the chat silently stale until reload.
 */
const RESYNC_MS = 30_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;

  const consultation = await db.consultation.findUnique({
    where: { id },
    select: { id: true, patientId: true, doctorId: true },
  });

  if (!consultation) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Same participation rule as GET /api/consultations/[id]. An unclaimed
  // consultation is readable by any doctor so the queue can be worked.
  const isParticipant =
    consultation.patientId === session.id ||
    consultation.doctorId === session.id ||
    (session.role === "DOCTOR" && !consultation.doctorId);

  if (!isParticipant) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Consumer vanished between the closed check and the enqueue.
          closed = true;
        }
      };

      // Tell the client the stream is live so it can drop any fallback polling.
      send("ready", { consultationId: id });

      const isPatient = session.role === "PATIENT";

      const unsubscribe = subscribe(id, (event: RealtimeEvent) => {
        if (event.type !== "message") {
          send("sync", {});
          return;
        }

        // Doctor-to-doctor messages are broadcast on the same channel, so the
        // stream — not the publisher — is what keeps them off a patient's
        // connection. Filtering here rather than at publish time means one
        // channel serves both audiences and there is a single place to get
        // this right.
        const message = event.data as { isInternal?: boolean } | null;
        if (isPatient && message?.isInternal) return;

        send("message", event.data);
      });

      const heartbeat = setInterval(() => send("ping", {}), HEARTBEAT_MS);
      const resync = setInterval(() => send("sync", {}), RESYNC_MS);

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(resync);
        // Must run, or each abandoned stream leaks a Redis connection.
        await unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      _req.signal.addEventListener("abort", () => {
        void cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables proxy buffering, which would otherwise hold frames back.
      "X-Accel-Buffering": "no",
    },
  });
}
