import re
import fitz
import pdfplumber
from typing import List, Dict
from .ocr import extract_prices_from_line, parse_ocr, clean_name

def parse_pdf(file_path: str) -> List[Dict]:
    # Check for text layer
    doc = fitz.open(file_path)
    text_length = 0
    for i in range(min(3, len(doc))):
        text_length += len(doc[i].get_text())
    doc.close()

    # If no text layer, fall back to OCR
    if text_length < 50:
        return parse_ocr(file_path)

    rows = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if not row:
                            continue
                        # Clean cells
                        cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                        # Filter out empty rows
                        if not any(cleaned_row):
                            continue
                        
                        name_cell = ""
                        prices = []
                        for cell in cleaned_row:
                            cell_clean = re.sub(r'[^\d.,]', '', cell).replace(",", ".")
                            if cell_clean:
                                parts = cell_clean.split(".")
                                if 3 <= len(parts[0]) <= 7:
                                    try:
                                        prices.append(float(cell_clean))
                                        continue
                                    except ValueError:
                                        pass
                            if cell and len(cell) > len(name_cell):
                                name_cell = cell

                        name_cell = clean_name(name_cell).strip(" -:.\t")
                        if name_cell and len(name_cell) > 4 and prices:
                            resident = prices[0]
                            nonresident = prices[1] if len(prices) >= 2 else resident
                            rows.append({
                                "name": name_cell,
                                "price_resident": resident,
                                "price_nonresident": nonresident,
                                "currency": "KZT"
                            })
            
            # Fallback to line by line text parsing if no tables extracted
            if not rows:
                text = page.extract_text()
                if text:
                    for line in text.split("\n"):
                        name, res, nonres = extract_prices_from_line(line)
                        if name and res:
                            rows.append({
                                "name": name,
                                "price_resident": res,
                                "price_nonresident": nonres,
                                "currency": "KZT"
                            })
    return rows
