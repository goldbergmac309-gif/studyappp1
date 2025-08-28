# tools/make_manifest.py
import json, hashlib, ast
from pathlib import Path
ROOT = Path(".")
OUT = Path("project_manifest.jsonl")
EXTS = {".py",".ts",".js",".tsx",".jsx",".md",".txt"}

def sha256(p):
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()

def extract_py_imports(text):
    try:
        tree = ast.parse(text)
        imps = set()
        for n in ast.walk(tree):
            if isinstance(n, ast.Import):
                for nm in n.names: imps.add(nm.name)
            elif isinstance(n, ast.ImportFrom):
                mod = n.module or ""
                for nm in n.names: imps.add((mod + "." + nm.name) if mod else nm.name)
        return list(imps)
    except Exception:
        return []

with OUT.open("w", encoding="utf-8") as out:
    for p in ROOT.rglob("*"):
        if not p.is_file(): continue
        if any(part in (".git","venv","node_modules","__pycache__") for part in p.parts): continue
        if p.suffix not in EXTS: continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        item = {"path": str(p), "sha256": sha256(p), "size": len(txt), "snippet_head": txt[:2000], "ext": p.suffix}
        if p.suffix == ".py":
            item["imports"] = extract_py_imports(txt)
        out.write(json.dumps(item) + "\n")
print("Wrote", OUT)

