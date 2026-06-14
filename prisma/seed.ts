import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { addDays, format } from "date-fns";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const db = new PrismaClient({ adapter });

async function main() {
  await db.message.deleteMany();
  await db.consultation.deleteMany();
  await db.appointment.deleteMany();
  await db.timeSlot.deleteMany();
  await db.doctorProfile.deleteMany();
  await db.user.deleteMany();

  const password = await bcrypt.hash("demo123", 10);

  const patient = await db.user.create({
    data: {
      email: "patient@daryger.kz",
      password,
      name: "Aigerim Suleimenova",
      role: "PATIENT",
      town: "Shakhtinsk",
      phone: "+7 721 555 0101",
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

  console.log("Seed complete!");
  console.log("Patient: patient@daryger.kz / demo123");
  console.log("Doctor:  doctor@daryger.kz / demo123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
