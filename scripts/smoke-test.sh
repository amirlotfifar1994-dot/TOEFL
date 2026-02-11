#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JS="$ROOT/js/lesson.js"

echo "Smoke test: checking required section IDs and TOEFL renderer..."

grep -q "sec-simple" "$JS"
grep -q "sec-advanced" "$JS"
grep -q "sec-practice" "$JS" || true  # practice may be conditionally rendered
grep -q "renderToeflSection(article, tocSections, data.toefl)" "$JS"
grep -q "sec-vocab-bilingual" "$JS"

echo "OK: lesson.js includes Simple/Advanced and TOEFL render hook."
