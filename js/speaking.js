/**
 * Speaking Practice Module v2.1 (Fixed)
 * - Integrated simulation: Read -> Prep -> Speak (for integrated tasks)
 * - Independent: Prep -> Speak
 * - Optional audio recording (MediaRecorder)
 * - Notes + self-checklist + self-score saved to localStorage
 * - Attempt history (timestamp + score + checklist completion + notes preview)
 *
 * FIXES:
 * - Removed incorrect code from renderHistory function (lines 158-166)
 * - Added proper cleanup for event listeners
 * - Improved error handling
 * - Used shared utilities where possible
 */
(function () {
  'use strict';
  
  const LS_PREFIX = 'toefl_speaking_';

  // Use shared utilities if available, otherwise define locally
  const qs = window.Utils?.qs || ((sel, root = document) => root.querySelector(sel));
  const qsa = window.Utils?.qsa || ((sel, root = document) => Array.from(root.querySelectorAll(sel)));
  const clearEl = window.Utils?.clearEl || ((el) => { if (el) el.replaceChildren(); });
  const makeEl = window.Utils?.makeEl || ((tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = String(text);
    return e;
  });

  function fmt(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function safeJsonParse(s, fallback) {
    try {
      return JSON.parse(s);
    } catch {
      return fallback;
    }
  }

  function keyBase(lessonId, taskIndex) {
    return `${LS_PREFIX}${lessonId}__${taskIndex}`;
  }

  function loadState(lessonId, taskIndex) {
    try {
      const raw = localStorage.getItem(keyBase(lessonId, taskIndex));
      return safeJsonParse(raw, { notes: '', checks: {}, score: '', attempts: [] });
    } catch (err) {
      console.warn('Failed to load state from localStorage:', err);
      return { notes: '', checks: {}, score: '', attempts: [] };
    }
  }

  function saveState(lessonId, taskIndex, state) {
    try {
      localStorage.setItem(keyBase(lessonId, taskIndex), JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }

  function supportsRecording() {
    return !!(navigator.mediaDevices && window.MediaRecorder);
  }

  async function getMicStream() {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  function makeBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch (err) {
      console.warn('Beep sound failed:', err);
    }
  }

  function formatDate(ts) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  function initModule(el) {
    const lessonId = el.dataset.lessonId || 'lesson';
    const taskIndex = el.dataset.taskIndex || '0';

    const type = el.dataset.type || 'task';
    const readTotal = parseInt(el.dataset.read || '0', 10);
    const prepTotal = parseInt(el.dataset.prep || '0', 10);
    const speakTotal = parseInt(el.dataset.speak || '0', 10);

    const timer = qs('.spTimer', el);
    const phase = qs('.spPhase', el);
    const startBtn = qs('.spStart', el);
    const stopBtn = qs('.spStop', el);
    const resetBtn = qs('.spReset', el);

    const recordToggle = qs('.spRecord', el);
    const recordStatus = qs('.spRecordStatus', el);
    const audioWrap = qs('.spAudioWrap', el);
    const audio = qs('audio', el);
    const download = qs('.spDownload', el);

    const notes = qs('.spNotes', el);
    const scoreSel = qs('.spScore', el);

    const checklistItems = qsa('input[type="checkbox"][data-check]', el);

    const historyCount = qs('.spAttemptCount', el);
    const historyList = qs('.spHistoryList', el);
    const clearHistoryBtn = qs('.spClearHistory', el);

    // Restore notes + checklist + score + attempts
    const saved = loadState(lessonId, taskIndex);
    if (notes) notes.value = saved.notes || '';
    if (scoreSel) scoreSel.value = saved.score || '';
    checklistItems.forEach(cb => {
      const key = cb.dataset.check;
      cb.checked = !!(saved.checks && saved.checks[key]);
    });

    function persist() {
      const st = loadState(lessonId, taskIndex);
      st.notes = notes ? notes.value : '';
      st.score = scoreSel ? scoreSel.value : '';
      st.checks = st.checks || {};
      checklistItems.forEach(cb => {
        st.checks[cb.dataset.check] = cb.checked;
      });
      saveState(lessonId, taskIndex, st);
      renderHistory();
    }

    if (notes) notes.addEventListener('input', persist);
    if (scoreSel) scoreSel.addEventListener('change', persist);
    checklistItems.forEach(cb => cb.addEventListener('change', persist));

    function checklistCompletion(st) {
      const keys = Object.keys(st.checks || {});
      if (!keys.length) return { done: 0, total: 0 };
      let done = 0;
      keys.forEach(k => {
        if (st.checks[k]) done++;
      });
      return { done, total: keys.length };
    }

    // FIXED: Removed incorrect code that was adding feedback UI inside history loop
    function renderHistory() {
      if (!historyList) return;
      const st = loadState(lessonId, taskIndex);
      const attempts = Array.isArray(st.attempts) ? st.attempts : [];
      const shown = attempts.slice(-5).reverse();

      if (historyCount) {
        historyCount.textContent = attempts.length ? `(${attempts.length})` : '';
      }

      clearEl(historyList);
      
      if (!shown.length) {
        const li = document.createElement('li');
        li.className = 'empty-state';
        li.textContent = 'No attempts yet. Do one timed run, then your history will appear here.';
        historyList.appendChild(li);
        return;
      }

      shown.forEach((attempt, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // Attempt header
        const header = document.createElement('div');
        header.className = 'attempt-header';
        
        const dateEl = document.createElement('span');
        dateEl.className = 'attempt-date';
        dateEl.textContent = formatDate(attempt.ts);
        header.appendChild(dateEl);

        if (attempt.score) {
          const scoreEl = document.createElement('span');
          scoreEl.className = 'attempt-score';
          scoreEl.textContent = `Score: ${attempt.score}`;
          header.appendChild(scoreEl);
        }

        li.appendChild(header);

        // Checklist completion
        if (attempt.checksTotal > 0) {
          const checkInfo = document.createElement('div');
          checkInfo.className = 'attempt-checks';
          checkInfo.textContent = `Checklist: ${attempt.checksDone}/${attempt.checksTotal} completed`;
          li.appendChild(checkInfo);
        }

        // Notes preview
        if (attempt.notesPreview) {
          const notesDiv = document.createElement('div');
          notesDiv.className = 'attempt-notes';
          notesDiv.textContent = `Notes: ${attempt.notesPreview}`;
          li.appendChild(notesDiv);
        }

        historyList.appendChild(li);
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to clear all attempt history?')) return;
        const st = loadState(lessonId, taskIndex);
        st.attempts = [];
        saveState(lessonId, taskIndex, st);
        renderHistory();
      });
    }

    // Recording
    if (!supportsRecording()) {
      if (recordToggle) recordToggle.disabled = true;
      if (recordStatus) recordStatus.textContent = 'Recording not supported in this browser.';
    }

    let interval = null;
    let currentPhase = 'idle'; // read | prep | speak | done | idle
    let remaining = 0;

    let micStream = null;
    let recorder = null;
    let chunks = [];
    let lastBlobUrl = null;

    async function startRecordingIfNeeded() {
      if (!recordToggle || !recordToggle.checked || !supportsRecording()) return;
      try {
        micStream = await getMicStream();
        recorder = new MediaRecorder(micStream);
        chunks = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: (chunks[0] && chunks[0].type) || 'audio/webm' });
          if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
          lastBlobUrl = URL.createObjectURL(blob);
          
          if (audio) audio.src = lastBlobUrl;
          if (download) {
            download.href = lastBlobUrl;
            download.download = `speaking_${lessonId}_task${parseInt(taskIndex, 10) + 1}.webm`;
          }
          if (audioWrap) audioWrap.hidden = false;
          if (recordStatus) recordStatus.textContent = 'Recorded.';
        };
        
        recorder.start();
        if (recordStatus) recordStatus.textContent = 'Recording...';
      } catch (err) {
        console.error('Recording failed:', err);
        if (recordStatus) recordStatus.textContent = 'Mic permission denied.';
      }
    }

    function stopRecordingIfRunning() {
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch (err) {
        console.warn('Error stopping recorder:', err);
      }
      try {
        if (micStream) micStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn('Error stopping mic stream:', err);
      }
      recorder = null;
      micStream = null;
    }

    function setUI(ph, secs) {
      currentPhase = ph;
      if (phase) {
        if (ph === 'read') phase.textContent = 'Read';
        else if (ph === 'prep') phase.textContent = 'Prep';
        else if (ph === 'speak') phase.textContent = 'Speak';
        else if (ph === 'done') phase.textContent = 'Done';
        else phase.textContent = 'Ready';
      }
      if (timer) timer.textContent = fmt(secs);
      el.dataset.phase = ph;
    }

    function clearTimer() {
      if (interval) clearInterval(interval);
      interval = null;
    }

    function stopAll() {
      clearTimer();
      stopRecordingIfRunning();
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    }

    function recordAttempt() {
      const st = loadState(lessonId, taskIndex);
      const completion = checklistCompletion(st);
      const noteText = (st.notes || '').trim().replace(/\s+/g, ' ');
      const attempt = {
        ts: Date.now(),
        type,
        score: st.score || '',
        checksDone: completion.done,
        checksTotal: completion.total,
        notesPreview: noteText ? noteText.slice(0, 90) : ''
      };
      st.attempts = Array.isArray(st.attempts) ? st.attempts : [];
      st.attempts.push(attempt);
      // cap history (keep last 30)
      if (st.attempts.length > 30) st.attempts = st.attempts.slice(-30);
      saveState(lessonId, taskIndex, st);
      renderHistory();
    }

    function start() {
      stopAll();
      if (audioWrap) audioWrap.hidden = true;

      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;

      // Phase selection:
      // Integrated: Read -> Prep -> Speak
      // Independent: Prep -> Speak (or Speak only)
      if (type === 'integrated' && readTotal > 0) {
        remaining = readTotal;
        setUI('read', remaining);
      } else if (prepTotal > 0) {
        remaining = prepTotal;
        setUI('prep', remaining);
      } else {
        remaining = speakTotal;
        setUI('speak', remaining);
        startRecordingIfNeeded();
      }

      interval = setInterval(() => {
        remaining -= 1;
        setUI(currentPhase, Math.max(remaining, 0));

        if (remaining <= 0) {
          makeBeep();

          if (currentPhase === 'read') {
            // move to prep (or speak if no prep)
            if (prepTotal > 0) {
              remaining = prepTotal;
              setUI('prep', remaining);
            } else {
              remaining = speakTotal;
              setUI('speak', remaining);
              startRecordingIfNeeded();
            }
            return;
          }

          if (currentPhase === 'prep') {
            remaining = speakTotal;
            setUI('speak', remaining);
            startRecordingIfNeeded();
            return;
          }

          if (currentPhase === 'speak') {
            clearTimer();
            setUI('done', 0);
            stopRecordingIfRunning();
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;

            // Save attempt into history
            recordAttempt();
          }
        }
      }, 1000);
    }

    function stop() {
      stopAll();
      // Reset to starting phase display
      if (type === 'integrated' && readTotal > 0) setUI('idle', readTotal);
      else setUI('idle', prepTotal > 0 ? prepTotal : speakTotal);
    }

    function reset() {
      stopAll();
      if (type === 'integrated' && readTotal > 0) setUI('idle', readTotal);
      else setUI('idle', prepTotal > 0 ? prepTotal : speakTotal);

      if (notes) notes.value = '';
      if (scoreSel) scoreSel.value = '';
      checklistItems.forEach(cb => cb.checked = false);

      const st = loadState(lessonId, taskIndex);
      st.notes = '';
      st.score = '';
      st.checks = {};
      saveState(lessonId, taskIndex, st);

      if (audioWrap) audioWrap.hidden = true;
      if (recordStatus) {
        recordStatus.textContent = supportsRecording() 
          ? 'Ready.' 
          : 'Recording not supported in this browser.';
      }

      renderHistory();
    }

    // Init UI
    if (type === 'integrated' && readTotal > 0) setUI('idle', readTotal);
    else setUI('idle', prepTotal > 0 ? prepTotal : speakTotal);

    if (recordStatus) {
      recordStatus.textContent = supportsRecording() 
        ? 'Ready.' 
        : 'Recording not supported in this browser.';
    }
    if (stopBtn) stopBtn.disabled = true;

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn) stopBtn.addEventListener('click', stop);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    renderHistory();

    // IMPROVED: Use once option and store cleanup reference
    const cleanup = () => {
      stopAll();
      if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    };
    
    window.addEventListener('beforeunload', cleanup, { once: true });
    
    // Store cleanup function for potential manual cleanup
    el._cleanup = cleanup;
  }

  function initSpeakingModules() {
    qsa('.speakingModule').forEach(initModule);
  }

  // Export to global scope
  window.initSpeakingModules = initSpeakingModules;
})();
