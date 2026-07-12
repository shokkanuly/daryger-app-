"""
Docling adapter – wraps the Docling document parsing library and converts
its structured output into the flat price-item format expected by the rest
of the pipeline.

Docling supports: PDF (native + scanned via OCR), DOCX, XLSX, PPTX, HTML.
"""
from __future__ import annotations

import logging
import os
import re
import zipfile
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

# Price pattern: digits with optional space thousands separator, decimal part
_PRICE_RE = re.compile(r"(\d[\d\s]*(?:[.,]\d+)?)")


def _parse_price(raw: str) -> Optional[float]:
    """Extract a float from a string like '1 200,50' or '3000.00'."""
    if not raw:
        return None
    raw = raw.strip().replace(" ", "").replace(",", ".")
    m = _PRICE_RE.search(raw)
    if m:
        try:
            return float(m.group(1).replace(" ", ""))
        except ValueError:
            return None
    return None


class DoclingAdapter:
    """
    Thin wrapper around the `docling` library.

    Falls back gracefully if docling is not installed (useful for CI without
    heavy ML dependencies).
    """

    def __init__(self):
        try:
            from docling.document_converter import DocumentConverter
            self._converter = DocumentConverter()
            self._available = True
            logger.info("Docling initialised successfully.")
        except ImportError:
            logger.warning(
                "Docling not installed – falling back to stub extraction. "
                "Install with: pip install docling"
            )
            self._converter = None
            self._available = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def extract(self, filepath: str) -> list[dict]:
        """
        Parse *filepath* and return a list of price-item dicts.

        Handles ZIP archives by extracting all contained files and parsing
        each one individually.
        """
        ext = os.path.splitext(filepath)[1].lower()

        if ext == ".zip":
            return self._extract_zip(filepath)
        return self._extract_single(filepath)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _extract_zip(self, zip_path: str) -> list[dict]:
        results: list[dict] = []
        with tempfile.TemporaryDirectory() as tmpdir:
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(tmpdir)
            for root, _, files in os.walk(tmpdir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    try:
                        results.extend(self._extract_single(fpath))
                    except Exception as exc:
                        logger.warning("Skipping %s: %s", fname, exc)
        return results

    def _extract_single(self, filepath: str) -> list[dict]:
        if self._available:
            return self._extract_with_docling(filepath)
        return self._stub_extract(filepath)

    def _extract_with_docling(self, filepath: str) -> list[dict]:
        """
        Use Docling's DocumentConverter to parse the file.
        Docling returns a structured document; we look for tables and
        extract rows as price items.
        """
        result = self._converter.convert(filepath)
        doc = result.document

        items: list[dict] = []

        # Iterate over tables in the document
        for table in doc.tables:
            rows = table.export_to_dataframe()
            items.extend(self._parse_dataframe_rows(rows))

        # If no tables found, fall back to text paragraph extraction
        if not items:
            for text_elem in doc.texts:
                row = self._parse_text_line(text_elem.text)
                if row:
                    items.append(row)

        return items

    def _parse_dataframe_rows(self, df) -> list[dict]:
        """
        Heuristically map DataFrame columns to (service_name, price_resident,
        price_nonresident).
        Supports both column-header-based and positional strategies.
        """
        import pandas as pd  # Docling depends on pandas

        items: list[dict] = []
        cols = [str(c).lower().strip() for c in df.columns]

        # Map column indices
        name_idx = self._find_col(cols, ["наименование", "услуга", "name", "service", "описание"])
        price_res_idx = self._find_col(cols, ["цена", "стоимость", "тариф", "price", "resident", "для граждан"])
        price_nonres_idx = self._find_col(cols, ["нерезидент", "non-resident", "иностранц"])

        for _, row in df.iterrows():
            values = list(row)
            name = str(values[name_idx]).strip() if name_idx is not None else None
            if not name or name.lower() in ("nan", "none", ""):
                continue

            price_res = _parse_price(str(values[price_res_idx])) if price_res_idx is not None else None
            price_nonres = _parse_price(str(values[price_nonres_idx])) if price_nonres_idx is not None else None

            # Fallback: if only one price column found, try next numeric column
            if price_res is None and price_nonres is None:
                for v in values:
                    p = _parse_price(str(v))
                    if p:
                        price_res = p
                        break

            items.append({
                "name": name,
                "price_resident": price_res,
                "price_nonresident": price_nonres,
                "currency": "KZT",
            })

        return items

    def _parse_text_line(self, line: str) -> Optional[dict]:
        """
        Try to extract a price item from a plain text line.
        Expected formats:
            "Service name ..... 1 200 тг"
            "Service name | 1200"
        """
        line = line.strip()
        if not line:
            return None

        # Split on common delimiters
        parts = re.split(r"\s{3,}|\||\t", line)
        if len(parts) < 2:
            return None

        name = parts[0].strip()
        price_raw = parts[-1]
        price = _parse_price(price_raw)

        if not name or price is None:
            return None

        return {
            "name": name,
            "price_resident": price,
            "price_nonresident": None,
            "currency": "KZT",
        }

    @staticmethod
    def _find_col(cols: list[str], keywords: list[str]) -> Optional[int]:
        for kw in keywords:
            for i, col in enumerate(cols):
                if kw in col:
                    return i
        return None

    # ------------------------------------------------------------------
    # Stub (when Docling is not installed)
    # ------------------------------------------------------------------
    def _stub_extract(self, filepath: str) -> list[dict]:
        logger.debug("Stub extraction for %s", filepath)
        return []
