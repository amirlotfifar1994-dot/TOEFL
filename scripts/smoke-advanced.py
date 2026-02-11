#!/usr/bin/env python3
"""
Advanced smoke test (offline, no browser):
- Validates registry <-> lesson files (count, missing files)
- Validates required fields in lesson JSON (like-sample)
- Validates lesson.js contains renderer hooks and section ids for:
  Simple / Advanced / Practice / TOEFL / Vocabulary EN/FA
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "data"
REGISTRY = DATA / "registry.json"
LESSONS_DIR = DATA / "lessons"
LESSON_JS = ROOT / "js" / "lesson.js"

REQUIRED_TOP = [
  "fullDescription","simpleEnglish","advancedEnglish",
  "actions","objects","feelings",
  "vocabularyExtended","vocabularyDetailed",
  "practice"
]
REQUIRED_PRACTICE = ["sentences","qa","speakingPrompts"]

def fail(msg: str) -> None:
  print(f"FAIL: {msg}")
  sys.exit(1)

def ok(msg: str) -> None:
  print(f"OK: {msg}")

def main() -> None:
  if not REGISTRY.exists(): fail("registry.json not found")
  if not LESSON_JS.exists(): fail("js/lesson.js not found")

  reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
  lessons = reg.get("lessons", [])
  if not isinstance(lessons, list) or not lessons:
    fail("registry.lessons missing/empty")

  # file existence
  missing = []
  for item in lessons:
    f = item.get("file")
    if not f: missing.append("(missing file field)"); continue
    p = ROOT / f
    if not p.exists(): missing.append(f)
  if missing:
    fail(f"missing lesson files: {missing[:10]}{' ...' if len(missing)>10 else ''}")
  ok(f"registry -> lesson files exist ({len(lessons)})")

  # validate required fields for a sample of lessons (all, strict but fast)
  for item in lessons:
    p = ROOT / item["file"]
    data = json.loads(p.read_text(encoding="utf-8"))
    for k in REQUIRED_TOP:
      if k not in data: fail(f"{p.name}: missing key '{k}'")
    if not isinstance(data["actions"], list) or not data["actions"]:
      fail(f"{p.name}: actions must be non-empty list")
    if not isinstance(data["vocabularyDetailed"], list) or not data["vocabularyDetailed"]:
      fail(f"{p.name}: vocabularyDetailed must be non-empty list")
    pr = data["practice"]
    if not isinstance(pr, dict): fail(f"{p.name}: practice must be object")
    for k in REQUIRED_PRACTICE:
      if k not in pr or not isinstance(pr[k], list) or not pr[k]:
        fail(f"{p.name}: practice.{k} missing or empty")
  ok("lesson JSON schema validated (all lessons)")

  js = LESSON_JS.read_text(encoding="utf-8", errors="ignore")
  # Hooks/IDs (string presence is acceptable for offline test)
  must_have = [
    "sec-simple", "sec-advanced", "sec-practice",
    "renderToeflSection(article, tocSections, data.toefl)",
    "vocabularyDetailed", "sec-vocab-bilingual"
  ]
  for s in must_have:
    if s not in js:
      fail(f"lesson.js missing required marker: {s}")
  ok("lesson.js contains required render hooks/section ids")

  print("\nAll advanced smoke checks passed.")

if __name__ == "__main__":
  main()
