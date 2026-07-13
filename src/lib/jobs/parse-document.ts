import { db } from "../db";
import { getObject } from "../storage";
import { matchService } from "../catalog/matcher";

const RATES: Record<string, number> = {
  USD: 450,
  RUB: 5,
  EUR: 500,
  KZT: 1,
};

export async function parseDocumentJob(docId: string) {
  const doc = await db.priceDocument.findUnique({
    where: { id: docId },
    include: { clinic: true },
  });

  if (!doc) {
    console.error(`[Worker] Document with ID ${docId} not found.`);
    return;
  }

  // Update status to PROCESSING
  await db.priceDocument.update({
    where: { id: docId },
    data: { parseStatus: "PROCESSING", parsedAt: new Date() },
  });

  let parseLog = "";
  let statusResult = "DONE";

  try {
    // 1. Download file from S3
    const buffer = await getObject(doc.rawContentKey);
    if (!buffer) {
      throw new Error(`File buffer not found in S3 bucket for key: ${doc.rawContentKey}`);
    }

    // 2. Post file to python ingest service
    const ingestUrl = process.env.INGEST_SERVICE_URL || "http://localhost:8000";
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append("file", blob, doc.fileName);

    const parseRes = await fetch(`${ingestUrl}/parse`, {
      method: "POST",
      body: formData,
    });

    if (!parseRes.ok) {
      const errText = await parseRes.text();
      throw new Error(`Ingest service returned error ${parseRes.status}: ${errText}`);
    }

    const { rows } = await parseRes.json();
    if (!rows || rows.length === 0) {
      await db.priceDocument.update({
        where: { id: docId },
        data: {
          parseStatus: "ERROR",
          parseLog: "Document has no recognizable pricing data",
        },
      });
      return;
    }

    // 3. Process each parsed row
    for (const row of rows) {
      const rawName = row.name;
      let priceOriginal = row.price_resident;
      let priceNonresOriginal = row.price_nonresident;
      const currencyOriginal = row.currency || "KZT";

      // Validation 1: Service name non-empty
      if (!rawName || rawName.trim() === "") {
        parseLog += `[Skipped] Empty service name.\n`;
        continue;
      }

      // Validation 2: Price is a positive number
      if (!priceOriginal || priceOriginal <= 0) {
        parseLog += `[Warning] Non-positive price for "${rawName}": ${priceOriginal}.\n`;
        statusResult = "NEEDS_REVIEW";
        // Convert to a default or skip
        continue;
      }

      // Validation 3: Currency conversion
      const rate = RATES[currencyOriginal.toUpperCase()] || 1;
      const priceKzt = priceOriginal * rate;
      const priceNonresKzt = (priceNonresOriginal || priceOriginal) * rate;

      let isVerified = true;
      let verificationNote = "";

      // Validation 4: Non-resident price >= resident price
      if (priceNonresKzt < priceKzt) {
        parseLog += `[Anomaly] Non-resident price (${priceNonresKzt}) is less than resident price (${priceKzt}) for "${rawName}".\n`;
        isVerified = false;
        verificationNote = "Anomaly: non-resident price less than resident price";
        statusResult = "NEEDS_REVIEW";
      }

      // Validation 5: Effective date check (is in future?)
      if (doc.effectiveDate && new Date(doc.effectiveDate) > new Date()) {
        parseLog += `[Warning] Document effective date is in the future: ${doc.effectiveDate.toISOString()}.\n`;
        isVerified = false;
        verificationNote = "Warning: document effective date is in the future";
        statusResult = "NEEDS_REVIEW";
      }

      // Run matcher
      const { serviceId, confidence } = await matchService(rawName);

      // Validation 6: Price differs from previous version by more than 50%
      if (serviceId) {
        const prevRecord = await db.priceRecord.findFirst({
          where: {
            clinicId: doc.clinicId,
            serviceId,
            isActive: true,
          },
          orderBy: { parsedAt: "desc" },
        });

        if (prevRecord) {
          const prevPrice = Number(prevRecord.priceKzt);
          const percentChange = Math.abs(priceKzt - prevPrice) / prevPrice;
          if (percentChange > 0.50) {
            parseLog += `[Anomaly] Price change of ${(percentChange * 100).toFixed(1)}% exceeds 50% threshold for "${rawName}" (Prev: ${prevPrice}, New: ${priceKzt}).\n`;
            isVerified = false;
            verificationNote = `Anomaly: price changed by ${(percentChange * 100).toFixed(0)}%`;
            statusResult = "NEEDS_REVIEW";
          }
        }
      }

      // If matched, we check for duplicates on the exact same date to archive older one
      // We assume date matches the document's effectiveDate or today's date
      const recordDate = doc.effectiveDate || new Date();
      const startOfRecordDay = new Date(recordDate);
      startOfRecordDay.setHours(0,0,0,0);
      const endOfRecordDay = new Date(recordDate);
      endOfRecordDay.setHours(23,59,59,999);

      if (serviceId) {
        // Archive duplicate
        await db.priceRecord.updateMany({
          where: {
            clinicId: doc.clinicId,
            serviceId,
            parsedAt: { gte: startOfRecordDay, lte: endOfRecordDay },
            isActive: true,
          },
          data: { isActive: false },
        });
      } else {
        // Archive raw name duplicate
        await db.priceRecord.updateMany({
          where: {
            clinicId: doc.clinicId,
            serviceNameRaw: rawName,
            serviceId: null,
            parsedAt: { gte: startOfRecordDay, lte: endOfRecordDay },
            isActive: true,
          },
          data: { isActive: false },
        });
      }

      // Insert new price record
      const priceRecord = await db.priceRecord.create({
        data: {
          clinicId: doc.clinicId,
          serviceId,
          serviceNameRaw: rawName,
          priceKzt: priceKzt,
          durationDays: 1,
          parsedAt: recordDate,
          isActive: true,
          sourceType: "PARTNER_DOC",
          priceResidentKzt: priceKzt,
          priceNonresidentKzt: priceNonresKzt,
          priceOriginal: priceOriginal,
          currencyOriginal: currencyOriginal,
          isVerified: isVerified && serviceId !== null, // Only verified if matched to service AND no anomalies
          verificationNote: verificationNote || (serviceId ? "" : "Requires catalog mapping mapping"),
          sourceDocId: doc.id,
        },
      });

      // If matcher did not find standard service, add to MatchQueueItem
      if (!serviceId) {
        const existingQueueItem = await db.matchQueueItem.findFirst({
          where: { rawName, status: "PENDING" },
        });
        if (!existingQueueItem) {
          await db.matchQueueItem.create({
            data: {
              rawName,
              suggestedServiceId: null,
              confidence,
              status: "PENDING",
              sourceRecordId: priceRecord.id,
            },
          });
        }
      }
    }

    await db.priceDocument.update({
      where: { id: docId },
      data: {
        parseStatus: statusResult,
        parseLog: parseLog || "Parsed successfully with no warnings.",
      },
    });

  } catch (error: any) {
    console.error(`[Worker] Failed parsing document ${docId}:`, error);
    await db.priceDocument.update({
      where: { id: docId },
      data: {
        parseStatus: "ERROR",
        parseLog: `Error: ${error.message || error}`,
      },
    });
  }
}
