import "dotenv/config";
import { db } from "../src/lib/db";
import { parseDocumentJob } from "../src/lib/jobs/parse-document";
import { putObject } from "../src/lib/storage";

async function runPhase2Tests() {
  console.log("🚀 Starting Phase 2 Integration Tests (Partner Ingestion Engine)...\n");
  let allPassed = true;

  let testClinic: any = null;
  let testDoc: any = null;

  try {
    // 1. Setup mock partner clinic
    const clinicName = "Mock Partner Clinic";
    testClinic = await db.clinic.findFirst({ where: { name: clinicName } });
    if (testClinic) {
      await db.priceRecord.deleteMany({ where: { clinicId: testClinic.id } });
      await db.priceDocument.deleteMany({ where: { clinicId: testClinic.id } });
      await db.clinic.delete({ where: { id: testClinic.id } });
    }

    testClinic = await db.clinic.create({
      data: {
        name: clinicName,
        city: "Karaganda",
        sourceType: "PARTNER",
        bin: "123456789012",
        contactEmail: "partner@test.kz",
        contactPhone: "+77011112233",
      }
    });

    console.log(`✅ Setup: Created mock partner clinic: ${testClinic.name}`);

    // Mock fetch to simulate parser output
    const originalFetch = global.fetch;
    global.fetch = async (url: any, options: any) => {
      if (url.toString().endsWith("/parse")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            filename: "mock_prices.xlsx",
            rows: [
              { name: "Complete Blood Count (CBC)", price_resident: 3000, price_nonresident: 4500, currency: "KZT" },
              { name: "Urinalysis (UA)", price_resident: 1500, price_nonresident: 1200, currency: "KZT" },
              { name: "Blood Glucose", price_resident: 10, price_nonresident: 15, currency: "USD" },
              { name: "Aspartate Aminotransferase (AST)", price_resident: -500, price_nonresident: 1000, currency: "KZT" }
            ]
          }),
          text: async () => ""
        } as any;
      }
      return originalFetch(url, options);
    };

    // Upload mock file key to S3
    const s3Key = `partner-docs/${testClinic.id}/test_prices.xlsx`;
    await putObject(s3Key, Buffer.from("dummy excel content"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    testDoc = await db.priceDocument.create({
      data: {
        clinicId: testClinic.id,
        fileName: "test_prices.xlsx",
        fileFormat: "xlsx",
        parseStatus: "PENDING",
        rawContentKey: s3Key,
      }
    });

    console.log("⏳ Test 1: Running parseDocumentJob and verifying validation rules...");
    await parseDocumentJob(testDoc.id);

    // Verify document status was set to NEEDS_REVIEW
    const updatedDoc = await db.priceDocument.findUnique({ where: { id: testDoc.id } });
    if (updatedDoc?.parseStatus !== "NEEDS_REVIEW") {
      throw new Error(`Expected parseStatus to be 'NEEDS_REVIEW', got: ${updatedDoc?.parseStatus}`);
    }
    console.log(`   - Document parseStatus is: ${updatedDoc.parseStatus}`);

    // Verify PriceRecord 1: Complete Blood Count (CBC)
    const cbcService = await db.service.findFirst({ where: { name: "Complete Blood Count (CBC)" } });
    if (!cbcService) throw new Error("CBC Service missing");

    const recordCbc = await db.priceRecord.findFirst({
      where: { clinicId: testClinic.id, serviceId: cbcService.id }
    });
    if (!recordCbc || recordCbc.isVerified !== true) {
      throw new Error("Expected CBC price record to be created and verified.");
    }
    console.log("   - PriceRecord 1 (CBC) verified successfully.");

    // Verify PriceRecord 2: Urinalysis (UA) - Anomaly non-resident < resident
    const uaService = await db.service.findFirst({ where: { name: "Urinalysis (UA)" } });
    if (!uaService) throw new Error("UA Service missing");

    const recordUa = await db.priceRecord.findFirst({
      where: { clinicId: testClinic.id, serviceId: uaService.id }
    });
    if (!recordUa || recordUa.isVerified !== false || !recordUa.verificationNote?.includes("non-resident")) {
      throw new Error("Expected UA price record to fail verification due to non-resident price constraint.");
    }
    console.log("   - PriceRecord 2 (UA) flagged as unverified non-resident price anomaly.");

    // Verify PriceRecord 3: Blood Glucose (USD conversion)
    const glucoseService = await db.service.findFirst({ where: { name: "Blood Glucose" } });
    if (!glucoseService) throw new Error("Glucose Service missing");

    const recordGlucose = await db.priceRecord.findFirst({
      where: { clinicId: testClinic.id, serviceId: glucoseService.id }
    });
    if (!recordGlucose || Number(recordGlucose.priceKzt) !== 4500 || recordGlucose.currencyOriginal !== "USD") {
      throw new Error(`Expected Glucose price converted to 4500 KZT, got: ${recordGlucose?.priceKzt}`);
    }
    console.log("   - PriceRecord 3 (Blood Glucose) converted currency successfully: 10 USD -> 4500 KZT.");

    // Verify PriceRecord 4: Aspartate Aminotransferase (AST) - Skipped due to negative price
    const astService = await db.service.findFirst({ where: { name: "Aspartate Aminotransferase (AST)" } });
    if (!astService) throw new Error("AST Service missing");

    const recordAst = await db.priceRecord.findFirst({
      where: { clinicId: testClinic.id, serviceId: astService.id }
    });
    if (recordAst) {
      throw new Error("Expected AST price record to be skipped due to non-positive price.");
    }
    console.log("   - PriceRecord 4 (AST) skipped successfully due to non-positive validation rule.");

    console.log("✅ Test 1 Passed: Validation rules applied correctly.");

    // 3. Price Versioning Test (archive-not-overwrite)
    console.log("\n⏳ Test 2: Testing Price Versioning (archive-not-overwrite)...");
    
    // Simulate updating price of CBC to 3500 KZT
    global.fetch = async (url: any, options: any) => {
      if (url.toString().endsWith("/parse")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            filename: "mock_prices.xlsx",
            rows: [
              { name: "Complete Blood Count (CBC)", price_resident: 3500, price_nonresident: 5000, currency: "KZT" }
            ]
          }),
          text: async () => ""
        } as any;
      }
      return originalFetch(url, options);
    };

    // Run job again
    await parseDocumentJob(testDoc.id);

    // Verify there are two records for CBC: one inactive (3000 KZT) and one active (3500 KZT)
    const allCbcRecords = await db.priceRecord.findMany({
      where: { clinicId: testClinic.id, serviceId: cbcService.id },
      orderBy: { parsedAt: "asc" }
    });

    if (allCbcRecords.length !== 2) {
      throw new Error(`Expected exactly 2 PriceRecords for CBC, found: ${allCbcRecords.length}`);
    }

    if (allCbcRecords[0].isActive !== false || allCbcRecords[1].isActive !== true) {
      throw new Error("Price versioning failed to archive the old record and set the new one active.");
    }

    console.log("✅ Test 2 Passed: Price versioning (archive-not-overwrite) works perfectly.");

    // Restore fetch
    global.fetch = originalFetch;

  } catch (error: any) {
    console.error("❌ Test Failed:", error.message || error);
    allPassed = false;
  } finally {
    // Clean up
    if (testClinic) {
      await db.priceRecord.deleteMany({ where: { clinicId: testClinic.id } }).catch(() => {});
      await db.priceDocument.deleteMany({ where: { clinicId: testClinic.id } }).catch(() => {});
      await db.clinic.delete({ where: { id: testClinic.id } }).catch(() => {});
    }
  }

  console.log("\n------------------------------------------------");
  if (allPassed) {
    console.log("🎉 ALL PHASE 2 INTEGRATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("🚨 SOME PHASE 2 INTEGRATION TESTS FAILED.");
    process.exit(1);
  }
}

runPhase2Tests();
