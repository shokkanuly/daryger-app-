import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { IkomekAdapter } from "@/lib/adapters/appeals/ikomek";
import { CrmAdapter } from "@/lib/adapters/appeals/crm";
import { EotinishAdapter } from "@/lib/adapters/appeals/eotinish";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session || session.role === "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");

  // 1. Run on-demand merge poll of the mock adapters
  const adapters = [new IkomekAdapter(), new CrmAdapter(), new EotinishAdapter()];
  
  for (const adapter of adapters) {
    try {
      const drafts = await adapter.fetchNew();
      for (const draft of drafts) {
        const existing = await db.appeal.findFirst({
          where: {
            externalRef: draft.externalRef,
            channel: draft.channel,
          },
        });
        if (!existing) {
          await db.appeal.create({
            data: {
              channel: draft.channel,
              externalRef: draft.externalRef,
              subject: draft.subject,
              body: draft.body,
              status: "NEW",
              slaDueAt: draft.slaDueAt,
              createdAt: draft.createdAt || new Date(),
            },
          });
        }
      }
    } catch (err) {
      console.error(`Error polling appeals for channel ${adapter.channel}:`, err);
    }
  }

  // 2. Query appeals from DB
  const where: any = {};
  if (channel) where.channel = channel;
  if (status) where.status = status;

  const appeals = await db.appeal.findMany({
    where,
    orderBy: { slaDueAt: "asc" },
  });

  return NextResponse.json(appeals);
}
