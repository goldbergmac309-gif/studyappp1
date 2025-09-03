# tools/normalize_imports_verbose.py
import argparse
import difflib
import re
from pathlib import Path

ROOT = Path(".").resolve()
PATCH_DIR = ROOT / "patches_verbose"
PATCH_DIR.mkdir(exist_ok=True)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--canonical", default="src")
    p.add_argument("--alt", default="legacy")
    p.add_argument("--exts", default=".py,.ts,.js,.tsx,.jsx")
    return p.parse_args()


def main():
    args = parse_args()
    canonical = args.canonical.rstrip("/")
    alt = args.alt.rstrip("/")
    exts = set(e.strip() for e in args.exts.split(","))

    print(f"Verbose normalizer running. canonical='{canonical}' alt='{alt}' exts={exts}")

    py_re = re.compile(rf"(^\s*(?:from|import)\s+)({re.escape(alt)}(?:[.\w/]*))", re.M)
    ts_re = re.compile(rf"(from\s+['\"])({re.escape(alt)}(?:[\/\w\-.]*))(['\"])")

    found_any = False
    files_checked = 0

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in (".git", "venv", "node_modules", "__pycache__") for part in path.parts):
            continue
        if path.suffix not in exts:
            continue
        files_checked += 1
        text = path.read_text(encoding="utf-8", errors="ignore")
        if path.suffix == ".py":
            m = list(py_re.finditer(text))
            if m:
                found_any = True
                print("MATCH (py):", path)
                for mm in m:
                    print("  >", mm.group(0).strip())
                new = py_re.sub(
                    lambda mm: mm.group(1) + mm.group(2).replace(alt, canonical),
                    text,
                )
                diff = "".join(
                    difflib.unified_diff(
                        text.splitlines(keepends=True),
                        new.splitlines(keepends=True),
                        fromfile=str(path),
                        tofile=str(path),
                        lineterm="",
                    )
                )
                out = PATCH_DIR / (str(path).replace(__import__("os").sep, "__") + ".patch")
                out.write_text(diff, encoding="utf-8")
                print("  wrote patch:", out)
        else:
            m = list(ts_re.finditer(text))
            if m:
                found_any = True
                print("MATCH (ts/js):", path)
                for mm in m:
                    print("  >", mm.group(0).strip())
                new = ts_re.sub(
                    lambda mm: mm.group(1) + mm.group(2).replace(alt, canonical) + mm.group(3),
                    text,
                )
                diff = "".join(
                    difflib.unified_diff(
                        text.splitlines(keepends=True),
                        new.splitlines(keepends=True),
                        fromfile=str(path),
                        tofile=str(path),
                        lineterm="",
                    )
                )
                out = PATCH_DIR / (str(path).replace(__import__("os").sep, "__") + ".patch")
                out.write_text(diff, encoding="utf-8")
                print("  wrote patch:", out)

    print("Files checked:", files_checked)
    print("Any matches found?:", found_any)
    print("If patches written, check folder:", PATCH_DIR)


if __name__ == "__main__":
    main()
