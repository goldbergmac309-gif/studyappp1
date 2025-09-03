# tools/make_manifest.py
import ast
import hashlib
import json
import logging
from pathlib import Path

ROOT = Path(".")
OUT = Path("project_manifest.jsonl")
EXTS = {".py", ".ts", ".js", ".tsx", ".jsx", ".md", ".txt"}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def extract_py_imports(text: str):
    try:
        tree = ast.parse(text)
        imps = set()
        for n in ast.walk(tree):
            if isinstance(n, ast.Import):
                for nm in n.names:
                    imps.add(nm.name)
            elif isinstance(n, ast.ImportFrom):
                mod = n.module or ""
                for nm in n.names:
                    if mod:
                        imps.add(mod + "." + nm.name)
                    else:
                        imps.add(nm.name)
        return list(imps)
    except Exception:
        return []


def main() -> None:
    with OUT.open("w", encoding="utf-8") as out:
        for p in ROOT.rglob("*"):
            if not p.is_file():
                continue
            if any(part in (".git", "venv", "node_modules", "__pycache__") for part in p.parts):
                continue
            if p.suffix not in EXTS:
                continue
            try:
                txt = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                logging.exception("Failed to read %s", p)
                continue
            item = {
                "path": str(p),
                "sha256": sha256(p),
                "size": len(txt),
                "snippet_head": txt[:2000],
                "ext": p.suffix,
            }
            if p.suffix == ".py":
                item["imports"] = extract_py_imports(txt)
            out.write(json.dumps(item) + "\n")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
