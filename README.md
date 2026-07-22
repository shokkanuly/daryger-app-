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

---

## 🏛️ System Architecture Solution

**Daryger** implements a resilient hybrid microservices architecture engineered specifically for low-bandwidth mobile networks in rural Kazakhstan, intelligent medical triage, and real-time telehealth:

```
                          ┌───────────────────────────┐
                          │   Patient & Doctor Web    │
                          │   (Next.js 16 App Router) │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  Clinical AI Triage   │   │  Telehealth Engine    │   │ Document & Ingestion  │
│ - Gemini 2.5 Flash    │   │ - Daily.co WebRTC     │   │ - FastAPI Parser      │
│ - Local Fallback Engine│  │ - 3G Socket Text Chat │   │ - Docling ML Layout   │
│ - Bilingual (KK/RU)   │   │ - Browser jsPDF Presc.│   │ - Redis + BullMQ Queue│
└───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
            │                           │                           │
            └───────────────────────────┼───────────────────────────┘
                                        ▼
                   ┌──────────────────────────────────────────┐
                   │    PostgreSQL (Prisma ORM) & S3 Storage  │
                   │ (Users, Triage Queues, Catalog, Audit)  │
                   └──────────────────────────────────────────┘
```

### Key Architectural Pillars:
1. **Hybrid AI Triage & Deterministic Fallback**: Uses Gemini 2.5 Flash API for intelligent symptom extraction and concern analysis. If internet access drops or latency spikes in remote rural areas, the client seamlessly falls back to an offline local rule engine for urgency classification (LOW, MEDIUM, HIGH, EMERGENCY).
2. **Low-Bandwidth Telehealth Pipeline**: Defaults to hyper-lightweight text/JSON sockets, enabling doctor consultations even over unstable 3G connections. WebRTC video calls (Daily.co) are initiated on-demand by the doctor.
3. **Stateless Async Ingestion Pipeline**: Processing of clinic price lists, catalog documents (PDF, DOCX, XLSX, OCR) runs through a stateless FastAPI microservice using Docling ML layout analysis backed by Redis + BullMQ queues and S3 MinIO storage.

---

## 💎 Platform Benefits

### 👩‍🌾 For Rural Citizens & Patients
* **Eliminates Long Travel Burden**: Patients in Shakhtinsk, Saran, Abay, and remote districts consult regional specialists without traveling 50–100 km to Karaganda.
* **Instant Bilingual AI Triage**: Immediate urgency assessment (in Kazakh or Russian) 24/7.
* **Low-Bandwidth Accessibility**: Works seamlessly even on weak 3G mobile signals.
* **Instant Digital Prescriptions**: Receive signed digital prescriptions directly on mobile without waiting in line.

### 👨‍⚕️ For Doctors & Regional Hospitals
* **Prioritized Workflows**: Dynamic triage queues route emergency and high-priority patients first.
* **AI Diagnostic Summaries**: Reduces consultation prep time by 5-10 minutes per patient through pre-summarized symptoms.
* **Integrated Record Keeping**: Automated digital prescriptions, clinical notes, and audit logs stored securely in PostgreSQL.

### 🏛️ For Akimat & Regional Government (Управление Здравоохранения)
* **Equal Healthcare Access**: Reduces urban-rural health disparities in Karaganda region.
* **Optimized Municipal Spending**: Cuts non-emergency transport subsidies and hospital triage overhead by up to 35%.
* **Real-Time Regional Analytics**: Aggregates anonymized symptom heatmaps for early epidemic warning and resource allocation.
* **Scalable Infrastructure**: Microservices-based and ready for regional e-Health / Damumed integration.

---

## 📣 Akimat Pitch & Executive Presentation

A complete 1-2 minute presentation pitch tailored for Akimat (in Kazakh and Russian) along with a 1-pager executive summary slide deck is available in:
👉 **[AKIMAT_PITCH_AND_PRESENTATION.md](file:///Users/aibek/Desktop/projects/clear%20projects%20/daryger/AKIMAT_PITCH_AND_PRESENTATION.md)**

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
