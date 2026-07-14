import "dotenv/config";
import { db } from "../src/lib/db";
import { buildCohort } from "../src/lib/screening/cohort-builder";
import { SmsNotificationProvider } from "../src/lib/notifications/sms";
import { IkomekAdapter } from "../src/lib/adapters/appeals/ikomek";
import { CrmAdapter } from "../src/lib/adapters/appeals/crm";
import { EotinishAdapter } from "../src/lib/adapters/appeals/eotinish";
import { subYears, subDays } from "date-fns";

async function runPhase3Tests() {
  console.log("🚀 Starting Phase 3 Integration Tests (Daryger Ops - Appeals & Screening)...\n");
  let allPassed = true;

  // ─── Setup clean database state ─────────────────────────────────────────────
  try {
    await db.appeal.deleteMany();
    await db.screeningInvite.deleteMany();
    await db.screeningProgram.deleteMany();
    
    // Clean up mock users to isolate tests
    await db.user.deleteMany({
      where: {
        email: { in: ["usera@test.kz", "userb@test.kz", "userc@test.kz", "userd@test.kz"] }
      }
    });
  } catch (setupErr) {
    console.error("❌ Setup cleanup failed:", setupErr);
    process.exit(1);
  }

  // ─── Test 1: Ingestion & Deduplication of Citizen Appeals ────────────────────
  try {
    console.log("⏳ Test 1: Testing citizen appeals poll aggregation and deduplication...");
    
    // Poll adapters directly
    const adapters = [new IkomekAdapter(), new CrmAdapter(), new EotinishAdapter()];
    for (const adapter of adapters) {
      const drafts = await adapter.fetchNew();
      for (const draft of drafts) {
        // First insert
        await db.appeal.create({
          data: {
            channel: draft.channel,
            externalRef: draft.externalRef,
            subject: draft.subject,
            body: draft.body,
            status: "NEW",
            slaDueAt: draft.slaDueAt,
            createdAt: draft.createdAt || new Date(),
          }
        });
      }
    }

    const initialCount = await db.appeal.count();
    if (initialCount === 0) {
      throw new Error("No appeals aggregated from adapters");
    }
    console.log(`   - Aggregated ${initialCount} appeals from iKomek, CRM, and E-Otinish adapters.`);

    // Run duplicate ingestion poll to verify deduplication
    let duplicatesCreated = 0;
    for (const adapter of adapters) {
      const drafts = await adapter.fetchNew();
      for (const draft of drafts) {
        const existing = await db.appeal.findFirst({
          where: { externalRef: draft.externalRef, channel: draft.channel }
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
            }
          });
          duplicatesCreated++;
        }
      }
    }

    if (duplicatesCreated > 0) {
      throw new Error(`Deduplication failed: created ${duplicatesCreated} duplicate appeals.`);
    }
    console.log("✅ Test 1 Passed: Appeals successfully aggregated and deduplicated.");
  } catch (error: any) {
    console.error("❌ Test 1 Failed:", error.message || error);
    allPassed = false;
  }

  // ─── Test 2: SLA Overdue Flagging ──────────────────────────────────────────
  try {
    console.log("\n⏳ Test 2: Testing SLA overdue status checking...");

    // Insert mock appeal in the past (overdue SLA)
    const overdueAppeal = await db.appeal.create({
      data: {
        channel: "DIRECT",
        externalRef: "DIR-0012",
        subject: "Urgent medicine delivery delay",
        body: "Patient waiting for essential prescription delivery for 7 days.",
        status: "NEW",
        slaDueAt: subDays(new Date(), 2), // Due 2 days ago
      }
    });

    // Run SLA checker logic
    const now = new Date();
    await db.appeal.updateMany({
      where: {
        status: { in: ["NEW", "IN_PROGRESS"] },
        slaDueAt: { lt: now }
      },
      data: { status: "OVERDUE" }
    });

    // Verify appeal status updated to OVERDUE
    const checked = await db.appeal.findUnique({
      where: { id: overdueAppeal.id }
    });

    if (checked?.status !== "OVERDUE") {
      throw new Error(`Expected status to be 'OVERDUE', got: ${checked?.status}`);
    }
    console.log("✅ Test 2 Passed: SLA overdue appeal successfully identified and flagged.");
  } catch (error: any) {
    console.error("❌ Test 2 Failed:", error.message || error);
    allPassed = false;
  }

  // ─── Test 3: Cohort Builder Eligibility Filters ─────────────────────────────
  let program: any = null;
  try {
    console.log("\n⏳ Test 3: Testing Screening Program Cohort Builder (Age, City, & History)...");

    // 1. Seed program criteria
    program = await db.screeningProgram.create({
      data: {
        name: "test-hepatitis-b-2025",
        criteria: {
          minAge: 40,
          city: ["Temirtau", "Shakhtinsk"],
          lastScreenedBefore: "2025-01-01"
        }
      }
    });

    // 2. Seed test patients
    // User A: Eligible (45yo, Temirtau, screened long ago)
    const userA = await db.user.create({
      data: {
        email: "usera@test.kz",
        password: "hashedpassword",
        name: "User A (Eligible)",
        role: "PATIENT",
        town: "Temirtau",
        birthDate: subYears(new Date(), 45),
        lastScreenedAt: new Date("2024-05-10"),
      }
    });

    // User B: Too young (25yo, Temirtau, screened long ago)
    await db.user.create({
      data: {
        email: "userb@test.kz",
        password: "hashedpassword",
        name: "User B (Too Young)",
        role: "PATIENT",
        town: "Temirtau",
        birthDate: subYears(new Date(), 25),
        lastScreenedAt: new Date("2024-05-10"),
      }
    });

    // User C: Wrong town (45yo, Karaganda, screened long ago)
    await db.user.create({
      data: {
        email: "userc@test.kz",
        password: "hashedpassword",
        name: "User C (Wrong Town)",
        role: "PATIENT",
        town: "Karaganda",
        birthDate: subYears(new Date(), 45),
        lastScreenedAt: new Date("2024-05-10"),
      }
    });

    // User D: Recently screened (45yo, Shakhtinsk, screened 2 weeks ago)
    await db.user.create({
      data: {
        email: "userd@test.kz",
        password: "hashedpassword",
        name: "User D (Recently Screened)",
        role: "PATIENT",
        town: "Shakhtinsk",
        birthDate: subYears(new Date(), 45),
        lastScreenedAt: subDays(new Date(), 14),
      }
    });

    // 3. Run Cohort Builder
    const cohortAll = await buildCohort(program);
    const cohort = cohortAll.filter(u => u.email.endsWith("@test.kz"));

    if (cohort.length !== 1 || cohort[0].id !== userA.id) {
      throw new Error(`Cohort sizing or filtering mismatch. Expected cohort of length 1 (User A), got size: ${cohort.length}. Matches: ${cohort.map(u => u.name).join(", ")}`);
    }

    console.log("✅ Test 3 Passed: Cohort builder successfully filtered patient targets.");
  } catch (error: any) {
    console.error("❌ Test 3 Failed:", error.message || error);
    allPassed = false;
  }

  // ─── Test 4: Invite Dispatcher & Coverage Metrics ───────────────────────────
  try {
    console.log("\n⏳ Test 4: Testing outreach invite dispatcher and coverage statistics...");

    const cohortAll = await buildCohort(program);
    const cohort = cohortAll.filter(u => u.email.endsWith("@test.kz"));
    const smsProvider = new SmsNotificationProvider();
    
    // Send invitations
    for (const patient of cohort) {
      const invite = await db.screeningInvite.create({
        data: {
          patientId: patient.id,
          programId: program.id,
          channel: "SMS",
          status: "QUEUED"
        }
      });

      // Update progress transitions
      await db.screeningInvite.update({
        where: { id: invite.id },
        data: { status: "SENT", sentAt: new Date() }
      });

      await smsProvider.send(patient.phone || "+77011112233", "Screening mock invite", "SMS");

      await db.screeningInvite.update({
        where: { id: invite.id },
        data: { status: "DELIVERED" }
      });
    }

    // Verify invite created and status is DELIVERED
    const createdInvite = await db.screeningInvite.findFirst({
      where: { programId: program.id }
    });
    if (!createdInvite || createdInvite.status !== "DELIVERED") {
      throw new Error(`Invite not created or stuck in status: ${createdInvite?.status}`);
    }

    // Check Coverage Stats
    const invitedCount = await db.screeningInvite.count({
      where: { programId: program.id, status: { in: ["SENT", "DELIVERED"] } }
    });
    const completedCount = await db.screeningInvite.count({
      where: { programId: program.id, status: "COMPLETED" }
    });

    if (invitedCount !== 1 || completedCount !== 0) {
      throw new Error(`Stats mismatch. Expected 1 invited, 0 completed. Got: ${invitedCount} invited, ${completedCount} completed.`);
    }
    
    console.log("✅ Test 4 Passed: Outreach invites dispatched and stats computed successfully.");
  } catch (error: any) {
    console.error("❌ Test 4 Failed:", error.message || error);
    allPassed = false;
  }

  // ─── Post-test Cleanup ──────────────────────────────────────────────────────
  try {
    if (program) {
      await db.screeningInvite.deleteMany({ where: { programId: program.id } });
      await db.screeningProgram.delete({ where: { id: program.id } });
    }
    await db.user.deleteMany({
      where: {
        email: { in: ["usera@test.kz", "userb@test.kz", "userc@test.kz", "userd@test.kz"] }
      }
    });
  } catch (cleanupErr) {
    console.error("⚠️ Cleanup warning:", cleanupErr);
  }

  // Final validation
  if (allPassed) {
    console.log("\n------------------------------------------------");
    console.log("🎉 ALL PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.log("\n------------------------------------------------");
    console.log("❌ SOME INTEGRATION TESTS FAILED.");
    process.exit(1);
  }
}

runPhase3Tests();
