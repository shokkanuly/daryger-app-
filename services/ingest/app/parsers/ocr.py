import re
import io
import fitz
import pytesseract
from PIL import Image
from typing import List, Dict, Tuple

def clean_name(name: str) -> str:
    # Clean up name: remove symbols, double spaces, trailing punctuation
    name = re.sub(r'^\s*[\d\.\-\)\s]+', '', name) # remove leading list numbers
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def extract_prices_from_line(line: str) -> Tuple[str, float | None, float | None]:
    # Extract name and prices from a raw text line
    # Example: "УЗИ брюшной полости   5000   6000" or "Общий анализ мочи - 1800 тг"
    line_clean = line.replace('\xa0', ' ').strip()
    if not line_clean:
        return "", None, None

    # Find numbers that look like prices (3-7 digits)
    matches = list(re.finditer(r'\b\d{3,7}\b', line_clean))
    
    if not matches:
        return line_clean, None, None

    # Service name is everything before the first price
    first_price_start = matches[0].start()
    name = line_clean[:first_price_start].strip(" -:.\t")
    name = clean_name(name)

    prices = []
    for match in matches:
        prices.append(float(match.group()))

    if len(prices) >= 2:
        return name, prices[0], prices[1]
    elif len(prices) == 1:
        return name, prices[0], prices[0]
        
    return name, None, None

def parse_ocr(file_path: str) -> List[Dict]:
    doc = fitz.open(file_path)
    rows = []
    
    for page in doc:
        # Render PDF page to a PNG byte stream
        pix = page.get_pixmap(dpi=150)
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # OCR the image
        text = pytesseract.image_to_string(img, lang="rus+eng")
        
        # Parse line by line
        for line in text.split("\n"):
            line = line.strip()
            if not line or len(line) < 5:
                continue
            
            name, resident, nonresident = extract_prices_from_line(line)
            if name and resident:
                rows.append({
                    "name": name,
                    "price_resident": resident,
                    "price_nonresident": nonresident,
                    "currency": "KZT"
                })
                
    doc.close()
    return rows
