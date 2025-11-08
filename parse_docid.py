import json
try:
    with open("upload.json","r",encoding="utf-8") as f:
        o = json.load(f)
    print(o.get("id",""), end="")
except Exception:
    pass
