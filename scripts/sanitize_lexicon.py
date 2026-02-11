#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sanitize assets/data/lexicon.json:
- Remove placeholder labels: فعل/عمل, موضوع/مفهوم, شیء/وسیله
- If nothing remains, keep fa as [] (UI shows "ترجمه موجود نیست")
- Write a report assets/data/lexicon_missing_translations.json listing IDs with missing fa
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BLACK = {"فعل/عمل","موضوع/مفهوم","شیء/وسیله"}

def clean_fa(fa):
    arr = fa if isinstance(fa, list) else ([fa] if fa else [])
    cleaned = [str(x).strip() for x in arr if str(x).strip() and str(x).strip() not in BLACK]
    return cleaned

def main():
    root = Path(__file__).resolve().parents[1]
    lex_path = root / "assets" / "data" / "lexicon.json"
    out_report = root / "assets" / "data" / "lexicon_missing_translations.json"

    data = json.loads(lex_path.read_text(encoding="utf-8"))
    entries = data.get("entries") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        raise SystemExit("lexicon.json schema unexpected")

    missing = []
    changed = 0

    for e in entries:
        if not isinstance(e, dict): 
            continue
        old = e.get("fa")
        new = clean_fa(old)
        if new != (old if isinstance(old, list) else ([old] if old else [])):
            e["fa"] = new
            changed += 1
        if not new:
            missing.append({"id": e.get("id"), "en": e.get("en"), "lessons": e.get("lessons", [])})

    data_out = {"generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"), "entries": entries}
    lex_path.write_text(json.dumps(data_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    out_report.write_text(json.dumps({
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "count": len(missing),
        "entries": missing
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Sanitized lexicon entries: {len(entries)}")
    print(f"Entries changed (placeholder removed): {changed}")
    print(f"Missing translations: {len(missing)} -> {out_report}")

if __name__ == "__main__":
    main()
