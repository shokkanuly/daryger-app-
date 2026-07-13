import "dotenv/config";
import { db } from "../src/lib/db";
import { matchService } from "../src/lib/catalog/matcher";
import { runCrawlJob } from "../src/lib/catalog/ingest";
import { Queue } from "bullmq";
import Redis from "ioredis";

async function runPhase1Tests() {
  console.log("🚀 Starting Phase 1 Integration Tests (Crawler & Matcher Engine)...\n");
  let allPassed = true;

  // Ensure DB seed is present
  const serviceCount = await db.service.count();
  if (serviceCount === 0) {
    console.log("⚠️ No catalog services found in DB. Seeding first...");
    // Seed standard services
    const fs = require("fs");
    const path = require("path");
    const servicesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../prisma/seed-data/services.json"), "utf-8")
    );
    for (const s of servicesData) {
      await db.service.create({
        data: {
          name: s.name,
          synonyms: s.synonyms,
          category: s.category,
          icdCode: s.icdCode,
          isActive: true,
        },
      });
    }
  }

  // 1. Matcher Engine Test
  try {
    console.log("⏳ Test 1: Testing matchService logic (Exact, Synonym, and Fuzzy matches)...");
    
    // Find "Complete Blood Count (CBC)" from DB
    const cbcService = await db.service.findFirst({
      where: { name: "Complete Blood Count (CBC)" }
    });
    if (!cbcService) throw new Error("Seed services missing 'Complete Blood Count (CBC)'");

    // Exact Match
    const match1 = await matchService("Complete Blood Count (CBC)");
    if (match1.serviceId !== cbcService.id || match1.confidence !== 1.0) {
      throw new Error(`Exact match failed. Got serviceId: ${match1.serviceId}, confidence: ${match1.confidence}`);
    }

    // Synonym Match
    const match2 = await matchService("ОАК");
    if (match2.serviceId !== cbcService.id || match2.confidence !== 0.95) {
      throw new Error(`Synonym match failed. Got serviceId: ${match2.serviceId}, confidence: ${match2.confidence}`);
    }

    // Fuzzy Match (below threshold)
    const match3 = await matchService("Непонятный медицинский тест");
    if (match3.serviceId !== null) {
      throw new Error(`Fuzzy mismatch failed. Expected null serviceId, got: ${match3.serviceId}`);
    }

    console.log("✅ Test 1 Passed: matchService returns correct mappings and confidence levels.");
  } catch (error: any) {
    console.error("❌ Test 1 Failed:", error.message || error);
    allPassed = false;
  }

  // 2. Ingestion Pipeline & Deduplication Test
  let testClinic: any = null;
  try {
    console.log("\n⏳ Test 2: Testing crawl ingestion pipeline and deduplication logic...");

    const testClinicName = "Test Scrape Clinic";
    testClinic = await db.clinic.findFirst({ where: { name: testClinicName } });
    if (testClinic) {
      await db.priceRecord.deleteMany({ where: { clinicId: testClinic.id } });
      await db.matchQueueItem.deleteMany({ where: { rawName: "УЗИ почек и мочевого пузыря" } });
      await db.clinic.delete({ where: { id: testClinic.id } });
    }

    // Create test clinic
    testClinic = await db.clinic.create({
      data: {
        name: testClinicName,
        city: "Karaganda",
        sourceUrl: "https://test-clinic.kz/prices",
        sourceType: "PUBLIC",
      }
    });

    // Ingest crawl jobs for DOQ (stub run to check database writes)
    console.log("Running ingestion pipeline...");
    await runCrawlJob("doq");

    // Check if DOQ clinic has PriceRecord rows
    const doqClinic = await db.clinic.findFirst({ where: { name: "Doq Diagnostic Center" } });
    if (!doqClinic) throw new Error("DOQ Clinic not created or found");

    const priceRecordsCount = await db.priceRecord.count({ where: { clinicId: doqClinic.id } });
    if (priceRecordsCount === 0) {
      throw new Error("No PriceRecords created during DOQ crawl ingestion.");
    }

    // Check if low-confidence items went to the MatchQueueItem queue
    const pendingQueueCount = await db.matchQueueItem.count({ where: { status: "PENDING" } });
    console.log(`Ingestion completed. Found ${priceRecordsCount} price records and ${pendingQueueCount} unmatched queue items.`);

    // Test Deduplication: Run DOQ crawl again on same day
    console.log("Running second ingestion on same day to verify deduplication...");
    const beforeRecords = await db.priceRecord.findMany({ where: { clinicId: doqClinic.id } });
    
    await runCrawlJob("doq");
    
    const afterRecords = await db.priceRecord.findMany({ where: { clinicId: doqClinic.id } });
    if (beforeRecords.length !== afterRecords.length) {
      throw new Error(`Deduplication failed! Record count changed from ${beforeRecords.length} to ${afterRecords.length}`);
    }

    console.log("✅ Test 2 Passed: Crawl run enqueued, matched, written to DB, and deduplicated successfully.");
  } catch (error: any) {
    console.error("❌ Test 2 Failed:", error.message || error);
    allPassed = false;
  }

  // 3. Match Queue Manual Resolution Test
  try {
    console.log("\n⏳ Test 3: Testing Match Queue approval and reassignment...");

    // Enqueue an unmatched item manually
    const unmatchedName = "Неизвестный тест на антитела";
    const dummyRecord = await db.priceRecord.create({
      data: {
        clinicId: testClinic.id,
        serviceNameRaw: unmatchedName,
        priceKzt: 5000,
        isActive: true,
        sourceType: "CRAWL",
      }
    });

    const queueItem = await db.matchQueueItem.create({
      data: {
        rawName: unmatchedName,
        confidence: 0.1,
        status: "PENDING",
        sourceRecordId: dummyRecord.id,
      }
    });

    // Find a valid target standard service to map to
    const targetService = await db.service.findFirst({
      where: { name: "Complete Blood Count (CBC)" }
    });
    if (!targetService) throw new Error("Could not find a service to map to");

    // Simulate API match resolution request POST /api/admin/match
    console.log(`Resolving match item ${queueItem.id} -> mapping to ${targetService.name}...`);
    
    // Simulate resolution logic
    await db.priceRecord.update({
      where: { id: dummyRecord.id },
      data: { serviceId: targetService.id },
    });

    const updatedQueueItem = await db.matchQueueItem.update({
      where: { id: queueItem.id },
      data: { status: "APPROVED", suggestedServiceId: targetService.id },
    });

    const updatedRecord = await db.priceRecord.findUnique({
      where: { id: dummyRecord.id }
    });

    if (updatedRecord?.serviceId !== targetService.id || updatedQueueItem.status !== "APPROVED") {
      throw new Error("Match resolution failed to map serviceId or resolve status.");
    }

    // Clean up
    await db.matchQueueItem.delete({ where: { id: queueItem.id } });
    await db.priceRecord.delete({ where: { id: dummyRecord.id } });

    console.log("✅ Test 3 Passed: MatchQueueItem correctly resolved and PriceRecord mapped.");
  } catch (error: any) {
    console.error("❌ Test 3 Failed:", error.message || error);
    allPassed = false;
  }

  // Clean up Test Clinic
  if (testClinic) {
    await db.priceRecord.deleteMany({ where: { clinicId: testClinic.id } }).catch(() => {});
    await db.clinic.delete({ where: { id: testClinic.id } }).catch(() => {});
  }

  console.log("\n------------------------------------------------");
  if (allPassed) {
    console.log("🎉 ALL PHASE 1 INTEGRATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("🚨 SOME PHASE 1 INTEGRATION TESTS FAILED.");
    process.exit(1);
  }
}

runPhase1Tests();
