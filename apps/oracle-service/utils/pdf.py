from __future__ import annotations

"""PDF text extraction helpers (scaffold).

Implementation to be completed in the next step.
"""


import fitz  # PyMuPDF


def extract_text(pdf_bytes: bytes) -> tuple[str, int]:
    """Extract text from a PDF byte stream.

    Returns a tuple of (text, page_count).
    """
    text_parts = []
    page_count = 0
    # Use context manager to ensure resources are released
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        page_count = int(getattr(doc, "page_count", len(doc)))
        for page in doc:
            page_text = page.get_text("text") or ""
            if page_text:
                text_parts.append(page_text)
    text = "\n".join(text_parts).strip()
    return text, page_count
