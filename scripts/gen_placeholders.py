#!/usr/bin/env python3
"""
Generate blurred tiny placeholders for referenced images.

Output:
  assets/images/placeholders.json

Usage:
  python scripts/gen_placeholders.py
"""
from __future__ import annotations
import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "assets/data/registry.json"
OUT = ROOT / "assets/images/placeholders.json"

def tiny_blur_webp(path: Path, width: int = 24) -> str:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    if w == 0 or h == 0:
        raise ValueError("Invalid image size")
    new_h = max(1, int(h * (width / w)))
    img = img.resize((width, new_h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=40, method=6)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return "data:image/webp;base64," + b64

def main() -> int:
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    lessons = reg["lessons"] if isinstance(reg, dict) else reg
    mapping = {}
    missing = []
    for item in lessons:
        src = (item.get("image") or "").lstrip("./")
        if not src:
            continue
        p = ROOT / src
        if not p.exists():
            missing.append(src)
            continue
        try:
            mapping[src] = tiny_blur_webp(p)
        except Exception as e:
            raise SystemExit(f"Failed placeholder for {src}: {e}")
    if missing:
        raise SystemExit("Missing referenced images:\n" + "\n".join(missing))
    OUT.write_text(json.dumps({"placeholders": mapping}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Wrote {OUT} ({len(mapping)} placeholders)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
