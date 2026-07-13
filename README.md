# Daryger (Дәрiger) 🏥

Telemedicine platform for the Karaganda region — connecting residents of remote towns (such as Shakhtinsk, Saran, Abay) to quality healthcare via automated triage, low-bandwidth tele-consultations, real-time WebRTC video calls, and priority clinic appointment routing.

Built for the **Terricon Valley** incubator pitch.

---

## 🏔️ The Problem (Karaganda Region Context)

In the remote towns and industrial suburbs of the Karaganda region, residents face a critical shortage of local medical specialists. Getting quality care usually requires traveling long distances to the regional center of Karaganda, resulting in significant travel costs, lost working hours, and delayed treatments. 

**Daryger** bridges this gap. It enables patients in remote areas to complete automated, AI-powered triage and connect directly with verified specialists in regional hospitals—using low-bandwidth optimizations to ensure stable video and chat connections even over rural mobile networks.

---

## 👥 User Personas & Journeys

### 👩‍💼 Patient: Aigerim Suleimenova (from Shakhtinsk)
* **Goal:** Wants reliable advice for her toddler's persistent fever without making a full-day trip to Karaganda.
* **Journey:**
  1. Opens Daryger and selects **Get Medical Help**.
  2. Completes the bilingual (Kazakh/Russian) triage wizard.
  3. Receives an automated urgency level recommendation.
  4. Connects in real-time to a Karaganda regional doctor via text chat and a **Daily.co WebRTC video room**.
  5. Obtains a digital prescription and schedules a priority in-person follow-up appointment at the regional clinic.

### 👨‍⚕️ Doctor: Dr. Alim Alimov (GP at Regional Hospital Karaganda)
* **Goal:** Triage and consult remote patients efficiently, document clinical notes, and manage appointments.
* **Journey:**
  1. Logs into the **Doctor Dashboard**.
  2. Views the patient queue sorted dynamically by urgency level.
  3. Opens Aigerim's consultation card to inspect symptoms, triage data, and Gemini-analyzed concerns.
  4. Initiates a chat/video consultation.
  5. Completes the session by entering a diagnosis and prescription, which automatically generates a downloadable PDF and saves log details in the system.

---

## ⚡ Low-Bandwidth & Offline Design Choices

* **AI Triage with Local Fallback**: When internet connections are unstable, or the Gemini API is unreachable, the system automatically falls back to a deterministic, local rule-based engine to assign urgency levels (LOW, MEDIUM, HIGH, EMERGENCY).
* **Text-First Consultations**: Consultations default to lightweight socket-based text chat, allowing communication even on weak 3G signals. WebRTC video calls can be initiated selectively by the doctor.
* **Client-Side Document Generator**: Prescription PDFs are generated directly in the browser using `jsPDF`, eliminating server overhead and minimizing bandwidth requirements for document retrieval.

---

## 🛠️ Infrastructure & Tech Stack

* **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS 4, language localization context (Kazakh, Russian).
* **Primary Database**: PostgreSQL (configured via Prisma 7 client), replacing the initial SQLite implementation to support production-scale persistence.
* **Triage AI Engine**: Gemini 2.5 Flash API (used for medical-questionnaire parsing, concern classification, and clinician routing).
* **Job Queue**: Redis + BullMQ (used for executing backend crawl tasks and document ingestion).
* **Object Storage**: S3-compatible client (MinIO setup locally for local price document uploads).
* **Video Consulting**: Daily.co API WebRTC sandbox.

---

## 🚀 Quick Start

**Important:** run all commands from the project folder.

### 1. Start Infrastructure Stack
Spin up the PostgreSQL database, Redis instance, and MinIO object storage:
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations
Initialize your PostgreSQL database schemas:
```bash
npm run db:migrate
```

### 4. Seed Demo Accounts & Services
Prepopulate the database with clinics, services, patients, and doctor roles:
```bash
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Integration Verification

Verify database connections, audit log creation, S3 upload/download, and BullMQ queue processing using our integration test suite:
```bash
npm run test:integration
```

---

## 👥 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Patient | patient@daryger.kz | demo123 |
| Doctor | doctor@daryger.kz | demo123 |
| Clinic Admin | ops@daryger.kz | demo123 |
| System Admin | admin@daryger.kz | demo123 |
