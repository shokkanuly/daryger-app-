"""
Business-rule validator for extracted price items.

Rules:
  1. price_resident must be > 0 if present.
  2. price_nonresident must be > 0 if present.
  3. At least one price (resident or non-resident) must be provided.
  4. Service name must not be empty.
  5. Duplicate (name + price_resident) pairs within the same batch are dropped.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def validate_items(raw_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Apply business-rule checks to a list of raw extracted items.

    Returns only the valid items (invalid ones are logged and skipped).
    """
    valid: list[dict[str, Any]] = []
    seen: set[tuple] = set()

    for item in raw_items:
        name = (item.get("name") or "").strip()

        # Rule 4: name must not be empty
        if not name:
            logger.debug("Skipping item with empty name")
            continue

        price_res = item.get("price_resident")
        price_nonres = item.get("price_nonresident")

        # Rule 3: at least one price must be present
        if price_res is None and price_nonres is None:
            logger.debug("Skipping '%s' – no price found", name)
            continue

        # Rule 1 & 2: prices must be positive
        if price_res is not None and price_res <= 0:
            logger.debug("Skipping '%s' – non-positive resident price: %s", name, price_res)
            continue
        if price_nonres is not None and price_nonres <= 0:
            logger.debug("Skipping '%s' – non-positive non-resident price: %s", name, price_nonres)
            continue

        # Rule 5: deduplicate within batch
        key = (name.lower(), price_res)
        if key in seen:
            logger.debug("Deduplicating '%s'", name)
            continue
        seen.add(key)

        valid.append({
            "name": name,
            "price_resident": price_res,
            "price_nonresident": price_nonres,
            "currency": item.get("currency", "KZT"),
        })

    logger.info("Validation: %d valid out of %d raw items", len(valid), len(raw_items))
    return valid
