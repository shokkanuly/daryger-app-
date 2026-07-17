import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateExplanation } from "@/lib/clinical-ai/explain";

export async function POST(req: NextRequest) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { score, flags } = await req.json();
    const explanation = await generateExplanation(score, flags);
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error("Error in explain endpoint:", error);
    return NextResponse.json({ error: error.message || "Failed to explain score" }, { status: 500 });
  }
}
