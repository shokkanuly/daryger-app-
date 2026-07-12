"""
Search router – price comparison across all partners.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Partner, PriceDocument, PriceItem, Service
from ..schemas import PriceSearchResult

router = APIRouter()


@router.get("/prices", response_model=List[PriceSearchResult])
async def search_prices(
    q: str = Query(..., description="Service name to search"),
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Search for medical service prices across all verified partner documents.
    Supports filtering by city, and price range.
    """
    stmt = (
        select(PriceItem, PriceDocument, Partner, Service)
        .join(PriceDocument, PriceItem.document_id == PriceDocument.id)
        .join(Partner, PriceDocument.partner_id == Partner.id)
        .outerjoin(Service, PriceItem.service_id == Service.id)
        .where(
            PriceItem.is_verified == True,
            PriceDocument.status == "done",
            Partner.is_active == True,
        )
        .where(PriceItem.raw_name.ilike(f"%{q}%"))
    )

    if city:
        stmt = stmt.where(Partner.city.ilike(f"%{city}%"))
    if min_price is not None:
        stmt = stmt.where(PriceItem.price_resident >= min_price)
    if max_price is not None:
        stmt = stmt.where(PriceItem.price_resident <= max_price)

    stmt = stmt.offset(skip).limit(limit)
    rows = await db.execute(stmt)

    results: List[PriceSearchResult] = []
    for price_item, document, partner, service in rows:
        results.append(
            PriceSearchResult(
                partner_id=partner.id,
                partner_name=partner.name,
                service_id=service.id if service else None,
                service_name=service.name if service else price_item.raw_name,
                raw_name=price_item.raw_name,
                price_resident=price_item.price_resident,
                price_nonresident=price_item.price_nonresident,
                currency=price_item.currency,
                effective_date=document.effective_date,
            )
        )
    return results
