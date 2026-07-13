import os
import shutil
import tempfile
import zipfile
from typing import List, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from rapidfuzz import fuzz

from .parsers.pdf import parse_pdf
from .parsers.docx import parse_docx
from .parsers.xlsx import parse_xlsx
from .parsers.docling import parse_with_docling

app = FastAPI(title="Daryger Ingest Service", version="1.0.0")

class CatalogItem(BaseModel):
    id: str
    name: str
    synonyms: List[str] = []

class MatchRequest(BaseModel):
    rawName: str
    catalog: List[CatalogItem]

@app.post("/parse")
async def parse_document(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    suffix = os.path.splitext(filename)[1].lower()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        rows = []
        # Try Docling first if suffix is supported
        if suffix in [".pdf", ".docx", ".xlsx", ".xls"]:
            docling_rows = parse_with_docling(tmp_path)
            if docling_rows is not None:
                return {"filename": filename, "rows": docling_rows, "parser": "docling"}

        # Fallback lightweight parsers
        if suffix == ".pdf":
            rows = parse_pdf(tmp_path)
        elif suffix == ".docx":
            rows = parse_docx(tmp_path)
        elif suffix in [".xlsx", ".xls"]:
            rows = parse_xlsx(tmp_path)
        elif suffix == ".zip":
            rows = parse_zip(tmp_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {suffix}")

        return {"filename": filename, "rows": rows, "parser": "fallback"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def parse_zip(zip_path: str) -> List[Dict]:
    rows = []
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(tmpdir)
        for root, _, files in os.walk(tmpdir):
            for fname in files:
                fpath = os.path.join(root, fname)
                sub_suffix = os.path.splitext(fname)[1].lower()
                try:
                    # Try Docling first
                    if sub_suffix in [".pdf", ".docx", ".xlsx", ".xls"]:
                        docling_res = parse_with_docling(fpath)
                        if docling_res is not None:
                            rows.extend(docling_res)
                            continue

                    # Fallback
                    if sub_suffix == ".pdf":
                        rows.extend(parse_pdf(fpath))
                    elif sub_suffix == ".docx":
                        rows.extend(parse_docx(fpath))
                    elif sub_suffix in [".xlsx", ".xls"]:
                        rows.extend(parse_xlsx(fpath))
                except Exception as e:
                    print(f"Skipping {fname} in ZIP: {e}")
    return rows

@app.post("/match")
async def match_service(req: MatchRequest):
    raw_name = req.rawName
    catalog = req.catalog
    
    name_lower = raw_name.lower().strip()
    
    # 1. Exact match
    for item in catalog:
        if item.name.lower().strip() == name_lower:
            return {"serviceId": item.id, "confidence": 1.0}

    # 2. Synonym match
    for item in catalog:
        for syn in item.synonyms:
            if syn.lower().strip() == name_lower:
                return {"serviceId": item.id, "confidence": 0.95}

    # 3. Fuzzy match
    best_id = None
    best_score = 0.0

    for item in catalog:
        score = fuzz.ratio(name_lower, item.name.lower().strip()) / 100.0
        if score > best_score:
            best_score = score
            best_id = item.id

        for syn in item.synonyms:
            syn_score = fuzz.ratio(name_lower, syn.lower().strip()) / 100.0
            if syn_score > best_score:
                best_score = syn_score
                best_id = item.id

    best_score = round(best_score, 2)
    if best_score >= 0.85:
        return {"serviceId": best_id, "confidence": best_score}

    return {"serviceId": None, "confidence": best_score}

@app.get("/health")
async def health():
    return {"status": "ok"}
