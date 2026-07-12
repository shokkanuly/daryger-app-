/**
 * Client-side prescription PDF generator using jsPDF.
 *
 * Production note: In a real deployment, prescription content should be
 * generated server-side, with the full text hashed (SHA-256) and stored
 * against the consultation record in the database. The hash allows
 * on-demand verification that the PDF hasn't been tampered with after
 * download — no blockchain required.
 */

export interface PrescriptionData {
  consultationId: string;
  patientName: string;
  patientTown: string | null;
  doctorName: string;
  doctorLicense: string | null;
  clinic: string;
  chiefComplaint: string | null;
  diagnosis: string;
  prescription: string;
  date: string;
}

export async function downloadPrescriptionPDF(data: PrescriptionData) {
  // Dynamic import keeps jsPDF out of the initial bundle
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Daryger", margin, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Telemedicine Platform · Karaganda Region · Қарағанды облысы", margin, 21);

  // ── Title ───────────────────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MEDICAL PRESCRIPTION / МЕДИЦИНАЛЫҚ РЕЦЕПТ", margin, 40);

  // ── Separator ───────────────────────────────────────────────────────────────
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, 44, pageW - margin, 44);

  // ── Patient & Doctor Info ────────────────────────────────────────────────────
  let y = 52;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("PATIENT INFORMATION", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${data.patientName}`, margin, y); y += 5;
  doc.text(`Location: ${data.patientTown ?? "—"}`, margin, y); y += 5;
  doc.text(`Date: ${data.date}`, margin, y); y += 5;
  doc.text(`Consultation ID: ${data.consultationId}`, margin, y); y += 10;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("PRESCRIBING DOCTOR", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`Dr. ${data.doctorName}`, margin, y); y += 5;
  doc.text(`Clinic: ${data.clinic}`, margin, y); y += 5;
  if (data.doctorLicense) {
    doc.text(`License: ${data.doctorLicense}`, margin, y); y += 5;
  }
  y += 5;

  // ── Separator ───────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Chief Complaint ──────────────────────────────────────────────────────────
  if (data.chiefComplaint) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("CHIEF COMPLAINT", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const complaintLines = doc.splitTextToSize(data.chiefComplaint, contentW);
    doc.text(complaintLines, margin, y);
    y += complaintLines.length * 5 + 5;
  }

  // ── Diagnosis ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("DIAGNOSIS", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const diagLines = doc.splitTextToSize(data.diagnosis, contentW);
  doc.text(diagLines, margin, y);
  y += diagLines.length * 5 + 8;

  // ── Prescription / Treatment Plan ──────────────────────────────────────────
  doc.setFillColor(240, 253, 250); // teal-50
  const rxBoxY = y;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("℞  PRESCRIPTION / TREATMENT PLAN", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const rxLines = doc.splitTextToSize(data.prescription, contentW - 4);
  const rxBoxH = rxLines.length * 5 + 10;
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin, rxBoxY - 4, contentW, rxBoxH, 3, 3, "F");
  doc.text(rxLines, margin + 2, y);
  y += rxBoxH + 10;

  // ── Signature Area ──────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y + 15, margin + 60, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Doctor Signature / Дәрігердің қолы", margin, y + 20);
  if (data.doctorLicense) {
    doc.text(`License No. ${data.doctorLicense}`, margin, y + 25);
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, pageH - 16, pageW, 16, "F");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This prescription was issued via Daryger Telemedicine Platform. Verify at daryger.kz using Consultation ID.",
    margin,
    pageH - 8
  );

  doc.save(`daryger-prescription-${data.consultationId.slice(-8)}.pdf`);
}
