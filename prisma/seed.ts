import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { addDays, format } from "date-fns";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const db = new PrismaClient({ adapter });


async function main() {
  await db.appeal.deleteMany();
  await db.screeningInvite.deleteMany();
  await db.screeningProgram.deleteMany();
  await db.message.deleteMany();
  await db.consultation.deleteMany();
  await db.appointment.deleteMany();
  await db.timeSlot.deleteMany();
  await db.doctorProfile.deleteMany();
  await db.user.deleteMany();
  await db.priceRecord.deleteMany();
  await db.matchQueueItem.deleteMany();
  await db.rawCapture.deleteMany();
  await db.clinic.deleteMany();
  await db.service.deleteMany();

  const password = await bcrypt.hash("demo123", 10);

  const patient = await db.user.create({
    data: {
      email: "patient@daryger.kz",
      password,
      name: "Aigerim Suleimenova",
      role: "PATIENT",
      town: "Shakhtinsk",
      phone: "+7 721 555 0101",
      birthDate: new Date("1998-05-15"),
      lastScreenedAt: new Date("2023-11-10"),
    },
  });

  const patient2 = await db.user.create({
    data: {
      email: "aibek@example.kz",
      password,
      name: "Aibek Nurpeisov",
      role: "PATIENT",
      town: "Temirtau",
      phone: "+7 721 555 0202",
      birthDate: new Date("1981-08-20"),
      lastScreenedAt: new Date("2022-04-05"),
    },
  });

  const doctorUser = await db.user.create({
    data: {
      email: "doctor@daryger.kz",
      password,
      name: "Dr. Alim Alimov",
      role: "DOCTOR",
      town: "Karaganda",
      phone: "+7 721 555 0303",
    },
  });

  const doctor2User = await db.user.create({
    data: {
      email: "dr.sara@daryger.kz",
      password,
      name: "Dr. Sara Kassymova",
      role: "DOCTOR",
      town: "Karaganda",
      phone: "+7 721 555 0404",
    },
  });

  const doctorProfile = await db.doctorProfile.create({
    data: {
      userId: doctorUser.id,
      specialty: "General Practitioner",
      clinic: "Regional Hospital Karaganda",
      region: "Karaganda",
      isAvailable: true,
      licenseNumber: "KZ-GP-2024-00123",
      isVerified: true,
      bio: "15 years experience serving Karaganda region. Specializes in remote patient care.",
    },
  });

  const doctor2Profile = await db.doctorProfile.create({
    data: {
      userId: doctor2User.id,
      specialty: "Pediatrician",
      clinic: "City Polyclinic No. 3",
      region: "Karaganda",
      isAvailable: true,
      licenseNumber: "KZ-PD-2024-00456",
      isVerified: true,
      bio: "Pediatric specialist available for tele-consultations across the region.",
    },
  });

  const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
  for (let i = 1; i <= 7; i++) {
    const date = format(addDays(new Date(), i), "yyyy-MM-dd");
    for (const doctor of [doctorProfile, doctor2Profile]) {
      for (const time of times) {
        await db.timeSlot.create({
          data: { doctorId: doctor.id, date, time, isBooked: false },
        });
      }
    }
  }

  const consultation = await db.consultation.create({
    data: {
      patientId: patient.id,
      doctorId: doctorUser.id,
      status: "COMPLETED",
      urgency: "MEDIUM",
      chiefComplaint: "Fever / Cold symptoms",
      symptoms: "Runny nose, mild fever 37.8°C, sore throat for 2 days",
      triageData: JSON.stringify({ chief_complaint: "fever", duration: "days", severity: "moderate" }),
      diagnosis: "Acute viral upper respiratory infection",
      prescription: "Rest, fluids, paracetamol 500mg as needed",
      followupApproved: true,
    },
  });

  await db.message.createMany({
    data: [
      { consultationId: consultation.id, senderId: patient.id, content: "Hello doctor, I've had a fever and sore throat for 2 days." },
      { consultationId: consultation.id, senderId: doctorUser.id, content: "Hello Aigerim. Any difficulty breathing or chest pain?" },
      { consultationId: consultation.id, senderId: patient.id, content: "No, just the fever and throat pain." },
      { consultationId: consultation.id, senderId: doctorUser.id, content: "This looks like a viral infection. Rest and paracetamol. Come in if fever exceeds 38.5°C for 3 days." },
    ],
  });

  await db.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor2User.id,
      date: format(addDays(new Date(), 3), "yyyy-MM-dd"),
      time: "10:00",
      type: "IN_PERSON",
      status: "SCHEDULED",
      clinic: "City Polyclinic No. 3",
      notes: "Pediatric check-up — priority slot from tele-triage",
    },
  });

  await db.user.create({
    data: {
      email: "ops@daryger.kz",
      password,
      name: "Ops Manager",
      role: "CLINIC_ADMIN",
      town: "Karaganda",
      phone: "+7 721 555 0505",
    },
  });

  await db.user.create({
    data: {
      email: "partner@daryger.kz",
      password,
      name: "Partner Operator",
      role: "PARTNER_OPERATOR",
      town: "Karaganda",
      phone: "+7 721 555 0606",
    },
  });

  await db.user.create({
    data: {
      email: "finance@daryger.kz",
      password,
      name: "Finance Analyst",
      role: "FINANCE_ANALYST",
      town: "Karaganda",
      phone: "+7 721 555 0707",
    },
  });

  await db.user.create({
    data: {
      email: "hr@daryger.kz",
      password,
      name: "HR Specialist",
      role: "HR_ANALYST",
      town: "Karaganda",
      phone: "+7 721 555 0808",
    },
  });

  await db.user.create({
    data: {
      email: "admin@daryger.kz",
      password,
      name: "System Admin",
      role: "SYSTEM_ADMIN",
      town: "Karaganda",
      phone: "+7 721 555 0909",
    },
  });

  // Seeding standard services
  const fs = require("fs");
  const path = require("path");
  const servicesData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/services.json"), "utf-8")
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

  // Seeding clinics
  await db.clinic.create({
    data: {
      name: "KDL Laboratory",
      city: "Karaganda",
      address: "Bukhara-Zhyrau Ave 45",
      phone: "+7 (7212) 50-60-70",
      workingHours: "08:00 - 18:00",
      sourceUrl: "https://kdl.kz",
      sourceType: "PUBLIC",
      lat: 49.8056,
      lng: 73.0858,
    },
  });

  await db.clinic.create({
    data: {
      name: "Invitro Clinic",
      city: "Karaganda",
      address: "Nazarbayev Ave 28",
      phone: "+7 (7212) 40-50-60",
      workingHours: "07:30 - 19:00",
      sourceUrl: "https://invitro.kz",
      sourceType: "PUBLIC",
      lat: 49.8065,
      lng: 73.0822,
    },
  });

  await db.clinic.create({
    data: {
      name: "Doq Diagnostic Center",
      city: "Karaganda",
      address: "Ermekov St 52",
      phone: "+7 (7212) 30-40-50",
      workingHours: "08:00 - 20:00",
      sourceUrl: "https://doq.kz",
      sourceType: "PUBLIC",
      lat: 49.7995,
      lng: 73.0901,
    },
  });

  // Seeding Screening Programs
  await db.screeningProgram.create({
    data: {
      name: "hepatitis-b-2025",
      criteria: {
        minAge: 40,
        city: ["Temirtau", "Shakhtinsk"],
        lastScreenedBefore: "2025-01-01",
      },
    },
  });

  console.log("Seed complete!");
  console.log("Patient: patient@daryger.kz / demo123");
  console.log("Doctor:  doctor@daryger.kz / demo123");
  console.log("Ops:     ops@daryger.kz / demo123");
  console.log("Partner: partner@daryger.kz / demo123");
  console.log("Finance: finance@daryger.kz / demo123");
  console.log("HR:      hr@daryger.kz / demo123");
  console.log("Admin:   admin@daryger.kz / demo123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
