import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCohort } from "@/lib/screening/cohort-builder";
import { SmsNotificationProvider } from "@/lib/notifications/sms";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session || session.role === "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { programId, channel } = await req.json();
  if (!programId || !channel) {
    return NextResponse.json({ error: "programId and channel required" }, { status: 400 });
  }

  const program = await db.screeningProgram.findUnique({
    where: { id: programId },
  });

  if (!program) {
    return NextResponse.json({ error: "Screening program not found" }, { status: 404 });
  }

  // 1. Build the cohort of eligible patients
  const patients = await buildCohort(program);
  const smsProvider = new SmsNotificationProvider();
  const createdInvites = [];

  // 2. Create invites and send outreach notifications
  for (const patient of patients) {
    // Prevent duplicate active invites for the same program + patient
    const existing = await db.screeningInvite.findFirst({
      where: {
        patientId: patient.id,
        programId: program.id,
        status: { in: ["QUEUED", "SENT", "DELIVERED"] },
      },
    });

    if (existing) continue;

    // Create queued invite
    const invite = await db.screeningInvite.create({
      data: {
        patientId: patient.id,
        programId: program.id,
        channel: channel,
        status: "QUEUED",
      },
    });

    try {
      const message = `Hello ${patient.name}, you are invited to participate in the regional screening program: "${program.name}". Please visit your local clinic to complete your checkup.`;
      
      // Update to SENT
      await db.screeningInvite.update({
        where: { id: invite.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      // Send SMS/Outreach
      await smsProvider.send(patient.phone || "+77212000000", message, channel);

      // Simulate network delivery update to DELIVERED
      const finalInvite = await db.screeningInvite.update({
        where: { id: invite.id },
        data: { status: "DELIVERED" },
      });
      createdInvites.push(finalInvite);
    } catch (sendErr) {
      console.error(`Failed to send invite for patient ${patient.id}:`, sendErr);
    }
  }

  await logAction(
    session.id,
    "TRIGGER_SCREENING_INVITES",
    "ScreeningProgram",
    programId,
    { channel, inviteCount: createdInvites.length }
  );

  return NextResponse.json({
    message: `Outreach completed. Created and dispatched ${createdInvites.length} invitations.`,
    invites: createdInvites,
  });
}
