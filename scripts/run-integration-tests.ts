import "dotenv/config";
import { db } from "../src/lib/db";
import { logAction } from "../src/lib/audit";
import { putObject, getObject } from "../src/lib/storage";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

async function runTests() {
  console.log("🚀 Starting Phase 0 Integration Tests...\n");
  let allPassed = true;

  // 1. Database Connection & AuditLog Test
  try {
    console.log("⏳ Test 1: Testing PostgreSQL database connection & AuditLog...");
    const testActorId = "test-actor-123";
    const testAction = "TEST_INTEGRATION_RUN";
    const testEntity = "System";
    const testEntityId = "sys-001";
    const testMetadata = { browser: "integration-headless", success: true };

    // Write audit log
    await logAction(testActorId, testAction, testEntity, testEntityId, testMetadata);

    // Verify database record
    const auditRecord = await db.auditLog.findFirst({
      where: {
        actorId: testActorId,
        action: testAction,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!auditRecord) {
      throw new Error("Audit log record was not found in the database.");
    }

    if (auditRecord.entityId !== testEntityId || auditRecord.entity !== testEntity) {
      throw new Error("Audit log fields do not match inserted values.");
    }

    // Clean up
    await db.auditLog.delete({
      where: { id: auditRecord.id },
    });

    console.log("✅ Test 1 Passed: Database and AuditLog write/read/delete successful.");
  } catch (error: any) {
    console.error("❌ Test 1 Failed:", error.message || error);
    allPassed = false;
  }

  // 2. Object Storage (MinIO) Test
  try {
    console.log("\n⏳ Test 2: Testing local S3-compatible Object Storage (MinIO)...");
    const testKey = "integration-tests/sample-doc.txt";
    const testContent = "Daryger local S3 Integration Test Content - " + Date.now();
    const testContentType = "text/plain";

    // Upload to MinIO
    await putObject(testKey, testContent, testContentType);

    // Retrieve from MinIO
    const retrievedBytes = await getObject(testKey);
    if (!retrievedBytes) {
      throw new Error("Retrieved content from object storage is null.");
    }

    const retrievedString = Buffer.from(retrievedBytes).toString("utf-8");
    if (retrievedString !== testContent) {
      throw new Error(`Content mismatch! Expected "${testContent}", but got "${retrievedString}"`);
    }

    console.log("✅ Test 2 Passed: File successfully uploaded and retrieved from MinIO storage.");
  } catch (error: any) {
    console.error("❌ Test 2 Failed:", error.message || error);
    allPassed = false;
  }

  // 3. Queue & Worker Plumbing (BullMQ) Test
  let worker: Worker | null = null;
  let connection: Redis | null = null;
  try {
    console.log("\n⏳ Test 3: Testing BullMQ Queue & Worker plumbing...");
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    const testQueueName = "integration-test-queue";
    const queue = new Queue(testQueueName, { connection: connection as any });
    
    // Resolve when the job completes
    const jobPromise = new Promise<any>((resolve, reject) => {
      worker = new Worker(
        testQueueName,
        async (job) => {
          return { received: job.data.value, processedAt: new Date().toISOString() };
        },
        { connection: connection as any }
      );

      worker.on("completed", (job, result) => {
        resolve(result);
      });

      worker.on("failed", (job, err) => {
        reject(err);
      });
    });

    // Enqueue a job
    const testValue = "hello-daryger-plumbing";
    const job = await queue.add("test-job", { value: testValue });
    console.log(` enqueued job ${job.id} into ${testQueueName}...`);

    // Wait for worker to pick up and process
    const result = await Promise.race([
      jobPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Job execution timeout (10s)")), 10000))
    ]) as any;

    if (result.received !== testValue) {
      throw new Error(`Worker processed wrong job value. Expected "${testValue}", got "${result.received}"`);
    }

    console.log("✅ Test 3 Passed: Queue job successfully pushed, processed by worker, and completed.");
  } catch (error: any) {
    console.error("❌ Test 3 Failed:", error.message || error);
    allPassed = false;
  } finally {
    // Clean up BullMQ connections
    if (worker) {
      await (worker as Worker).close();
    }
    if (connection) {
      connection.disconnect();
    }
  }

  console.log("\n------------------------------------------------");
  if (allPassed) {
    console.log("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! Phase 0 Infrastructure is verified.");
    process.exit(0);
  } else {
    console.error("🚨 SOME INTEGRATION TESTS FAILED. Please check infrastructure logs.");
    process.exit(1);
  }
}

runTests();
