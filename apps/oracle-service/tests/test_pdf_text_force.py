import io
import types
import fitz  # PyMuPDF
import utils.pdf as pdf_utils


def make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    with fitz.open() as doc:
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 72), text)
        doc.save(buf)
    return buf.getvalue()


def test_extract_text_smart_force_uses_ocr(monkeypatch):
    # High density base text that would normally skip OCR
    base_text = "X" * 300
    pdf_bytes = make_pdf_bytes(base_text)

    # Ensure OCR stack is considered available
    monkeypatch.setattr(pdf_utils, "pytesseract", object())
    monkeypatch.setattr(pdf_utils, "Image", object())

    # Force the internal OCR function to return a marker string
    def fake_ocr(_page, *, dpi: int = 200, lang: str = "eng") -> str:
        return "FORCED_OCR_TEXT"

    monkeypatch.setattr(pdf_utils, "_ocr_page_to_text", fake_ocr)
    # Make base extraction look dense to prove force overrides
    monkeypatch.setattr(pdf_utils, "extract_text", lambda _bytes: (base_text, 1))

    text, pages, ocr_used = pdf_utils.extract_text_smart(pdf_bytes, force=True)

    assert pages == 1
    assert ocr_used is True
    assert "FORCED_OCR_TEXT" in text


def test_extract_text_smart_no_force_skips_ocr_for_high_density(monkeypatch):
    # High density base text
    base_text = "Y" * 300
    pdf_bytes = make_pdf_bytes(base_text)

    # Make OCR available and distinct output, but do not force
    monkeypatch.setattr(pdf_utils, "pytesseract", object())
    monkeypatch.setattr(pdf_utils, "Image", object())

    def fake_ocr(_page, *, dpi: int = 200, lang: str = "eng") -> str:
        return "FORCED_OCR_TEXT"

    monkeypatch.setattr(pdf_utils, "_ocr_page_to_text", fake_ocr)
    # Ensure base extraction returns dense text so OCR should be skipped
    monkeypatch.setattr(pdf_utils, "extract_text", lambda _bytes: (base_text, 1))

    text, pages, ocr_used = pdf_utils.extract_text_smart(pdf_bytes, force=False)

    assert pages == 1
    assert ocr_used is False
    # Should return base text, not the OCR text
    assert "FORCED_OCR_TEXT" not in text
    assert len(text) >= len(base_text)
