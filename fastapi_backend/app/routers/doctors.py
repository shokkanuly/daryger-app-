"""
Doctors router – CRUD for doctor profiles.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Doctor
from ..schemas import DoctorCreate, DoctorRead, DoctorUpdate

router = APIRouter()


@router.get("/", response_model=List[DoctorRead])
async def list_doctors(
    partner_id: Optional[uuid.UUID] = None,
    specialization: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Doctor).where(Doctor.is_active == True)
    if partner_id:
        stmt = stmt.where(Doctor.partner_id == partner_id)
    if specialization:
        stmt = stmt.where(Doctor.specialization.ilike(f"%{specialization}%"))
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
async def create_doctor(payload: DoctorCreate, db: AsyncSession = Depends(get_db)):
    doctor = Doctor(id=uuid.uuid4(), **payload.model_dump(exclude_none=True))
    db.add(doctor)
    await db.flush()
    return doctor


@router.get("/{doctor_id}", response_model=DoctorRead)
async def get_doctor(doctor_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.patch("/{doctor_id}", response_model=DoctorRead)
async def update_doctor(
    doctor_id: uuid.UUID,
    payload: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(doctor, field, value)
    await db.flush()
    return doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doctor(doctor_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_active = False
    await db.flush()
