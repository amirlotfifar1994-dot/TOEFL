#!/usr/bin/env python3
"""Static project checks (links, data references, WebP variants).

Usage:
  python scripts/check_project.py
"""

from __future__ import annotations
import json
import os
import re
import sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]

HTML_FILES = ["index.html", "lesson.html", "offline.html"]

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs: list[tuple[str,str]] = []  # (attr, value)

    def handle_starttag(self, tag, attrs):
        for k,v in attrs:
            if k in ("href","src"):
                if v and not v.startswith(("http://","https://","mailto:","tel:","data:")):
                    self.refs.append((k,v))

def fail(msg: str) -> None:
    print(f"❌ {msg}")
    raise SystemExit(1)

def warn(msg: str) -> None:
    print(f"⚠️  {msg}")

def ok(msg: str) -> None:
    print(f"✅ {msg}")

def file_exists(rel: str) -> bool:
    # strip hash/query
    rel = rel.split("#",1)[0].split("?",1)[0]
    # normalize ./ paths
    rel = rel[2:] if rel.startswith("./") else rel
    p = (ROOT / rel).resolve()
    try:
        p.relative_to(ROOT.resolve())
    except Exception:
        return False
    return p.exists()

def derive_webp_variants(path: str) -> tuple[str,str] | None:
    # expecting ...-800.webp as base
    if path.endswith("-800.webp"):
        return (path, path.replace("-800.webp","-1600.webp"))
    if path.endswith("-1600.webp"):
        return (path.replace("-1600.webp","-800.webp"), path)
    return None

def main() -> None:
    # Basic files
    for f in ["manifest.json","sw.js","assets/data/registry.json","VERSION","CHANGELOG.md"]:
        if not (ROOT / f).exists():
            fail(f"Missing required file: {f}")
    ok("Core files present")

    # HTML refs
    missing = []
    for html in HTML_FILES:
        p = ROOT / html
        if not p.exists():
            fail(f"Missing HTML file: {html}")
        parser = LinkParser()
        parser.feed(p.read_text(encoding="utf-8", errors="replace"))
        for attr,val in parser.refs:
            # allow manifest, css, js, images, internal html
            if val.startswith("/") and val != "/":
                # absolute paths can break on subpath hosting; treat as warning
                warn(f"{html}: absolute {attr}='{val}' (might break on subpath hosting)")
            if val == "/":
                continue
            if val.startswith("/"):
                # treat as existence relative to ROOT
                val_check = val[1:]
            else:
                val_check = val
            if val_check and not file_exists(val_check):
                missing.append(f"{html}: {attr} -> {val}")
    if missing:
        fail("Missing file references:\n" + "\n".join(missing))
    ok("HTML link/src references OK")

    # Registry + lesson JSON existence and image WebP variants
    reg = json.loads((ROOT / "assets/data/registry.json").read_text(encoding="utf-8"))
    lessons = reg.get("lessons", [])
    if not lessons:
        fail("registry.json has no lessons")
    ok(f"registry.json lessons: {len(lessons)}")

    missing_data = []
    missing_images = []
    missing_webp = []
    for item in lessons:
        file_name = item.get("file")
        if not file_name:
            continue

        # registry entries may store a full relative path (e.g. assets/data/lessons/xyz.json)
        file_rel = str(file_name).lstrip("./")
        if "/" in file_rel:
            lp = ROOT / file_rel
        else:
            lp = ROOT / "assets/data/lessons" / file_rel

        if not lp.exists():
            missing_data.append(str(lp))
            continue

        data = json.loads(lp.read_text(encoding="utf-8"))

        # Content completeness checks (current schema)
        img_obj = data.get("image") or {}
        if not (isinstance(img_obj, dict) and isinstance(img_obj.get("alt"), str) and img_obj.get("alt").strip()):
            fail(f"Lesson {lp.name} is missing image.alt")
        for k in ("src800", "src1600"):
            if not (isinstance(img_obj.get(k), str) and img_obj.get(k).strip()):
                fail(f"Lesson {lp.name} is missing image.{k}")

        desc = data.get("descriptions") or {}
        if not (isinstance(desc, dict) and all(isinstance(desc.get(k), str) and desc.get(k).strip() for k in ("simple","intermediate","advanced"))):
            fail(f"Lesson {lp.name} descriptions must include simple/intermediate/advanced text")

        vocab = data.get("vocabularyDetailed")
        if not (isinstance(vocab, list) and len(vocab) >= 35):
            fail(f"Lesson {lp.name} must have vocabularyDetailed (>=35 items)")

        ve = data.get("vocabularyExtended") or {}
        phrases = ve.get("academicPhrases")
        if not (isinstance(phrases, list) and len(phrases) >= 8):
            fail(f"Lesson {lp.name} must have vocabularyExtended.academicPhrases (>=8)")

        tf = data.get("toefl") or {}
        sp = tf.get("speakingTasks")
        if not (isinstance(sp, list) and len(sp) >= 3):
            fail(f"Lesson {lp.name} must have at least 3 TOEFL speakingTasks")
        else:
            for ti, t in enumerate(sp):
                if not (isinstance(t, dict) and isinstance(t.get("prompt"), str) and t.get("prompt").strip()):
                    fail(f"Lesson {lp.name} speakingTasks #{ti+1} prompt missing")

        wr = tf.get("writingTasks")
        if not (isinstance(wr, list) and len(wr) >= 3):
            fail(f"Lesson {lp.name} must have at least 3 TOEFL writingTasks")
        else:
            for ti, t in enumerate(wr):
                if not (isinstance(t, dict) and isinstance(t.get("prompt"), str) and t.get("prompt").strip()):
                    fail(f"Lesson {lp.name} writingTasks #{ti+1} prompt missing")

        qs = tf.get("questions")
        if not (isinstance(qs, list) and len(qs) >= 3):
            fail(f"Lesson {lp.name} must have at least 3 TOEFL questions")
        else:
            for qi, q in enumerate(qs):
                if not (isinstance(q, dict) and isinstance(q.get("question"), str) and q.get("question").strip()):
                    fail(f"Lesson {lp.name} question #{qi+1} missing 'question'")
                if not (isinstance(q.get("choices"), list) and len(q.get("choices")) >= 3):
                    fail(f"Lesson {lp.name} question #{qi+1} needs choices (>=3)")
                if not isinstance(q.get("answer"), int):
                    fail(f"Lesson {lp.name} question #{qi+1} needs integer answer")

        pr = data.get("practice")
        if not isinstance(pr, dict):
            fail(f"Lesson {lp.name} is missing practice block")

        # Image existence checks
        for k in ("src800", "src1600"):
            rel = str(img_obj.get(k)).lstrip("./")
            if rel and not (ROOT / rel).exists():
                missing_images.append(rel)
            variants = derive_webp_variants(rel)
            if variants:
                for v in variants:
                    if not (ROOT / v).exists():
                        missing_webp.append(v)

    if missing_data:
        fail("Missing lesson JSON files:\n" + "\n".join(missing_data))
    ok("Lesson JSON files present")

    if missing_images:
        fail("Missing referenced images:\n" + "\n".join(missing_images))
    ok("Referenced images present")

    if missing_webp:
        fail("Missing WebP variants (800/1600):\n" + "\n".join(sorted(set(missing_webp))))
    ok("WebP variants present for referenced images")


    # Placeholders (blurred data URIs)
    ph_path = os.path.join(ROOT, 'assets', 'images', 'placeholders.json')
    assert os.path.exists(ph_path), 'placeholders.json missing'
    with open(ph_path, 'r', encoding='utf-8') as f:
        ph = json.load(f).get('placeholders', {})
    images_ref = [item.get('image') for item in lessons if item.get('image')]
    missing_ph = [img for img in images_ref if img.endswith('-800.webp') and img not in ph]
    assert not missing_ph, f'Missing placeholders for: {missing_ph[:5]}'
    ok("placeholders.json present and covers referenced images")

    # HTML structural sanity checks
    check_html_structure()

    print("\n🎉 All checks passed.")
    return



def check_html_structure():
    import re
    from pathlib import Path
    html_files = ['index.html', 'lesson.html', 'offline.html']
    for fn in html_files:
        p = ROOT / fn
        txt = p.read_text(encoding='utf-8')
        # required mobile-web-app-capable meta
        if 'mobile-web-app-capable' not in txt:
            raise SystemExit(f'❌ {fn}: missing <meta name="mobile-web-app-capable" content="yes">')
        # detect duplicate id attribute on same tag (simple heuristic)
        for m in re.finditer(r'<[^>]+\bid="[^\"]+"[^>]*\bid="[^\"]+"[^>]*>', txt, flags=re.I):
            raise SystemExit(f'❌ {fn}: duplicate id attribute detected: {m.group(0)[:80]}...')
    # lesson container exists
    lesson_txt = (ROOT / 'lesson.html').read_text(encoding='utf-8')
    if 'id="lessonContainer"' not in lesson_txt:
        raise SystemExit('❌ lesson.html: missing #lessonContainer')
    print('✅ HTML structure checks OK')


if __name__ == "__main__":
    main()


