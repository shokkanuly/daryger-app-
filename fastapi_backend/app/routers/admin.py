"""
Admin router – document upload, processing queue, unmatched items, stats.
"""
import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import DocumentStatus, Partner, PriceDocument, PriceItem
from ..schemas import ArchiveUploadResponse, PriceDocumentRead, PriceItemManualMatch, PriceItemRead

router = APIRouter()


# ---------------------------------------------------------------------------
# Upload a price-list archive (ZIP / PDF / DOCX / XLSX)
# ---------------------------------------------------------------------------
@router.post(
    "/upload/{partner_id}",
    response_model=ArchiveUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_price_archive(
    partner_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Verify partner exists
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Partner not found")

    # Save file to disk
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(partner_id))
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    dest_path = os.path.join(upload_dir, f"{uuid.uuid4()}{file_ext}")

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create DB record
    doc = PriceDocument(
        id=uuid.uuid4(),
        partner_id=partner_id,
        original_filename=file.filename or "unknown",
        stored_path=dest_path,
        file_type=file_ext.lstrip(".") or None,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    await db.flush()

    # Enqueue Celery task (import lazily to avoid circular imports)
    try:
        from ..tasks import process_price_document
        task = process_price_document.delay(str(doc.id))
        task_id = task.id
    except Exception:
        task_id = "celery-unavailable"

    return ArchiveUploadResponse(
        document_id=doc.id,
        task_id=task_id,
        message="File received – processing started in background.",
    )


# ---------------------------------------------------------------------------
# List documents for a partner
# ---------------------------------------------------------------------------
@router.get("/documents/{partner_id}", response_model=List[PriceDocumentRead])
async def list_documents(
    partner_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceDocument)
        .where(PriceDocument.partner_id == partner_id)
        .order_by(PriceDocument.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# List unmatched price items (verification queue)
# ---------------------------------------------------------------------------
@router.get("/unmatched", response_model=List[PriceItemRead])
async def list_unmatched(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceItem)
        .where(PriceItem.is_unmatched == True)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Manually match a price item to a service
# ---------------------------------------------------------------------------
@router.patch("/price-items/{item_id}/match", response_model=PriceItemRead)
async def manual_match(
    item_id: uuid.UUID,
    payload: PriceItemManualMatch,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PriceItem).where(PriceItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Price item not found")

    item.service_id = payload.service_id
    item.is_unmatched = False
    item.is_verified = True
    item.match_score = 1.0
    await db.flush()
    return item


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_partners = await db.scalar(select(func.count()).select_from(Partner))
    total_docs = await db.scalar(select(func.count()).select_from(PriceDocument))
    pending_docs = await db.scalar(
        select(func.count())
        .select_from(PriceDocument)
        .where(PriceDocument.status == DocumentStatus.PENDING)
    )
    unmatched_items = await db.scalar(
        select(func.count())
        .select_from(PriceItem)
        .where(PriceItem.is_unmatched == True)
    )
    return {
        "total_partners": total_partners,
        "total_documents": total_docs,
        "pending_documents": pending_docs,
        "unmatched_price_items": unmatched_items,
    }
