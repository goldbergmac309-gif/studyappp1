import json
try:
    with open("subjects.json","r",encoding="utf-8") as f:
        a = json.load(f)
    if isinstance(a, list) and a and isinstance(a[0], dict) and "id" in a[0]:
        print(a[0]["id"], end="")
except Exception:
    pass
