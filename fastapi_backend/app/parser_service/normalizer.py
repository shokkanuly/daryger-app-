"""
Fuzzy-matching normalizer – maps raw service names extracted from documents
to canonical services in the master catalogue.

Uses RapidFuzz for fast string similarity.
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from rapidfuzz import fuzz, process as rf_process
    _RAPIDFUZZ_AVAILABLE = True
except ImportError:
    logger.warning("RapidFuzz not installed. Install with: pip install rapidfuzz")
    _RAPIDFUZZ_AVAILABLE = False

# Default similarity threshold (overridden by config)
DEFAULT_THRESHOLD = 0.75


def match_service(
    raw_name: str,
    services: list,
    threshold: float = DEFAULT_THRESHOLD,
) -> tuple[Optional[object], Optional[float]]:
    """
    Find the best matching Service object for *raw_name*.

    Args:
        raw_name:   Service name as extracted from the document.
        services:   List of SQLAlchemy Service ORM objects (must have .name attr).
        threshold:  Minimum similarity score (0-1) to accept a match.

    Returns:
        (matched_service, score) or (None, None) if no match above threshold.
    """
    if not services or not raw_name.strip():
        return None, None

    if not _RAPIDFUZZ_AVAILABLE:
        # Exact match fallback
        raw_lower = raw_name.lower().strip()
        for svc in services:
            if svc.name.lower().strip() == raw_lower:
                return svc, 1.0
        return None, None

    # Build lookup dict: canonical_name -> service object
    name_to_service = {svc.name: svc for svc in services}
    # Also index Kazakh names if available
    for svc in services:
        if getattr(svc, "name_kz", None):
            name_to_service[svc.name_kz] = svc

    choices = list(name_to_service.keys())

    # Use token_sort_ratio for robustness with word-order variations
    best_match = rf_process.extractOne(
        raw_name,
        choices,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold * 100,  # rapidfuzz uses 0-100 scale
    )

    if best_match is None:
        return None, None

    matched_name, score, _ = best_match
    normalized_score = score / 100.0
    return name_to_service[matched_name], normalized_score
