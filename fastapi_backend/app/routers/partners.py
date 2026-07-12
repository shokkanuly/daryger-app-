"""
Partners router – CRUD for clinic/hospital partner records.
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Partner
from ..schemas import PartnerCreate, PartnerRead, PartnerUpdate

router = APIRouter()


@router.get("/", response_model=List[PartnerRead])
async def list_partners(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Partner).where(Partner.is_active == True).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=PartnerRead, status_code=status.HTTP_201_CREATED)
async def create_partner(payload: PartnerCreate, db: AsyncSession = Depends(get_db)):
    partner = Partner(id=uuid.uuid4(), **payload.model_dump(exclude_none=True))
    db.add(partner)
    await db.flush()
    return partner


@router.get("/{partner_id}", response_model=PartnerRead)
async def get_partner(partner_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner


@router.patch("/{partner_id}", response_model=PartnerRead)
async def update_partner(
    partner_id: uuid.UUID,
    payload: PartnerUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(partner, field, value)
    await db.flush()
    return partner


@router.delete("/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partner(partner_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    partner.is_active = False
    await db.flush()
