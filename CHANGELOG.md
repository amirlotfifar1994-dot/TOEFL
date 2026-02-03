## 6.18.11 — 2026-01-30

## v30.9.2
- Added per-scenario Grammar Basics section (tense, sentence structure, how-to-build, examples) for all lessons.
- Updated lesson scenario rendering to show Grammar Basics under each scenario.
- Bumped service worker cache version to 6.26.0.

## v30.9.0
- Multi-scenario per lesson (A2/B1/B2/C1) with grammar focus + bilingual toggle
- Scenario UI improved with cards and per-scenario TTS
- Cache version bump

## v30.8.8-bilingual-descriptions (2026-02-02)
- Added Persian translations for Full/Simple/Intermediate/Advanced lesson descriptions (English-first, click-to-reveal Persian).
- Updated lesson renderer to support bilingual description fields stored as {en, fa} objects.
- Updated collocation generator to safely read bilingual fullDescription values.

## v30.8.7-full-lesson-review (2026-02-02)
- Completed exercise sets for all Ax1/Ax2 lessons (now 13 exercises each, consistent with newer lessons).
- Fixed collocation exercise grammar: correct past simple forms and cleaner Persian model lines.
- Rebuilt collocation example sentences across all lessons for consistent present continuous / past / future practice.
- Fixed Persian collocation example inflections (e.g., گرم ماندند / گرم خواهند ماند) to avoid duplicated verbs.

## v30.8.6-tts-stable (2026-02-02)
- Fixed missing TTS implementation by adding js/tts.js and wiring it into lesson layout.
- Improved reliability: waits for voices to load, prefers local English voices, and cancels speech on tab change/navigation.
- Excludes hidden Persian/RTL nodes from spoken text.

## v30.8.5-tts-readaloud
- Added “Read aloud” (Web Speech API) controls for Full/Simple/Intermediate/Advanced descriptions on lesson pages.
- Includes Play/Pause/Stop and prefers an English voice when available.

## v30.8.4-axxx1-enriched (2026-02-02)
- Enriched Axxx1 lessons (01–08): expanded vocabulary (≥45 items), collocations (≥10), full 13-exercise set, grammar breakdown notes.
- Added new vocab/collocations to lexicon for word pages.


## v30.8.1 (hotfix)
- Fixed a syntax error in js/lesson.js that prevented Lesson pages from loading.

## v30.8.2 (layout fix)
- Fix: disabled applyTopSectionDrawers() on lesson pages because it broke Layout V2 (tabs + intro slider) by replacing core sections before they could be moved into panels.
- Result: removes duplicated/misplaced top sections and restores proper section IDs for tabs and intro stack.

## v30.8-bilingual-cleanup
- Disable legacy per-node Persian toggle injector on lesson pages (use shared bilingual.js only).
- Remove duplicated 'Practice (3 levels)' section from lesson pages to reduce repeated categories.
- English-first UI text cleanup (Persian labels moved out of UI chrome).
- Build date: 2026-02-02

- Added: automated lesson quality checker (scripts/lesson-quality-check.py) + GitHub Action strict gate.

## 6.18.10 — 2026-01-30

- Fix: aligned ax34 lessons 01, 02, 06, 07 to full lesson schema (actions/objects/feelings, vocabulary, practice, TOEFL blocks).
- Cleanup: removed unreferenced lesson JSON files so lessons directory matches registry (24 lessons).

## 6.18.9 — 2026-01-30

- Added: 4 missing ax34 lessons (01, 02, 06, 07) to match the 24 available images.

## 6.18.8 — 2026-01-30

- Added: single-page contact sheet image of all existing lessons based on v6.18.7.

## 6.18.7 — 2026-01-30

- Cleanup: removed all lessons except the 20 fully detailed ax34 lessons.
- Registry and lesson directory pruned for a clean, focused dataset.

## 6.18.6 — 2026-01-30

- Content: deeply expanded 10 urban ax34 lessons with full analysis and three-level descriptions.

## 6.18.5 — 2026-01-30

- Content: deeply expanded ax34 lessons 03,04,05,08,09,10,11,12,16,17 with full analysis, 3-level descriptions, detailed/extended vocabulary, practice, and TOEFL tasks.

## 6.18.2 — 2026-01-30

- Content: clearer titles for photo-deep lessons (01–10).
- Content: replaced lessons 04–10 with fully deep, image-based analysis + 3-level descriptions.
- Content: upgraded lessons 01–03 to the same deep structure for consistency.

## 6.18.0 — 2026-01-30

- Content: added 24 new photo-based lessons (Ax3+Ax4) with full TOEFL-style structure (description, Simple/Advanced, Practice, TOEFL blocks).
- Media: generated real 800px and 1600px WebP variants for each new image.

## 6.17.8 — 2026-01-30

- Fix: decoupled bilingual vocabulary (EN/FA) section from the `vocabularyExtended` block so it renders independently when available.

## 6.17.7 — 2026-01-30

- QA: added optional Playwright-based DOM smoke test (`scripts/smoke-dom.py`) to verify key sections exist in the rendered page.
- Docs: updated codex.md with DOM smoke test instructions.

## 6.17.6 — 2026-01-30

- QA: added `scripts/smoke-advanced.py` (registry↔lessons validation + like-sample schema checks + renderer markers).
- QA: smoke-test.sh now also checks bilingual vocabulary section marker.
- Docs: updated codex.md with advanced smoke test.

## 6.17.5 — 2026-01-30

- UI: restored bilingual vocabulary rendering (Vocabulary EN/FA) using `vocabularyDetailed`.
- QA: smoke test checks for bilingual vocabulary section id.

## 6.17.4 — 2026-01-30

- Fix: lesson page now actually calls `renderToeflSection(...)` so TOEFL Reading/Questions/Listening/Speaking/Writing/Tips render in the UI.
- QA: `scripts/smoke-test.sh` now passes.

## 6.17.3 — 2026-01-30

- UI: Simple/Advanced sections are now independent from the description block (always render when data exists).
- QA: added `codex.md` and `scripts/smoke-test.sh` for quick release verification.
## 6.17.2 — 2026-01-30

- Fix: lesson page now renders TOEFL blocks again (Reading/Questions/Listening/Speaking/Writing/Tips) when `data.toefl` exists.


## 6.17.1 — 2026-01-30

- Content/UI: added Simple English + Advanced English sections and micro-practice (sentences, Q&A, speaking prompts) to every lesson.
- UI: practice Q&A is rendered DOM-safe (no innerHTML) and styled.

## 6.17.0 — 2026-01-30

- Content: added Simple English, Advanced English, and Practice sections (sentences, Q&A, speaking prompts) to all lessons.
- UI: lesson page renders Simple/Advanced/Practice sections.
- Security: rendering remains DOM-built (no innerHTML, no DOMParser).

## 6.16.0 — 2026-01-30

- Content: upgraded all lessons to a complete “like-sample” structure (full description + actions + people + ages + place + objects + clothing + appearance + mood + setting + lighting).
- Content: added bilingual vocabulary entries (EN/FA) for each lesson (`vocabularyDetailed`).
- UI: lesson page now renders the bilingual vocabulary section.
- Security: project remains DOM-built (no innerHTML, no DOMParser).

## 6.15.9 — 2026-01-30

- Security/Hardening: removed DOMParser and all HTML-string parsing; UI rendering is now built with createElement/textContent (no DOMParser, no parseFromString).
- Refactor: rewrote TOEFL rendering blocks in lesson.js (Reading/Questions/Listening/Speaking/Writing/Tips) to be DOM-built.
- Refactor: speaking.js feedback panel now DOM-built.

## 6.15.8 — 2026-01-30

- Security/Hardening: converted MCQ/Reading rendering to DOM builders (no HTML-string templates).
- UI: behavior preserved; rendering is now fully DOM-safe for TOEFL blocks.

## 6.15.7 — 2026-01-30

- Security/Hardening: removed all `.innerHTML =` assignments from lesson.js and main.js; rendering now uses a DOMParser-based helper (no innerHTML).

## 6.15.6 — 2026-01-30

- Security: removed remaining innerHTML injections in scenario/visual key-value rendering on lesson page (DOM-safe rendering).

## 6.15.5 — 2026-01-30

- Docs: added missing changelog entry for 6.15.4 and ensured version history is consistent.

## 6.15.4 — 2026-01-30

- Security: made lesson error/empty-state rendering DOM-safe (no innerHTML injection in renderMessage).
# Changelog
All notable changes to this project will be documented in this file.

## 6.10.0 — 2026-01-30

- Security: renderMessage now uses safe DOM nodes (no innerHTML injection).
- A11y/HTML: fixed duplicate rel, improved lesson fallback (loading + noscript), added search aria-label.
- CSP-ready: removed inline onclick from offline page; added js/offline.js and precache.
- Content: added 8 new C1 lessons built from your images (community, markets, labor, education, food systems).

## 6.9.0 — 2026-01-29

- Speaking practice upgraded: Integrated simulation (Read → Prep → Speak) with key points panel.
- Speaking module now supports self-score and attempt history (last 30 stored; last 5 shown).
- Stronger content checks for speaking tasks in scripts/check_project.py.



## 6.8.0 - 2026-01-29

- Speaking-first upgrade: added TOEFL speaking timer + optional audio recording and self-checklist for each speaking task.
- Lesson page: interactive speaking modules (prep/speak flow) and persistence for notes/checklist.
- PWA: cached new speaking module script.

## [6.7.0] - 2026-01-29
### Added
- TOEFL-aligned lesson framework for all lessons: Academic Reading passages, Reading question bank with feedback, Listening practice scripts, TOEFL-style Speaking and Writing tasks, and rubrics.
- Content quality enforcement in `scripts/check_project.py` (requires TOEFL blocks + complete vocabulary and phrases).

### Changed
- Lesson page now renders TOEFL sections (Reading/Questions/Listening/Speaking/Writing) and displays CEFR consistently.
- Phrases now support structured objects (phrase/translation/use/example) and render with translations.

### Fixed
- Index page now displays CEFR correctly (previously used `level`).

## [6.6.0] - 2026-01-29
### Added
- Standardized lesson framework across all lessons: consistent `vocabulary` schema (word/translation/pos/definition/example) and minimum content guarantees.
- Added a vocabulary mini-quiz and TOEFL-style quick rubrics (Speaking/Writing) on lesson pages.

### Changed
- Lesson renderer now prefers `cefr` level and shows richer vocabulary details.

### Fixed
- Strengthened `scripts/check_project.py` to catch incomplete lessons (vocabulary + phrases) before release.
## 6.5.1 — 2026-01-29

- Replaced the Supermarket lesson image with a new photoreal-graded WebP (800/1600) and updated alt text, caption, and prompt.
- Strengthened Supermarket lesson content (image description + speaking/writing samples).
- Updated placeholders for the new image.

## [6.4.1] - 2026-01-29
- Fixed lesson page container markup (duplicate id) to prevent null DOM errors.
- Added <meta name="mobile-web-app-capable" content="yes"> to all pages (Safari/Chrome compliance).
- Added defensive container fallback in js/lesson.js.
- Improved scripts/check_project.py with HTML structure checks.

## [6.4.0] - 2026-01-29

### Added
- Luxe UI theme layer (`css/luxe.css`) with refined typography, glassy surfaces, and tasteful animations (respects `prefers-reduced-motion`).
- Blurred placeholder + lazy image loader (`js/image-loader.js`) backed by generated `assets/images/placeholders.json`.
- Practice content to every lesson (`practice`, `imageAnalysis`, `grammarDetail`) for speaking/writing/vocabulary drills.

### Changed
- Upgraded lesson page rendering to show structured image checklist + practice section.
- Enhanced five “generic” lesson images with a cohesive cinematic grade (new `*-luxe-*` WebP variants) and updated references.

### Fixed
- Improved robustness of image loading for smoother UX and fewer layout jumps.

## [6.3.0] - 2026-01-29

### Added
- Added detailed English `imageDescription` to every lesson JSON (used for speaking/writing prompts).

### Fixed
- Fixed `lessons reminds` load bug on index (registry JSON parsed as object) that caused `lessons.filter is not a function`.
- Added `mobile-web-app-capable` meta tag to remove deprecation warning.

### Changed
- Synced version fields across `manifest.json`, `assets/data/registry.json`, and Service Worker cache version.


## [6.2.0] - 2026-01-29
### Added
- جستجوی سریع درس‌ها در صفحه خانه (فیلتر عنوان/سطح/تگ‌ها) با نمایش تعداد نتایج.
- تم روشن/تاریک با دکمه تغییر تم و ذخیره در مرورگر.
- فهرست (TOC) چسبان در صفحه درس + ناوبری درس قبلی/بعدی بر اساس ترتیب registry.
- Lighthouse CI (اختیاری/غیرمسدودکننده) برای گزارش کیفیت در GitHub Actions.

### Changed
- بهبود ریسپانسیو و UX: چیدمان صفحه درس به صورت دو ستون در دسکتاپ و TOC جمع‌شونده در موبایل.
- بهبود دسترس‌پذیری: skip link، focus-visible بهتر، aria-label برای کنترل‌ها.


## [6.1.1] - 2026-01-29
### Added
- Added `VERSION`, `CHANGELOG.md`, `codex.md`, and CI workflow for link/data checks.
- Added SEO basics (meta description, canonical, Open Graph, Twitter cards) and Schema.org JSON-LD.
- Added responsive WebP image pipeline outputs (800w/1600w) and `srcset` usage for lesson cards and lesson page images.

### Changed
- Improved service worker path handling for subdirectory hosting (relative assets + scope-aware fetch matching).
- Improved accessibility (focus-visible styles, better touch targets, lazy-loading images).

## [6.1.0] - (snapshot)
- Baseline version from `TOEFL_Academic_PWA_v61_full.zip`.

## 6.5.0 — 2026-01-29

- Improved lesson content completeness: added imageAlt, richer speaking/writing sample answers, and imagePrompt for each lesson.
- Added "Custom photo prompt" section with one-click copy and a warning badge for lessons that need a custom photoreal image.
- Design polish: premium buttons, callouts, prompt box styling, and improved hero image layout stability.
- Registry updated with needsNewImage flags for easier review.

## 6.18.30 — 2026-01-31
- Regenerated lesson collocations from scene-based generator and rebuilt collocations_index.json.
- Fixed collocation detail lookup by matching (lesson,id) to prevent cross-lesson mismatches.
- Added runtime collocation fallback generator (js/collocation-generator.js) for resilience.
- Sanitized lexicon placeholders and generated lexicon_missing_translations report.
## v5-theme-restored (2026-01-31)
- Restored legacy lesson renderer + TOC layout.
- Added missing CSS helpers for level practice blocks.


## v30.3-ax1-ax2-lessons (2026-02-01)
- Added 16 new photo lessons (Ax1/Ax2) with English-first descriptions, vocabulary, collocations, grammar, and exercises.
- Updated registry metadata and standardized lesson tags and image references.

## v30.7
- Fixed lesson tabs moving Vocabulary section (id now sec-vocab).
- Removed duplicate "Vocabulary" subgroup when only one default bucket exists.
- Removed redundant lesson switcher/TOC chips when tabs are present (prevents repeated category navigation).

## v30.8.9 — 2026-02-02
- Added a new **Scenario** section to every lesson (English-first, tap to reveal Persian).
- Scenario is available as a dedicated tab in lesson layout.
