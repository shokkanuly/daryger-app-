"""
SQLAlchemy ORM models for MedPartners.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class DocumentStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class UserRole(str, PyEnum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


# ---------------------------------------------------------------------------
# Partner (clinic / hospital)
# ---------------------------------------------------------------------------
class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    bin: Mapped[str | None] = mapped_column(String(12), unique=True)  # Kazakhstan BIN
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    documents: Mapped[list["PriceDocument"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan"
    )
    doctors: Mapped[list["Doctor"]] = relationship(back_populates="partner")


# ---------------------------------------------------------------------------
# Service catalogue
# ---------------------------------------------------------------------------
class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str | None] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    name_kz: Mapped[str | None] = mapped_column(String(512))
    category: Mapped[str | None] = mapped_column(String(255))
    subcategory: Mapped[str | None] = mapped_column(String(255))
    unit: Mapped[str | None] = mapped_column(String(50))  # e.g. "процедура"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    price_items: Mapped[list["PriceItem"]] = relationship(back_populates="service")


# ---------------------------------------------------------------------------
# Price document (uploaded archive / file)
# ---------------------------------------------------------------------------
class PriceDocument(Base):
    __tablename__ = "price_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id", ondelete="CASCADE")
    )
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(20))  # pdf, docx, xlsx…
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus), default=DocumentStatus.PENDING
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    effective_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    partner: Mapped["Partner"] = relationship(back_populates="documents")
    price_items: Mapped[list["PriceItem"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Individual price item extracted from a document
# ---------------------------------------------------------------------------
class PriceItem(Base):
    __tablename__ = "price_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("price_documents.id", ondelete="CASCADE")
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    raw_name: Mapped[str] = mapped_column(String(512), nullable=False)
    price_resident: Mapped[float | None] = mapped_column(Float)
    price_nonresident: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="KZT")
    match_score: Mapped[float | None] = mapped_column(Float)  # fuzzy score 0-1
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_unmatched: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("document_id", "raw_name", name="uq_doc_raw_name"),
    )

    document: Mapped["PriceDocument"] = relationship(back_populates="price_items")
    service: Mapped["Service | None"] = relationship(back_populates="price_items")


# ---------------------------------------------------------------------------
# Doctor profile
# ---------------------------------------------------------------------------
class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id", ondelete="SET NULL"), nullable=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[str | None] = mapped_column(String(255))
    experience_years: Mapped[int | None] = mapped_column(Integer)
    bio: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(1024))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="doctor_profile")
    partner: Mapped["Partner | None"] = relationship(back_populates="doctors")


# ---------------------------------------------------------------------------
# User account (patient / doctor / admin)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.PATIENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    doctor_profile: Mapped["Doctor | None"] = relationship(back_populates="user")
    saved_searches: Mapped[list["SavedSearch"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Saved searches (user profile feature)
# ---------------------------------------------------------------------------
class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    query: Mapped[str] = mapped_column(String(512), nullable=False)
    filters: Mapped[str | None] = mapped_column(Text)  # JSON-encoded filter state
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="saved_searches")
