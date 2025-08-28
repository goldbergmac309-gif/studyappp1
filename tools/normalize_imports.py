# tools/normalize_imports.py
import os, re, difflib, argparse
from pathlib import Path

ROOT = Path(".").resolve()
PATCH_DIR = ROOT / "patches"
PATCH_DIR.mkdir(exist_ok=True)

p = argparse.ArgumentParser()
p.add_argument("--canonical", default=os.getenv("CANONICAL_ROOT", "src"))
p.add_argument("--alt", default=os.getenv("ALT_ROOT", "legacy"))
p.add_argument("--exts", default=".py,.ts,.js,.tsx,.jsx", help="comma sep")
args = p.parse_args()

CANONICAL = args.canonical.rstrip("/")
ALT = args.alt.rstrip("/")
EXTS = set(e.strip() for e in args.exts.split(","))

py_re = re.compile(r'(^\s*(?:from|import)\s+)(%s(?:[.\w/]*))' % re.escape(ALT), re.M)
ts_re = re.compile(r'(from\s+[\'"])(%s(?:[\/\w\-.]*))([\'"])' % re.escape(ALT))

def scan():
    for path in ROOT.rglob("*"):
        if not path.is_file(): continue
        if any(part in (".git","venv","node_modules","__pycache__") for part in path.parts): continue
        if path.suffix not in EXTS: continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        new = text
        if path.suffix == ".py":
            if py_re.search(text):
                new = py_re.sub(lambda m: m.group(1) + m.group(2).replace(ALT, CANONICAL), text)
        else:
            if ts_re.search(text):
                new = ts_re.sub(lambda m: m.group(1) + m.group(2).replace(ALT, CANONICAL) + m.group(3), text)
        if new != text:
            write_patch(path, text, new)

def write_patch(path, old, new):
    old_lines = old.splitlines(keepends=True)
    new_lines = new.splitlines(keepends=True)
    diff = ''.join(difflib.unified_diff(old_lines, new_lines, fromfile=str(path), tofile=str(path), lineterm=''))
    out = PATCH_DIR / (str(path).replace(os.sep, "__") + ".patch")
    out.write_text(diff, encoding="utf-8")
    print("WROTE PATCH:", out)

if __name__ == "__main__":
    scan()

