"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin, auth, doctors, partners, search, services, users


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    # Startup
    await init_db()
    yield
    # Shutdown (add cleanup here if needed)


app = FastAPI(
    title="MedPartners API",
    version="1.0.0",
    description="API for MedPartners price-list processing and MedServicePrice aggregation.",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS – allow the Next.js dev server and production domain
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://daryger.kz"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
PREFIX = settings.API_PREFIX

app.include_router(auth.router,     prefix=f"{PREFIX}/auth",     tags=["auth"])
app.include_router(partners.router, prefix=f"{PREFIX}/partners", tags=["partners"])
app.include_router(services.router, prefix=f"{PREFIX}/services", tags=["services"])
app.include_router(doctors.router,  prefix=f"{PREFIX}/doctors",  tags=["doctors"])
app.include_router(users.router,    prefix=f"{PREFIX}/users",    tags=["users"])
app.include_router(search.router,   prefix=f"{PREFIX}/search",   tags=["search"])
app.include_router(admin.router,    prefix=f"{PREFIX}/admin",    tags=["admin"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
