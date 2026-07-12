import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getQueue } from "@/lib/queue";
import { startWorker } from "@/lib/worker";

export async function POST(req: NextRequest) {
  // Require SYSTEM_ADMIN session to trigger crawls
  const session = await requireSession("SYSTEM_ADMIN");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure background worker process is running
  startWorker();

  const queue = getQueue("crawl-queue");

  // Enqueue a crawl job per adapter
  const jobs = [
    await queue.add("crawl-kdl", { adapterName: "kdl" }),
    await queue.add("crawl-invitro", { adapterName: "invitro" }),
    await queue.add("crawl-doq", { adapterName: "doq" }),
  ];

  return NextResponse.json({
    message: "Crawl jobs enqueued successfully",
    jobs: jobs.map((j) => ({ id: j.id, name: j.name, data: j.data })),
  });
}
