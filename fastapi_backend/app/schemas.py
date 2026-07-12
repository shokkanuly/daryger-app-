"""
Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import DocumentStatus, UserRole


# ---------------------------------------------------------------------------
# Shared base config
# ---------------------------------------------------------------------------
class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TokenRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Partner
# ---------------------------------------------------------------------------
class PartnerCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    bin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None


class PartnerUpdate(PartnerCreate):
    name: Optional[str] = None


class PartnerRead(OrmBase):
    id: uuid.UUID
    name: str
    legal_name: Optional[str] = None
    bin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class ServiceCreate(BaseModel):
    code: Optional[str] = None
    name: str
    name_kz: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit: Optional[str] = None


class ServiceUpdate(ServiceCreate):
    name: Optional[str] = None


class ServiceRead(OrmBase):
    id: uuid.UUID
    code: Optional[str] = None
    name: str
    name_kz: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit: Optional[str] = None
    is_active: bool


# ---------------------------------------------------------------------------
# Price Document
# ---------------------------------------------------------------------------
class PriceDocumentRead(OrmBase):
    id: uuid.UUID
    partner_id: uuid.UUID
    original_filename: str
    file_type: Optional[str] = None
    status: DocumentStatus
    error_message: Optional[str] = None
    effective_date: Optional[datetime] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None


class ArchiveUploadResponse(BaseModel):
    document_id: uuid.UUID
    task_id: str
    message: str


# ---------------------------------------------------------------------------
# Price Item
# ---------------------------------------------------------------------------
class PriceItemRead(OrmBase):
    id: uuid.UUID
    document_id: uuid.UUID
    service_id: Optional[uuid.UUID] = None
    raw_name: str
    price_resident: Optional[float] = None
    price_nonresident: Optional[float] = None
    currency: str
    match_score: Optional[float] = None
    is_verified: bool
    is_unmatched: bool
    created_at: datetime


class PriceItemManualMatch(BaseModel):
    service_id: uuid.UUID


# ---------------------------------------------------------------------------
# Doctor
# ---------------------------------------------------------------------------
class DoctorCreate(BaseModel):
    full_name: str
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    partner_id: Optional[uuid.UUID] = None


class DoctorUpdate(DoctorCreate):
    full_name: Optional[str] = None


class DoctorRead(OrmBase):
    id: uuid.UUID
    full_name: str
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    partner_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.PATIENT


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class UserRead(OrmBase):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Saved Search
# ---------------------------------------------------------------------------
class SavedSearchCreate(BaseModel):
    query: str
    filters: Optional[str] = None  # JSON string


class SavedSearchRead(OrmBase):
    id: uuid.UUID
    user_id: uuid.UUID
    query: str
    filters: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Search results
# ---------------------------------------------------------------------------
class PriceSearchResult(BaseModel):
    partner_id: uuid.UUID
    partner_name: str
    service_id: Optional[uuid.UUID] = None
    service_name: str
    raw_name: str
    price_resident: Optional[float] = None
    price_nonresident: Optional[float] = None
    currency: str
    effective_date: Optional[datetime] = None
