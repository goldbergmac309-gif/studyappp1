import io

import fitz  # PyMuPDF
from utils.pdf import extract_text


def make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    with fitz.open() as doc:
        page = doc.new_page(width=595, height=842)  # A4-ish
        page.insert_text((72, 72), text)
        doc.save(buf)
    return buf.getvalue()


def test_extract_text_single_page():
    sample = "Hello World from Synapse OS"
    pdf_bytes = make_pdf_bytes(sample)

    text, pages = extract_text(pdf_bytes)

    assert pages == 1
    assert isinstance(text, str)
    assert sample in text
    assert len(text) > 0
