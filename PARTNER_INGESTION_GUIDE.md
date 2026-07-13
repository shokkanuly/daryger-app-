# Partner Ingestion & Configuration Guide

This guide details the system requirements, environment variables, API configurations, and options for running the MedPartners Price Ingestion stack (PDF, DOCX, XLSX, OCR) in Daryger.

---

## 🔑 Required Environment Variables

Add the following variables to your local `.env` file for Next.js and Docker stack communication:

| Variable | Recommended Local Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://meduser:medpass@localhost:5432/medpartners?schema=public` | PostgreSQL connection string. |
| `REDIS_URL` | `redis://localhost:6379` | Connection URL for BullMQ job queue management. |
| `INGEST_SERVICE_URL` | `http://localhost:8000` | Endpoint of the stateless FastAPI ingestion parser. |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 API endpoint (MinIO locally). |
| `S3_BUCKET` | `daryger-documents` | Name of the bucket to store raw uploaded files. |
| `S3_ACCESS_KEY` | `minioadmin` | Access key for local MinIO storage. |
| `S3_SECRET_KEY` | `minioadmin` | Secret key for local MinIO storage. |

---

## 📄 Live Dashboard Metrics & Processing Pipeline

The Ingestion Portal now includes a **live dashboard** monitoring the processing pipeline:

1. **Dashboard Endpoint**: `GET /api/partners/dashboard/stats` returning:
   - `totalDocuments`: Total clinic price archives uploaded.
   - `pendingDocuments`: Total files in queue (`PENDING` or `PROCESSING`).
   - `totalRecords`: Number of active pricing records.
   - `normalizationRate`: Percentage of pricing lines successfully mapped to the catalog without anomalies.
   - `pendingQueueItems`: Queue length of unmatched listings.
2. **Live Auto-Update**: The dashboard and logs tracker auto-refresh every **4 seconds** using background polling. You can watch uploads transition from `PENDING` ➔ `PROCESSING` ➔ `DONE`/`NEEDS_REVIEW` in real-time.

---

## 🛠️ Docling Parsing Setup

The ingestion service includes a **hybrid parser system** with dynamic imports:

### Option A: Lightweight Offline Parsers (Active by Default)
Uses fast, native Python parsers (`pdfplumber`, `python-docx`, `openpyxl`, and offline `Tesseract-OCR` for scanned PDFs). This uses under 150MB of RAM and builds instantly.

### Option B: Docling (Advanced ML Layout Parser)
If you wish to parse using the advanced `Docling` neural layout library (extracts tables and paragraphs using machine learning layout analysis):

1. Run the install command inside your active container:
   ```bash
   docker exec -it daryger-ingest-1 pip install docling
   ```
2. Or add `docling` to `services/ingest/requirements.txt` and trigger a build:
   ```bash
   docker compose up -d --build ingest
   ```

*Note: The stateless service automatically detects the package. If Docling is present, it handles all uploads with Docling. If it is missing or fails, it falls back to Option A.*

---

## 🧪 Running Verification Tests

Run the full end-to-end verification suite covering document parsing, anomalies checks, exchange rate updates, and price versioning:

```bash
npm run test:phase2
```
