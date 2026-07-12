# MedPartners FastAPI Backend

## Quick Start

### 1. Start the full stack with Docker
```bash
docker compose up --build
```
The API will be available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### 2. Local development (without Docker)

**Prerequisites:** Python 3.11+, PostgreSQL, Redis

```bash
cd fastapi_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and edit env vars
cp ../.env.example .env

# Start the API
uvicorn app.main:app --reload --port 8000

# In another terminal, start the Celery worker
celery -A app.tasks.celery_app worker --loglevel=info
```

## Project Structure

```
fastapi_backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings (env-based)
│   ├── database.py          # Async SQLAlchemy engine
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── tasks.py             # Celery background tasks
│   └── routers/
│       ├── auth.py          # Register / Login / JWT
│       ├── partners.py      # Partner CRUD
│       ├── services.py      # Service catalogue
│       ├── doctors.py       # Doctor profiles
│       ├── users.py         # User profiles + saved searches
│       ├── search.py        # Price comparison search
│       └── admin.py         # Upload, queue, stats
│   └── parser_service/
│       ├── parser.py        # Unified parse_file() entry point
│       ├── docling_adapter.py  # Docling wrapper
│       ├── normalizer.py    # Fuzzy service matching (RapidFuzz)
│       └── validator.py     # Business-rule validation
scripts/
└── load_service_catalogue.py   # Load service catalogue from XLSX/JSON
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create user account |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET/POST/PATCH/DELETE | `/api/v1/partners/` | Partner management |
| GET/POST/PATCH | `/api/v1/services/` | Service catalogue |
| GET/POST/PATCH/DELETE | `/api/v1/doctors/` | Doctor profiles |
| GET/PATCH | `/api/v1/users/{id}` | User profile |
| GET/POST/DELETE | `/api/v1/users/{id}/searches` | Saved searches |
| GET | `/api/v1/search/prices` | Price comparison |
| POST | `/api/v1/admin/upload/{partner_id}` | Upload price archive |
| GET | `/api/v1/admin/documents/{partner_id}` | Document queue |
| GET | `/api/v1/admin/unmatched` | Unmatched items |
| PATCH | `/api/v1/admin/price-items/{id}/match` | Manual match |
| GET | `/api/v1/admin/stats` | Dashboard stats |

## Loading the Service Catalogue
```bash
python scripts/load_service_catalogue.py --file path/to/catalogue.xlsx
```

## Environment Variables
See `.env.example` for all available variables.
