/**
 * Grammar page script (bilingual, multi-level) - FIXED VERSION
 * 
 * FIXES:
 * - Replaced replaceAll with replace for better browser compatibility
 * - Using shared utilities from utils.js if available
 * - Removed duplicate wireBilingualToggles (uses shared version)
 * - Improved error handling
 */

(function() {
  'use strict';

  // Use shared utilities if available, otherwise define locally
  const escapeHTML = window.Utils?.escapeHTML || function(str) {
    return String(str || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[ch]));
  };

  const qs = window.Utils?.qs || function(sel, root = document) {
    return root.querySelector(sel);
  };

  const getParam = window.Utils?.getParam || function(name) {
    return new URLSearchParams(window.location.search).get(name);
  };

  const fetchJSON = window.Utils?.fetchJSON || async function(url, options = {}) {
    const res = await fetch(url, { cache: 'default', ...options });
    if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
    return res.json();
  };

  const wireBilingualToggles = window.Utils?.wireBilingualToggles || function(root) {
    if (!root) return;
    root.addEventListener('click', (e) => {
      const en = e.target.closest('.toggle-fa');
      if (!en) return;
      const parent = en.parentElement;
      const fa = parent && parent.querySelector('.fa');
      if (!fa) return;
      fa.classList.toggle('isHidden');
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target;
      if (!(el && el.classList && el.classList.contains('toggle-fa'))) return;
      e.preventDefault();
      el.click();
    });
  };

  /**
   * Render simple markdown-style bold (**text**)
   */
  function renderStrongMarkdown(s) {
    const safe = escapeHTML(s);
    return safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /**
   * Load registry.json
   */
  async function loadRegistry() {
    try {
      return await fetchJSON('assets/data/registry.json', { cache: 'no-store' });
    } catch (err) {
      throw new Error('Failed to load registry: ' + err.message);
    }
  }

  /**
   * Load lesson file
   */
  async function loadLessonFile(path) {
    try {
      return await fetchJSON(path, { cache: 'no-store' });
    } catch (err) {
      throw new Error('Failed to load lesson file: ' + err.message);
    }
  }

  /**
   * Set active level button
   */
  function setActiveLevel(level) {
    document.querySelectorAll('.level-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === level);
    });
  }

  /**
   * Render examples for selected level
   */
  function renderExamples(item, level) {
    const wrap = qs('#exampleList');
    if (!wrap) return;

    wrap.innerHTML = '';
    
    const arr = (item.examples && item.examples[level]) ? item.examples[level] : [];
    
    if (!arr.length) {
      wrap.innerHTML = '<p class="muted">No examples for this level.</p>';
      return;
    }
    
    arr.forEach(ex => {
      const card = document.createElement('div');
      card.className = 'exampleItem';
      
      const en = document.createElement('div');
      en.className = 'en toggle-fa';
      en.tabIndex = 0;
      en.textContent = ex.en || '';
      
      const fa = document.createElement('div');
      fa.className = 'fa isHidden';
      fa.setAttribute('dir', 'rtl');
      fa.textContent = ex.fa || '';
      
      card.appendChild(en);
      card.appendChild(fa);
      wrap.appendChild(card);
    });
  }

  /**
   * Show fallback error message
   */
  function showFallback(message = 'Grammar item not found') {
    const explain = qs('#gExplain');
    const examples = qs('#gExamples');
    const fallback = qs('#gFallback');

    if (explain) explain.style.display = 'none';
    if (examples) examples.style.display = 'none';
    if (fallback) {
      fallback.style.display = 'block';
      const msg = fallback.querySelector('.error-message');
      if (msg) msg.textContent = message;
    }
  }

  /**
   * Initialize grammar page
   */
  async function init() {
    try {
      const lessonId = getParam('lesson');
      const gid = getParam('g');
      
      if (!lessonId || !gid) {
        throw new Error('Missing required parameters: lesson and g');
      }

      const reg = await loadRegistry();
      const lessons = Array.isArray(reg) ? reg : (reg.lessons || []);
      const lessonMeta = lessons.find(x => x && x.id === lessonId);
      
      if (!lessonMeta) {
        throw new Error(`Lesson not found: ${lessonId}`);
      }

      // Set back link
      const back = qs('#backToLesson');
      if (back) {
        back.href = `lesson.html?id=${encodeURIComponent(lessonId)}`;
      }

      const data = await loadLessonFile(lessonMeta.file);
      const grammarItems = Array.isArray(data.grammar) ? data.grammar : [];
      const item = grammarItems.find(x => x && x.id === gid);
      
      if (!item) {
        showFallback(`Grammar item "${gid}" not found in lesson`);
        return;
      }

      // Set page title
      const titleEl = qs('#gTitle');
      const subtitleEl = qs('#gSubtitle');
      if (titleEl) titleEl.textContent = item.title || 'Grammar';
      if (subtitleEl) {
        subtitleEl.textContent = `${data.title || lessonId} • ${lessonId}`;
      }

      // Render explanation (bilingual)
      const exEn = qs('#explainEn');
      const exFa = qs('#explainFa');
      
      if (exEn && exFa) {
        const explainText = item.explain_en || item.explainEn || '';
        exEn.innerHTML = renderStrongMarkdown(explainText);
        exEn.classList.add('toggle-fa');
        exEn.tabIndex = 0;
        
        const explainFaText = item.explain_fa || item.explainFa || '';
        exFa.innerHTML = renderStrongMarkdown(explainFaText);
        exFa.classList.add('fa', 'isHidden');
        exFa.setAttribute('dir', 'rtl');

        // Toggle Persian explanation on click
        exEn.addEventListener('click', () => exFa.classList.toggle('isHidden'));
        exEn.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          exEn.click();
        });
      }

      // Render patterns (if any)
      const patWrap = qs('#patternWrap');
      if (patWrap) {
        patWrap.innerHTML = '';
        const pats = Array.isArray(item.patterns) ? item.patterns : [];
        
        if (pats.length) {
          const h = document.createElement('h3');
          h.className = 'h3';
          h.textContent = 'Patterns';
          
          const ul = document.createElement('ul');
          ul.className = 'exampleList';
          
          pats.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            ul.appendChild(li);
          });
          
          patWrap.appendChild(h);
          patWrap.appendChild(ul);
        }
      }

      // Initialize level toggle
      let currentLevel = 'beginner';
      setActiveLevel(currentLevel);
      renderExamples(item, currentLevel);

      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentLevel = btn.dataset.level;
          setActiveLevel(currentLevel);
          renderExamples(item, currentLevel);
        });
      });

    } catch (error) {
      console.error('Grammar page error:', error);
      showFallback(error.message || 'An error occurred loading the grammar content');
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    init();
    wireBilingualToggles(document.body);
  });

})();
