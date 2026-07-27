"""
Daryger ingest service — stateless document parsing.

This service parses files and returns structured rows. It never touches the
database; Next.js writes everything via Prisma.

NOTE ON MATCHING: this service deliberately does NOT expose a /match endpoint.
There is exactly one matching engine in this system — src/lib/catalog/matcher.ts
on the Node side — and both ingestion paths (crawl via src/lib/catalog/ingest.ts
and document upload via src/lib/jobs/parse-document.ts) call it.

A naive rapidfuzz /match lived here previously. It was never wired up, but it
was a trap: it had no Cyrillic stemming, no stop-word handling, and no OCR-error
normalization, so it scored a catalog normalization rate around 1% where
matcher.ts scores ~63%. Anything reintroducing service matching here would
silently regress that. Call the Node matcher instead.
"""

import os
import shutil
import tempfile
import zipfile
from typing import List, Dict, Tuple
from fastapi import FastAPI, UploadFile, File, HTTPException

from .parsers.pdf import parse_pdf
from .parsers.docx import parse_docx
from .parsers.xlsx import parse_xlsx
from .parsers.docling import parse_with_docling

app = FastAPI(title="Daryger Ingest Service", version="1.0.0")

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
                return {
                    "filename": filename,
                    "rows": tag_source(docling_rows, filename),
                    "parser": "docling",
                    "errors": [],
                }

        # Fallback lightweight parsers
        errors: List[Dict] = []
        if suffix == ".pdf":
            rows = tag_source(parse_pdf(tmp_path), filename)
        elif suffix == ".docx":
            rows = tag_source(parse_docx(tmp_path), filename)
        elif suffix in [".xlsx", ".xls"]:
            rows = tag_source(parse_xlsx(tmp_path), filename)
        elif suffix == ".zip":
            rows, errors = parse_zip(tmp_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {suffix}")

        return {"filename": filename, "rows": rows, "parser": "fallback", "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def tag_source(rows: List[Dict], source_file: str) -> List[Dict]:
    """
    Stamp every row with the file it came from.

    A partner archive holds one price list per clinic, so without this the
    caller cannot tell whose prices these are and ends up filing all of them
    against a single clinic — which leaves the comparison view with nothing to
    compare.
    """
    for row in rows:
        row["source_file"] = os.path.basename(source_file)
    return rows


def parse_zip(zip_path: str) -> Tuple[List[Dict], List[Dict]]:
    """
    Parse every price list in an archive.

    Returns (rows, errors). Failures are reported per file rather than printed
    and dropped: a whole clinic silently vanishing from the catalogue is
    indistinguishable from that clinic having no services.
    """
    rows: List[Dict] = []
    errors: List[Dict] = []

    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(tmpdir)
        for root, _, files in os.walk(tmpdir):
            for fname in files:
                # Skip archive cruft (__MACOSX, .DS_Store) rather than
                # reporting it as a failed price list.
                if fname.startswith(".") or "__MACOSX" in root:
                    continue

                fpath = os.path.join(root, fname)
                sub_suffix = os.path.splitext(fname)[1].lower()

                if sub_suffix not in [".pdf", ".docx", ".xlsx", ".xls"]:
                    errors.append({"file": fname, "error": f"unsupported format {sub_suffix}"})
                    continue

                try:
                    parsed = None
                    docling_res = parse_with_docling(fpath)
                    if docling_res is not None:
                        parsed = docling_res
                    elif sub_suffix == ".pdf":
                        parsed = parse_pdf(fpath)
                    elif sub_suffix == ".docx":
                        parsed = parse_docx(fpath)
                    elif sub_suffix in [".xlsx", ".xls"]:
                        parsed = parse_xlsx(fpath)

                    if not parsed:
                        errors.append({"file": fname, "error": "no pricing rows recognized"})
                        continue

                    rows.extend(tag_source(parsed, fname))
                except Exception as e:
                    errors.append({"file": fname, "error": f"{type(e).__name__}: {e}"})

    return rows, errors

@app.get("/health")
async def health():
    return {"status": "ok"}
