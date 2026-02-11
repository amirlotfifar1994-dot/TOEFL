#!/usr/bin/env python3
"""
Lesson Quality Checker (TOEFL Academic PWA)

What it checks (hard fail):
- registry.json exists and parses
- every registry lesson entry points to an existing lesson JSON
- every lesson JSON parses
- required blocks exist: image, analysis, descriptions(simple/intermediate/advanced)
- image src800/src1600 exist
- id/title consistency

What it checks (warnings, but still exits 0 unless --strict):
- short descriptions (too few words)
- too few vocabulary items
- missing/short alt text
- duplicated titles

Usage:
  python3 scripts/lesson-quality-check.py
  python3 scripts/lesson-quality-check.py --strict
  python3 scripts/lesson-quality-check.py --json out.json
  python3 scripts/lesson-quality-check.py --md out.md
"""

from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from collections import Counter

REQ_DESC_KEYS = ("simple","intermediate","advanced")

def word_count(s: str) -> int:
    return len(re.findall(r"[A-Za-z']+", s or ""))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Site root (default: .)")
    ap.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    ap.add_argument("--json", dest="json_out", default="", help="Write JSON report to file")
    ap.add_argument("--md", dest="md_out", default="", help="Write Markdown report to file")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    registry_path = root / "assets/data/registry.json"
    lessons_dir = root / "assets/data/lessons"

    errors = []
    warnings = []
    info = {}

    # Load registry
    if not registry_path.exists():
        errors.append(f"Missing registry: {registry_path}")
        registry = None
    else:
        try:
            registry = json.loads(registry_path.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"Registry JSON parse error: {e}")
            registry = None

    lessons_index = registry.get("lessons", []) if isinstance(registry, dict) else []
    info["registry_lessonCount"] = registry.get("lessonCount") if isinstance(registry, dict) else None
    info["registry_entries"] = len(lessons_index)

    # Basic directory checks
    if not lessons_dir.exists():
        errors.append(f"Missing lessons directory: {lessons_dir}")
        lessons_files = []
    else:
        lessons_files = sorted(lessons_dir.glob("*.json"))
    info["lesson_files_on_disk"] = len(lessons_files)

    # Validate each registry entry
    seen_ids = set()
    titles = []
    for entry in lessons_index:
        lid = entry.get("id")
        title = entry.get("title")
        titles.append(title or "")
        if not lid:
            errors.append("Registry entry missing id")
            continue
        if lid in seen_ids:
            errors.append(f"Duplicate lesson id in registry: {lid}")
        seen_ids.add(lid)

        file_rel = entry.get("file")
        if not file_rel:
            errors.append(f"{lid}: registry missing file path")
            continue
        fp = root / file_rel
        if not fp.exists():
            errors.append(f"{lid}: lesson file missing: {file_rel}")
            continue

        # Parse lesson
        try:
            lesson = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{lid}: lesson JSON parse error: {e}")
            continue

        # Hard required fields
        if lesson.get("id") != lid:
            errors.append(f"{lid}: lesson.id mismatch (found {lesson.get('id')})")
        if not lesson.get("title"):
            errors.append(f"{lid}: missing title")

        img = lesson.get("image")
        if not isinstance(img, dict):
            errors.append(f"{lid}: missing image block")
        else:
            for k in ("src800","src1600","alt"):
                if not img.get(k):
                    errors.append(f"{lid}: image.{k} missing")
            # Check files exist
            for k in ("src800","src1600"):
                rel = img.get(k,"")
                if rel and not (root/rel).exists():
                    errors.append(f"{lid}: missing image asset: {rel}")
            # Warnings for alt length
            alt = img.get("alt","")
            if word_count(alt) < 5:
                warnings.append(f"{lid}: alt text is short ({word_count(alt)} words)")

        analysis = lesson.get("analysis")
        if not isinstance(analysis, dict):
            errors.append(f"{lid}: missing analysis block")

        desc = lesson.get("descriptions")
        if not isinstance(desc, dict):
            errors.append(f"{lid}: missing descriptions block")
        else:
            for dk in REQ_DESC_KEYS:
                if not desc.get(dk):
                    errors.append(f"{lid}: descriptions.{dk} missing")
            # Warnings for short descriptions
            for dk in REQ_DESC_KEYS:
                wc = word_count(desc.get(dk,""))
                if wc < (12 if dk=="simple" else 25 if dk=="intermediate" else 40):
                    warnings.append(f"{lid}: {dk} description is short ({wc} words)")

        # Vocabulary checks (warnings)
        vdet = lesson.get("vocabularyDetailed")
        if isinstance(vdet, list):
            if len(vdet) < 12:
                warnings.append(f"{lid}: vocabularyDetailed has only {len(vdet)} items")
        else:
            warnings.append(f"{lid}: vocabularyDetailed missing or not a list")

        vext = lesson.get("vocabularyExtended")
        if isinstance(vext, dict):
            actions = vext.get("actions", [])
            feelings = vext.get("feelings", [])
            if isinstance(actions, list) and len(actions) < 8:
                warnings.append(f"{lid}: vocabularyExtended.actions has only {len(actions)} items")
            if isinstance(feelings, list) and len(feelings) < 6:
                warnings.append(f"{lid}: vocabularyExtended.feelings has only {len(feelings)} items")
        else:
            warnings.append(f"{lid}: vocabularyExtended missing or not a dict")

    # Duplicate title warnings
    title_counts = Counter([t.strip().lower() for t in titles if t and t.strip()])
    dup_titles = [t for t,c in title_counts.items() if c > 1]
    for t in dup_titles:
        warnings.append(f"Duplicate title appears {title_counts[t]} times: {t}")

    # Orphan lesson files (warnings)
    registry_files = set((root / e.get("file","")).resolve() for e in lessons_index if e.get("file"))
    for fp in lessons_files:
        if fp.resolve() not in registry_files:
            warnings.append(f"Orphan lesson JSON not referenced in registry: {fp.relative_to(root)}")

    ok = (len(errors) == 0) and (len(warnings) == 0 or not args.strict)

    report = {
        "ok": ok,
        "info": info,
        "errors": errors,
        "warnings": warnings
    }

    if args.json_out:
        (root/args.json_out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.md_out:
        md = []
        md.append(f"# Lesson Quality Report\n")
        md.append(f"- Registry entries: {info.get('registry_entries')}\n")
        md.append(f"- Lesson files on disk: {info.get('lesson_files_on_disk')}\n")
        md.append(f"- Errors: {len(errors)}\n")
        md.append(f"- Warnings: {len(warnings)}\n")
        if errors:
            md.append("\n## Errors\n")
            for e in errors: md.append(f"- {e}\n")
        if warnings:
            md.append("\n## Warnings\n")
            for w in warnings: md.append(f"- {w}\n")
        (root/args.md_out).write_text("".join(md), encoding="utf-8")

    # Print summary
    print(f"OK: {ok}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    if errors:
        print("\nERRORS:")
        for e in errors[:50]: print(" -", e)
    if warnings:
        print("\nWARNINGS:")
        for w in warnings[:50]: print(" -", w)

    if len(errors) > 0:
        sys.exit(2)
    if args.strict and len(warnings) > 0:
        sys.exit(3)
    sys.exit(0)

if __name__ == "__main__":
    main()
