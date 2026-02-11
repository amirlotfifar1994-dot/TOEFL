/**
 * Exercise page: one page per exercise with a built-in timer - FIXED VERSION
 * 
 * FIXES:
 * - Added proper try-catch error handling
 * - Using shared utilities from utils.js if available
 * - Improved error messages for users
 * - Better null checking
 */

(async function () {
  'use strict';

  // Use shared utilities if available
  const escapeHTML = window.Utils?.escapeHTML || function(str) {
    return String(str || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[ch]));
  };

  const qs = window.Utils?.qs || ((sel) => document.querySelector(sel));

  function formatTime(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /**
   * Show error message to user
   */
  function showError(title, message) {
    const titleEl = qs('#exerciseTitle');
    const promptEl = qs('#exercisePrompt');
    const startBtn = qs('#timerStart');

    if (titleEl) titleEl.textContent = title;
    if (promptEl) promptEl.textContent = message;
    if (startBtn) startBtn.disabled = true;
  }

  try {
    const params = new URLSearchParams(location.search);
    const lessonId = params.get('lesson');
    const exId = params.get('ex');

    // Basic routing guard
    if (!lessonId) {
      showError(
        'Exercise not found',
        'Missing lesson id in the URL. Please return to the lessons page.'
      );
      return;
    }

    // Set back link
    const backLink = qs('#backToLesson');
    if (backLink) {
      backLink.href = `lesson.html?id=${encodeURIComponent(lessonId)}`;
    }

    // Load registry → lesson file (scope-aware for GitHub Pages; retries transient 503)
    const registry = await (window.Utils?.fetchJSON
      ? window.Utils.fetchJSON('assets/data/registry.json', { cache: 'no-store' })
      : (await (await fetch('assets/data/registry.json', { cache: 'no-store' })).json()));
    const lessons = Array.isArray(registry) ? registry : (registry.lessons || []);
    const lessonMeta = lessons.find(l => l && l.id === lessonId);

    if (!lessonMeta) {
      showError(
        'Lesson not found',
        `The lesson "${lessonId}" is not listed in the registry.`
      );
      return;
    }

    const lessonUrl = window.Utils?.resolveAssetURL ? window.Utils.resolveAssetURL(lessonMeta.file) : lessonMeta.file;
    const lessonRes = await fetch(lessonUrl, { cache: 'no-store' });
    if (!lessonRes.ok) {
      throw new Error(`Failed to load lesson: HTTP ${lessonRes.status}`);
    }

    const lesson = await lessonRes.json();
    const exercises = Array.isArray(lesson.exercises) ? lesson.exercises : [];

    // If no exercise id is provided, show the lesson exercise chooser page.
    if (!exId) {
      const chooser = document.getElementById('exerciseChooser');
      const list = document.getElementById('exerciseList');
      if (chooser && list) {
        chooser.classList.remove('is-hidden');
        while (list.firstChild) list.removeChild(list.firstChild);

        // Header title
        const pageTitle = document.getElementById('exerciseTitle');
        if (pageTitle) pageTitle.textContent = 'Exercises';

        // Back link
        const back = document.getElementById('backToLesson');
        if (back) back.href = `lesson.html?id=${encodeURIComponent(lessonId)}`;

        if (!exercises.length) {
          const p = document.createElement('p'); p.className='muted'; p.textContent='No exercises are available for this lesson.'; list.appendChild(p);
          return;
        }

        const grid = document.createElement('div');
        grid.className = 'exerciseCardGrid';

        for (const ex of exercises) {
          if (!ex || !ex.id) continue;
          const a = document.createElement('a');
          a.className = 'exerciseCard';
          a.href = `exercise.html?lesson=${encodeURIComponent(lessonId)}&ex=${encodeURIComponent(ex.id)}`;

          const h = document.createElement('div');
          h.className = 'exerciseCardTitle';
          h.textContent = ex.title || ex.id;

          const meta = document.createElement('div');
          meta.className = 'exerciseCardMeta';
          const typ = ex.type ? String(ex.type) : 'practice';
          const mins = ex.timeMinutes ? `${ex.timeMinutes} min` : '';
          meta.textContent = [typ, mins].filter(Boolean).join(' • ');

          a.appendChild(h);
          a.appendChild(meta);
          grid.appendChild(a);
        }

        list.appendChild(grid);

        // Hide main exercise UI containers if present
        const host = document.getElementById('exerciseHost');
        if (host) host.classList.add('is-hidden');
      }
      return;
    }

    const exercise = exercises.find(x => x && x.id === exId);

    if (!exercise) {
      showError(
        'Exercise not found',
        `The exercise "${exId}" was not found in this lesson.`
      );
      return;
    }

    // Header
    const titleEl = qs('#exerciseTitle');
    const metaEl = qs('#exerciseMeta');
    const promptEl = qs('#exercisePrompt');

    if (titleEl) titleEl.textContent = exercise.name || 'Exercise';
    if (metaEl) {
      metaEl.textContent = `${lesson.title || lessonId} • ${exercise.level || 'general'} • ${exercise.type || 'practice'}`;
    }
    if (promptEl) promptEl.textContent = exercise.prompt || '';

    // Lesson image preview (so the learner can describe the photo while doing the exercise)
    const imgMeta = lesson && lesson.image ? lesson.image : null;
    const preview = qs('#lessonPreview');
    const imgEl = qs('#lessonImage');
    const src800 = qs('#lessonSrc800');
    const src1600 = qs('#lessonSrc1600');
    const capEl = qs('#lessonCaption');
    const toggleBtn = qs('#toggleLessonImage');

    if (imgMeta && (imgMeta.src800 || imgMeta.src1600) && preview && imgEl) {
      preview.hidden = false;

      const s800 = imgMeta.src800 || imgMeta.src1600;
      const s1600 = imgMeta.src1600 || imgMeta.src800;

      if (src800) src800.setAttribute('srcset', s800);
      if (src1600) src1600.setAttribute('srcset', s1600);

      imgEl.src = s800;
      imgEl.alt = imgMeta.alt || lesson.caption || lesson.title || 'Lesson photo';

      if (capEl) capEl.textContent = lesson.caption || '';
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const isHidden = imgEl.style.display === 'none';
          imgEl.style.display = isHidden ? '' : 'none';
          if (capEl) capEl.style.display = isHidden ? '' : 'none';
          toggleBtn.textContent = isHidden ? 'Show Persian' : 'Hide Persian';
        });
      }
    }

    // Phases UI
    const phases = Array.isArray(exercise.phases) ? exercise.phases : [{ label: 'Time', seconds: 60 }];
    const phaseList = qs('#phaseList');
    
    if (phaseList) {
      phaseList.innerHTML = '';
      phases.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'phaseRow';
        row.innerHTML = `<span class="phaseLabel">${escapeHTML(p.label || 'Phase')}</span><span class="phaseTime">${formatTime(p.seconds || 0)}</span>`;
        phaseList.appendChild(row);
      });
    }

    // Helpful language: show first N vocab, all collocations
    const vocab = Array.isArray(lesson.vocabularyDetailed) ? lesson.vocabularyDetailed : [];
    const collocs = Array.isArray(lesson.collocations) ? lesson.collocations : [];
    const tips = Array.isArray(exercise.tips) ? exercise.tips : [];

    renderPairs('#kvList', vocab.slice(0, 14));
    renderPairs('#collocList', collocs);
    renderList('#tipsList', tips.length ? tips : [
      'Use 2 collocations.',
      'Add 1 inference (a reasonable guess).',
      'Speak clearly and use transitions (first, then, however).'
    ]);

    // Prev/Next links
    const idx = exercises.findIndex(x => x && x.id === exId);
    const prev = idx > 0 ? exercises[idx - 1] : null;
    const next = (idx >= 0 && idx < exercises.length - 1) ? exercises[idx + 1] : null;

    const prevLink = qs('#prevExercise');
    const nextLink = qs('#nextExercise');

    if (prevLink) {
      prevLink.href = prev 
        ? `exercise.html?lesson=${encodeURIComponent(lessonId)}&ex=${encodeURIComponent(prev.id)}` 
        : `lesson.html?id=${encodeURIComponent(lessonId)}`;
      prevLink.textContent = prev ? `← ${prev.name || 'Previous'}` : '← Back to lesson';
    }

    if (nextLink) {
      nextLink.href = next 
        ? `exercise.html?lesson=${encodeURIComponent(lessonId)}&ex=${encodeURIComponent(next.id)}` 
        : `lesson.html?id=${encodeURIComponent(lessonId)}`;
      nextLink.textContent = next ? `${next.name || 'Next'} →` : 'Back to lesson →';
    }

    // Timer logic (supports multi-phase countdown)
    let phaseIndex = 0;
    let remaining = phases[0]?.seconds || 0;
    let timer = null;
    let running = false;

    const readout = qs('#timerReadout');
    const phaseLabel = qs('#timerPhase');
    const btnStart = qs('#timerStart');
    const btnPause = qs('#timerPause');
    const btnReset = qs('#timerReset');

    function updateUI() {
      if (readout) readout.textContent = formatTime(remaining);
      if (phaseLabel) phaseLabel.textContent = phases[phaseIndex]?.label || 'Done';
      if (btnPause) btnPause.disabled = !running;
      if (btnStart) btnStart.disabled = running;
    }

    function tick() {
      if (remaining > 0) {
        remaining -= 1;
        updateUI();
        return;
      }
      // Move to next phase
      phaseIndex += 1;
      if (phaseIndex >= phases.length) {
        stopTimer();
        if (phaseLabel) phaseLabel.textContent = 'Done ✅';
        if (btnStart) btnStart.disabled = true;
        if (btnPause) btnPause.disabled = true;
        return;
      }
      remaining = phases[phaseIndex].seconds || 0;
      updateUI();
    }

    function startTimer() {
      if (running) return;
      running = true;
      timer = setInterval(tick, 1000);
      updateUI();
    }

    function stopTimer() {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      updateUI();
    }

    function resetTimer() {
      stopTimer();
      phaseIndex = 0;
      remaining = phases[0]?.seconds || 0;
      if (btnStart) btnStart.disabled = false;
      updateUI();
    }

    if (btnStart) btnStart.addEventListener('click', startTimer);
    if (btnPause) btnPause.addEventListener('click', stopTimer);
    if (btnReset) btnReset.addEventListener('click', resetTimer);

    updateUI();

    // Utility functions
    function renderPairs(sel, arr) {
      const el = qs(sel);
      if (!el) return;
      
      el.innerHTML = '';
      (arr || []).forEach((it) => {
        const li = document.createElement('li');
        const en = it.en || it.word || '';
        const fa = it.fa || it.meaning || '';
        li.innerHTML = `<span class="kvEn toggle-fa" tabindex="0">${escapeHTML(en)}</span><span class="kvFa fa isHidden" dir="rtl">${escapeHTML(fa)}</span>`;
        el.appendChild(li);
      });
    }

    function renderList(sel, arr) {
      const el = qs(sel);
      if (!el) return;
      
      el.innerHTML = '';
      (arr || []).forEach((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        el.appendChild(li);
      });
    }

  } catch (error) {
    console.error('Exercise page error:', error);
    showError(
      'Error loading exercise',
      `Something went wrong: ${error.message}. Please try refreshing the page or return to the lesson.`
    );
  }
})();
