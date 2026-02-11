#!/usr/bin/env python3
"""
DOM Smoke Test (optional, requires Playwright installed locally)

What it does:
- Starts a local HTTP server for the project
- Opens lesson.html in a real browser (headless)
- Loads a few lessons and checks that key sections exist in the DOM:
  Simple / Advanced / Practice / TOEFL / Vocabulary EN/FA

Usage (local machine):
1) pip install playwright
2) playwright install
3) python3 ./scripts/smoke-dom.py
"""
from __future__ import annotations
import json
import os
import sys
import time
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "assets" / "data" / "registry.json"

def fail(msg: str) -> None:
  print(f"FAIL: {msg}")
  sys.exit(1)

def ok(msg: str) -> None:
  print(f"OK: {msg}")

def run_server(port: int) -> ThreadingHTTPServer:
  os.chdir(str(ROOT.parent))  # serve from parent so /new_pwa_compressed/... works
  handler = SimpleHTTPRequestHandler
  httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
  t = threading.Thread(target=httpd.serve_forever, daemon=True)
  t.start()
  return httpd

def main() -> None:
  try:
    from playwright.sync_api import sync_playwright
  except Exception:
    print("Playwright is not installed in this environment.")
    print("Install locally:\n  pip install playwright\n  playwright install\nThen rerun:\n  python3 ./scripts/smoke-dom.py")
    sys.exit(2)

  reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
  lessons = reg.get("lessons", [])
  if not lessons:
    fail("registry.lessons is empty")

  # pick first 3 lessons
  sample = lessons[:3]
  port = 8123
  httpd = run_server(port)
  base_url = f"http://127.0.0.1:{port}/new_pwa_compressed/lesson.html"

  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    for item in sample:
      url = base_url + f"?id={item['id']}"
      page.goto(url, wait_until="networkidle", timeout=60000)

      # required sections (some are conditional by data, but in this project they should exist)
      required_ids = ["sec-simple","sec-advanced","sec-practice","sec-vocab-bilingual"]
      for rid in required_ids:
        el = page.query_selector(f"#{rid}")
        if el is None:
          fail(f"{item['id']}: missing section #{rid}")

      # TOEFL: at least one TOEFL section should exist if toefl data present
      # We allow absence if lesson has no toefl block.
      has_toefl = page.query_selector("#toefl-reading, #toefl-questions, #toefl-listening, #toefl-speaking, #toefl-writing, #toefl-tips") is not None
      if not has_toefl:
        print(f"NOTE: {item['id']} has no visible TOEFL sections (check if lesson has toefl data).")

      ok(f"{item['id']}: DOM sections present")

    browser.close()

  httpd.shutdown()
  ok("DOM smoke test complete.")

if __name__ == "__main__":
  main()
