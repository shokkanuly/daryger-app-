"""
Parser package – unified entry point.

Usage:
    from app.parser_service.parser import parse_file
    items = parse_file("/path/to/price_list.pdf")
"""
from .docling_adapter import DoclingAdapter

_adapter = DoclingAdapter()


def parse_file(filepath: str) -> list[dict]:
    """
    Parse a price-list file (PDF, DOCX, XLSX, ZIP) using Docling.

    Returns a list of raw extracted dicts:
        [{"name": str, "price_resident": float|None, "price_nonresident": float|None, "currency": str}, ...]
    """
    return _adapter.extract(filepath)
