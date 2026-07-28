import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Health check for the platform host (Railway probes this before routing
 * traffic).
 *
 * Reports the database honestly but does NOT fail on it: a deploy that cannot
 * reach Postgres should still come up and say so, rather than be killed by the
 * probe and crash-loop with no way to read the error. Redis is deliberately not
 * probed here — it is checked lazily on first use, so an outage degrades the
 * queues and live chat without taking the whole service down.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "unreachable" = "ok";

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }

  return NextResponse.json({
    status: "ok",
    database,
    redisConfigured: Boolean(process.env.REDIS_URL),
    storageConfigured: Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY),
    timestamp: new Date().toISOString(),
  });
}
