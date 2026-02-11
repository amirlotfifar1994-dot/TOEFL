Changes applied automatically by assistant:

- js/exercise.js: Applied optional chaining / safety fixes
- js/speaking.js: Applied optional chaining / safety fixes
- js/word.js: Applied optional chaining / safety fixes
- js/collocation.js: Applied optional chaining / safety fixes
- js/main.js: Applied optional chaining / safety fixes
- js/lesson.js: Applied optional chaining / safety fixes
- js/grammar.js: Applied optional chaining / safety fixes
- js/lesson.js: Inserted renderLevelPractice placeholder

Notes:
- Replaced '.appendChild(' and '.replaceChildren(' occurrences with optional chaining to avoid errors when parent is null.
- Made document.getElementById(...).addEventListener calls safe using optional chaining.
- Added a placeholder renderLevelPractice function to avoid ReferenceError. Implement specific logic if needed.
