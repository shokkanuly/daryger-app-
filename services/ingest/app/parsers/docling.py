import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

DOCLING_AVAILABLE = False
DocumentConverter = None

try:
    from docling.document_converter import DocumentConverter
    DOCLING_AVAILABLE = True
    logger.info("Docling imported successfully.")
except ImportError:
    logger.warning("Docling is not installed. Fallback parsers will be used.")

def _parse_price(raw: str) -> Optional[float]:
    if not raw:
        return None
    raw = re.sub(r'[^\d\.,]', '', raw).replace(",", ".")
    if not raw:
        return None
    parts = raw.split(".")
    if parts and 3 <= len(parts[0]) <= 7:
        try:
            return float(raw)
        except ValueError:
            return None
    return None

def _find_col(cols: List[str], keywords: List[str]) -> Optional[int]:
    for kw in keywords:
        for i, col in enumerate(cols):
            if kw in col:
                return i
    return None

def parse_with_docling(file_path: str) -> Optional[List[Dict]]:
    if not DOCLING_AVAILABLE or DocumentConverter is None:
        return None

    try:
        converter = DocumentConverter()
        result = converter.convert(file_path)
        doc = result.document

        items: List[Dict] = []

        # Iterate over tables in the document
        for table in doc.tables:
            df = table.export_to_dataframe()
            cols = [str(c).lower().strip() for c in df.columns]

            # Map column indices
            name_idx = _find_col(cols, ["наименование", "услуга", "name", "service", "описание"])
            price_res_idx = _find_col(cols, ["цена", "стоимость", "тариф", "price", "resident", "для граждан"])
            price_nonres_idx = _find_col(cols, ["нерезидент", "non-resident", "иностранц"])

            for _, row in df.iterrows():
                values = list(row)
                name = str(values[name_idx]).strip() if name_idx is not None else None
                if not name or name.lower() in ("nan", "none", ""):
                    continue

                price_res = _parse_price(str(values[price_res_idx])) if price_res_idx is not None else None
                price_nonres = _parse_price(str(values[price_nonres_idx])) if price_nonres_idx is not None else None

                # Fallback
                if price_res is None and price_nonres is None:
                    for v in values:
                        p = _parse_price(str(v))
                        if p:
                            price_res = p
                            break

                if name and len(name) > 4 and price_res is not None:
                    items.append({
                        "name": name,
                        "price_resident": price_res,
                        "price_nonresident": price_nonres if price_nonres is not None else price_res,
                        "currency": "KZT",
                    })

        # If no tables found, fall back to text paragraph extraction
        if not items:
            for text_elem in doc.texts:
                line = text_elem.text.strip()
                if not line or len(line) < 5:
                    continue

                parts = re.split(r"\s{3,}|\||\t", line)
                if len(parts) < 2:
                    continue

                name = parts[0].strip()
                price_raw = parts[-1]
                price = _parse_price(price_raw)

                if name and len(name) > 4 and price is not None:
                    items.append({
                        "name": name,
                        "price_resident": price,
                        "price_nonresident": price,
                        "currency": "KZT",
                    })

        return items
    except Exception as e:
        logger.error(f"Error parsing with docling: {e}")
        return None
