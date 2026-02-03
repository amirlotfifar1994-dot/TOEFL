# Codex — TOEFL Academic PWA

This project is a static PWA (HTML/CSS/JS) with lesson data stored as JSON.

## Quick start
Open `new_pwa_compressed/index.html` in a local server (recommended), for example:

- Python:
  - `python -m http.server 8000`
  - then open `http://localhost:8000/new_pwa_compressed/`

## Smoke tests (fast QA)
Run:

- `./scripts/smoke-test.sh`

What it checks:
- Lesson page code contains section IDs for:
  - Simple English
  - Advanced English
- Lesson page calls TOEFL renderer:
  - `renderToeflSection(article, tocSections, data.toefl)`

## Release checklist
1) Confirm version sync:
   - `VERSION`
   - `manifest.json`
   - `assets/data/registry.json`
   - `sw.js` cache version
2) Run smoke test:
   - `./scripts/smoke-test.sh`
3) Open 2–3 random lessons and verify:
   - Full description
   - Simple/Advanced sections render
   - Practice renders
   - TOEFL blocks render (Reading/Questions/etc)


## Advanced smoke test (data + renderer markers)
Run:
- `python3 ./scripts/smoke-advanced.py`

This validates:
- registry -> lesson files are present
- required keys exist in every lesson JSON (like-sample schema)
- lesson.js contains hooks for Simple/Advanced/Practice/TOEFL/Vocabulary EN/FA


## DOM smoke test (headless browser, optional)
If you want a real DOM-level check (not just static/marker checks), run locally:

1) `pip install playwright`
2) `playwright install`
3) `./scripts/smoke-dom.sh`

This will load lesson.html for a few lessons and verify the key sections exist in the rendered DOM.

## Lesson Quality

Run:

```bash
cd new_pwa_compressed
python3 scripts/lesson-quality-check.py --strict
```


---
## Collocation Generator (Scene-based)

برای اینکه کالوکیشن‌ها همیشه با سناریوی درس همخوان باشند، یک ژنراتور داخل پروژه اضافه شد:

- Runtime (در اپ): `js/collocation-generator.js`
  - اگر یک درس کالوکیشن نداشت، از روی `analysis.setting` و `fullDescription` کالوکیشن‌های استاندارد تولید می‌شود.

- Build/Batch (اسکریپت): `scripts/generate_collocations.py`
  - همهٔ فایل‌های `assets/data/lessons/toefl-ax34-*.json` را پردازش می‌کند.
  - `collocations_index.json` را دوباره می‌سازد.

دستور اجرا:

- `npm run gen:collocations`

نکته: شناسهٔ کالوکیشن‌ها (id) ممکن است بین درس‌ها تکراری باشد؛ بنابراین صفحهٔ کالوکیشن با (lesson,id) آیتم درست را پیدا می‌کند.

---
## Lexicon Sanitation

برای پاکسازی ترجمه‌های Placeholder در `lexicon.json`:

- `npm run fix:lexicon`

این دستور لیست ترجمه‌های ناموجود را در `assets/data/lexicon_missing_translations.json` تولید می‌کند.
