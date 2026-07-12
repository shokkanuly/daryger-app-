"""
Script to bulk-load the master service catalogue from an XLSX or JSON file.

Usage:
    python scripts/load_service_catalogue.py --file catalogue.xlsx
    python scripts/load_service_catalogue.py --file catalogue.json
"""
import argparse
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi_backend.app.database import AsyncSessionLocal, init_db
from fastapi_backend.app.models import Service


async def load_xlsx(filepath: str):
    import pandas as pd
    df = pd.read_excel(filepath)
    return df.to_dict("records")


async def load_json(filepath: str):
    with open(filepath) as f:
        return json.load(f)


async def main(filepath: str):
    ext = os.path.splitext(filepath)[1].lower()
    print(f"Loading catalogue from {filepath} ...")

    if ext in (".xlsx", ".xls"):
        records = await load_xlsx(filepath)
    elif ext == ".json":
        records = await load_json(filepath)
    else:
        print(f"Unsupported file type: {ext}")
        sys.exit(1)

    await init_db()

    async with AsyncSessionLocal() as db:
        created = 0
        for rec in records:
            service = Service(
                code=rec.get("code") or rec.get("Код"),
                name=rec.get("name") or rec.get("Наименование") or "",
                name_kz=rec.get("name_kz") or rec.get("Атауы"),
                category=rec.get("category") or rec.get("Категория"),
                subcategory=rec.get("subcategory") or rec.get("Подкатегория"),
                unit=rec.get("unit") or rec.get("Единица"),
            )
            if not service.name:
                continue
            db.add(service)
            created += 1

        await db.commit()
        print(f"Loaded {created} services.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load service catalogue")
    parser.add_argument("--file", required=True, help="Path to XLSX or JSON catalogue file")
    args = parser.parse_args()
    asyncio.run(main(args.file))
