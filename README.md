# Daryger (Дәрiger)

Telemedicine platform for the Karaganda region — connecting residents of small towns and remote areas to quality healthcare via low-bandwidth tele-consultations, automated triage, and guaranteed clinic appointments.

Built for the **Terricon Valley** incubator pitch.

## Quick start

**Important:** run all commands from the project folder, not your home directory.

```bash
cd ~/Desktop/projects/it/daryger
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Or use the helper script:

```bash
cd ~/Desktop/projects/it/daryger
bash start.sh
```

Open [http://localhost:3000](http://localhost:3000)

> Daryger is a **Node.js / Next.js** app only. No Python, `pip`, or `backend/` folder is needed.

## Demo accounts

| Role    | Email               | Password |
|---------|---------------------|----------|
| Patient | patient@daryger.kz  | demo123  |
| Doctor  | doctor@daryger.kz   | demo123  |

## Features

### Patient portal (`/patient`)
- Automated triage wizard (Kazakh + English)
- Regional doctor routing
- Real-time text consultation chat
- Priority clinic appointment booking

### Doctor dashboard (`/doctor`)
- Consultation queue sorted by urgency
- Live chat with patients
- Clinical notes (diagnosis + prescription)
- Schedule and patient history

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Prisma 7** + SQLite
- **Tailwind CSS 4**
- JWT session auth (httpOnly cookies)

## Demo flow (Terricon pitch)

1. Sign in as **patient@daryger.kz** (from Shakhtinsk)
2. Click **Get medical help** → complete triage
3. System routes to Dr. Alimov in Karaganda
4. Chat with the doctor in real time
5. Sign in as **doctor@daryger.kz** in another tab → see the queue, reply, complete consultation
6. Book a follow-up appointment at a regional clinic

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Start development server |
| `npm run build`   | Production build         |
| `npm run db:seed` | Seed demo data           |
| `npm run db:reset`| Reset DB + re-seed       |
