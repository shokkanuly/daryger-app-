"""
Services router – CRUD for the master service catalogue.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Service
from ..schemas import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter()


@router.get("/", response_model=List[ServiceRead])
async def list_services(
    q: Optional[str] = Query(None, description="Filter by name"),
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Service).where(Service.is_active == True)
    if q:
        stmt = stmt.where(
            or_(
                Service.name.ilike(f"%{q}%"),
                Service.name_kz.ilike(f"%{q}%"),
            )
        )
    if category:
        stmt = stmt.where(Service.category.ilike(f"%{category}%"))

    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(payload: ServiceCreate, db: AsyncSession = Depends(get_db)):
    service = Service(id=uuid.uuid4(), **payload.model_dump(exclude_none=True))
    db.add(service)
    await db.flush()
    return service


@router.get("/{service_id}", response_model=ServiceRead)
async def get_service(service_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.patch("/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(service, field, value)
    await db.flush()
    return service
