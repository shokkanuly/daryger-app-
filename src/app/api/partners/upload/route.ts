import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { putObject } from "@/lib/storage";
import { getQueue } from "@/lib/queue";
import { startWorker } from "@/lib/worker";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const clinicId = formData.get("clinicId") as string;
    const effectiveDateStr = formData.get("effectiveDate") as string;
    const file = formData.get("file") as File;

    if (!clinicId || !file) {
      return NextResponse.json({ error: "clinicId and file are required" }, { status: 400 });
    }

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    let fileFormat = "pdf";
    if (fileExtension === ".docx") fileFormat = "docx";
    else if (fileExtension === ".xlsx" || fileExtension === ".xls") fileFormat = "xlsx";
    else if (fileExtension === ".zip") fileFormat = "zip";

    // Upload raw file to S3
    const uuid = crypto.randomUUID();
    const s3Key = `partner-docs/${clinicId}/${uuid}${fileExtension}`;
    await putObject(s3Key, fileBuffer, file.type || "application/octet-stream");

    // Log the PriceDocument
    const priceDoc = await db.priceDocument.create({
      data: {
        clinicId,
        fileName,
        fileFormat,
        effectiveDate: effectiveDateStr ? new Date(effectiveDateStr) : null,
        parseStatus: "PENDING",
        rawContentKey: s3Key,
      },
    });

    // Enqueue document parse job
    const queue = getQueue("parse-document-queue");
    await queue.add("parse-document-job", { docId: priceDoc.id });

    // Ensure worker is running
    startWorker();

    return NextResponse.json({ success: true, documentId: priceDoc.id });
  } catch (err: any) {
    console.error("Document upload failed:", err);
    return NextResponse.json({ error: err.message || "Failed to upload document" }, { status: 500 });
  }
}
