"""
Users router – profile management and saved searches.
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import SavedSearch, User
from ..schemas import SavedSearchCreate, SavedSearchRead, UserRead, UserUpdate

router = APIRouter()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.flush()
    return user


# ---------------------------------------------------------------------------
# Saved searches
# ---------------------------------------------------------------------------
@router.get("/{user_id}/searches", response_model=List[SavedSearchRead])
async def list_saved_searches(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SavedSearch).where(SavedSearch.user_id == user_id)
    )
    return result.scalars().all()


@router.post(
    "/{user_id}/searches",
    response_model=SavedSearchRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_saved_search(
    user_id: uuid.UUID,
    payload: SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
):
    saved = SavedSearch(id=uuid.uuid4(), user_id=user_id, **payload.model_dump())
    db.add(saved)
    await db.flush()
    return saved


@router.delete("/{user_id}/searches/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_search(
    user_id: uuid.UUID,
    search_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id, SavedSearch.user_id == user_id
        )
    )
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")
    await db.delete(saved)
    await db.flush()
