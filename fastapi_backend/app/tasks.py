"""
Celery task definitions for background document processing.
"""
import logging
import os
from datetime import datetime, timezone

from celery import Celery

from .config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "medpartners",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_price_document(self, document_id: str):  # type: ignore[override]
    """
    Main Celery task:
    1. Load the PriceDocument record.
    2. Parse the stored file with Docling.
    3. Normalise & validate extracted price items.
    4. Persist results to the database.
    """
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    from .database import AsyncSessionLocal
    from .models import DocumentStatus, PriceDocument, PriceItem, Service
    from .parser_service.parser import parse_file
    from .parser_service.normalizer import match_service
    from .parser_service.validator import validate_items

    async def _run():
        async with AsyncSessionLocal() as db:
            # 1. Fetch document
            result = await db.execute(
                select(PriceDocument).where(PriceDocument.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                logger.error("Document %s not found", document_id)
                return

            doc.status = DocumentStatus.PROCESSING
            await db.commit()

            try:
                # 2. Parse
                raw_items = parse_file(doc.stored_path)

                # 3. Load service catalogue for matching
                services_result = await db.execute(select(Service))
                services = services_result.scalars().all()

                # 4. Validate
                valid_items = validate_items(raw_items)

                # 5. Match & persist
                for item in valid_items:
                    matched_service, score = match_service(item["name"], services)
                    price_item = PriceItem(
                        document_id=doc.id,
                        service_id=matched_service.id if matched_service else None,
                        raw_name=item["name"],
                        price_resident=item.get("price_resident"),
                        price_nonresident=item.get("price_nonresident"),
                        currency=item.get("currency", "KZT"),
                        match_score=score,
                        is_unmatched=(matched_service is None),
                        is_verified=(score >= settings.SIMILARITY_THRESHOLD if score else False),
                    )
                    db.add(price_item)

                doc.status = DocumentStatus.DONE
                doc.processed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info("Document %s processed successfully (%d items)", document_id, len(valid_items))

            except Exception as exc:
                doc.status = DocumentStatus.ERROR
                doc.error_message = str(exc)
                await db.commit()
                logger.exception("Error processing document %s", document_id)
                raise self.retry(exc=exc)

    asyncio.run(_run())
