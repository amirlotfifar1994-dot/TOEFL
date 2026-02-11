# Lesson Quality Checks

This project includes an automated quality checker for lesson content.

## What it validates
**Hard failures (exit code 2):**
- `assets/data/registry.json` must exist and parse
- Every `registry.lessons[]` entry must reference a real lesson JSON file
- Every lesson JSON must parse
- Each lesson must include:
  - `image.src800`, `image.src1600`, `image.alt`
  - `analysis` (object)
  - `descriptions.simple`, `descriptions.intermediate`, `descriptions.advanced`
- Each referenced image file must exist

**Warnings (exit code 0, or 3 with `--strict`):**
- Descriptions too short
- Too few vocabulary items
- Alt text too short
- Duplicate titles
- Orphan lesson JSONs not referenced by the registry

## Run locally
From the site root (`new_pwa_compressed/`):

```bash
python3 scripts/lesson-quality-check.py
python3 scripts/lesson-quality-check.py --strict
python3 scripts/lesson-quality-check.py --md quality-report.md --json quality-report.json
```

## Recommended thresholds (current defaults)
- Simple: 12+ words
- Intermediate: 25+ words
- Advanced: 40+ words
- vocabularyDetailed: 12+ items
- vocabularyExtended.actions: 8+ items
- vocabularyExtended.feelings: 6+ items
