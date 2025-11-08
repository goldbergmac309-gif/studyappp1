import json, os
try:
    docid = os.environ.get("DOCID")
    with open("doclist.json","r",encoding="utf-8") as f:
        lst = json.load(f)
    if isinstance(lst, list):
        for d in lst:
            if isinstance(d, dict) and d.get("id") == docid:
                print(d.get("status",""), end="")
                break
except Exception:
    pass
