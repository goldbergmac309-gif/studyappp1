from __future__ import annotations

"""PDF text extraction helpers with OCR fallback.

We keep the original `extract_text` for compatibility, and add
`extract_text_smart` which attempts plain text extraction first and
falls back to OCR (pytesseract) when text density is too low.
"""

from io import BytesIO
from typing import Tuple

import fitz  # PyMuPDF

try:  # Soft dependency; Dockerfile installs tesseract binaries
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
except Exception:  # pragma: no cover - environment without OCR deps
    pytesseract = None  # type: ignore
    Image = None  # type: ignore


def extract_text(pdf_bytes: bytes) -> tuple[str, int]:
    """Extract text from a PDF byte stream.

    Returns a tuple of (text, page_count).
    """
    text_parts = []
    page_count = 0
    # Use context manager to ensure resources are released
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            page_count = int(getattr(doc, "page_count", len(doc)))
            for page in doc:
                page_text = page.get_text("text") or ""
                if page_text:
                    text_parts.append(page_text)
        text = "\n".join(text_parts).strip()
        return text, page_count
    except Exception:
        # Fallback: treat bytes as UTF-8 text when not a valid PDF
        try:
            text = pdf_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            text = ""
        return text, 1 if text else 0


def _ocr_page_to_text(page: "fitz.Page", *, dpi: int = 200, lang: str = "eng") -> str:
    if pytesseract is None or Image is None:
        return ""
    pix = page.get_pixmap(dpi=dpi)
    # Convert to PNG bytes, then to PIL Image for pytesseract
    png_bytes = pix.tobytes("png")
    try:
        img = Image.open(BytesIO(png_bytes))
        return pytesseract.image_to_string(img, lang=lang) or ""
    except Exception:
        return ""


def extract_text_smart(
    pdf_bytes: bytes,
    *,
    density_threshold: int = 100,  # characters per page
    ocr_dpi: int = 200,
    ocr_lang: str = "eng",
    force: bool = False,
) -> Tuple[str, int, bool]:
    """Extract text with OCR fallback.

    Returns (text, page_count, ocr_used).
    - First extracts text via PyMuPDF.
    - If average characters/page < density_threshold, attempts OCR per page.
    """
    base_text, pages = extract_text(pdf_bytes)
    if pages <= 0:
        return base_text, pages, False

    # If force is set, try OCR path regardless of density when OCR stack available
    if force and not (pytesseract is None or Image is None):
        pass
    else:
        avg_density = (len(base_text) // pages) if pages else 0
        # If density is acceptable or OCR stack unavailable, return base
        if avg_density >= density_threshold or pytesseract is None or Image is None:
            return base_text, pages, False

    # Try OCR fallback
    ocr_parts = []
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            for page in doc:
                txt = _ocr_page_to_text(page, dpi=ocr_dpi, lang=ocr_lang)
                if txt:
                    ocr_parts.append(txt)
    except Exception:
        # If OCR fails unexpectedly, return the base extraction
        return base_text, pages, False

    if not ocr_parts:
        return base_text, pages, False

    ocr_text = "\n".join(ocr_parts).strip()
    return (ocr_text or base_text), pages, True
