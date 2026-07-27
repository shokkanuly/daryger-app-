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

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileName = file.name;
    let finalClinicId = clinicId;

    if (!finalClinicId || finalClinicId === "choose" || finalClinicId === "null" || finalClinicId === "undefined" || finalClinicId === "") {
      const nameLower = fileName.toLowerCase();
      let detectedClinic = null;

      if (nameLower.includes("invitro")) {
        detectedClinic = await db.clinic.findFirst({ where: { name: { contains: "Invitro", mode: "insensitive" } } });
      } else if (nameLower.includes("kdl")) {
        detectedClinic = await db.clinic.findFirst({ where: { name: { contains: "KDL", mode: "insensitive" } } });
      } else if (nameLower.includes("doq")) {
        detectedClinic = await db.clinic.findFirst({ where: { name: { contains: "Doq", mode: "insensitive" } } });
      }

      // Deliberately NOT db.clinic.findFirst(): that returned whatever row
      // happened to be first and silently filed an entire archive against an
      // unrelated clinic. For an archive the real attribution happens per
      // inner file during parsing (see src/lib/catalog/clinic-resolver.ts);
      // this record only needs a stable owner for the uploaded blob.
      if (!detectedClinic) {
        detectedClinic =
          (await db.clinic.findFirst({ where: { name: "Unassigned Partner Upload" } })) ??
          (await db.clinic.create({
            data: {
              name: "Unassigned Partner Upload",
              city: "Karaganda",
              sourceType: "PARTNER",
            },
          }));
      }

      finalClinicId = detectedClinic.id;
    } else {
      const clinic = await db.clinic.findUnique({ where: { id: finalClinicId } });
      if (!clinic) {
        return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
      }
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    let fileFormat = "pdf";
    if (fileExtension === ".docx") fileFormat = "docx";
    else if (fileExtension === ".xlsx" || fileExtension === ".xls") fileFormat = "xlsx";
    else if (fileExtension === ".zip") fileFormat = "zip";

    // Upload raw file to S3
    const uuid = crypto.randomUUID();
    const s3Key = `partner-docs/${finalClinicId}/${uuid}${fileExtension}`;
    await putObject(s3Key, fileBuffer, file.type || "application/octet-stream");

    // Log the PriceDocument
    const priceDoc = await db.priceDocument.create({
      data: {
        clinicId: finalClinicId,
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
