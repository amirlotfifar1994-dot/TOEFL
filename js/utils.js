/**
 * utils.js - Shared utility functions
 * These functions are used across multiple files to avoid duplication
 */

/**
 * Safely escape HTML to prevent XSS
 * Compatible with older browsers (doesn't use replaceAll)
 */
function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

/**
 * Clear all children of an element
 */
function clearEl(el) {
  if (el) el.replaceChildren();
}

/**
 * Create an element with optional class and text
 */
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

/**
 * Simple query selector wrapper
 */
function qs(sel, root = document) {
  return root.querySelector(sel);
}

/**
 * Query selector all wrapper returning array
 */
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/**
 * Bilingual toggle functionality (click English to reveal Persian)
 * Can be attached to any container element
 */
function wireBilingualToggles(root) {
  if (!root) return;
  
  // Click handler
  root.addEventListener('click', (e) => {
    const toggle = e.target.closest('.toggle-fa');
    if (!toggle) return;
    
    const parent = toggle.parentElement;
    if (!parent) return;
    
    const fa = parent.querySelector('.fa');
    if (!fa) return;
    
    fa.classList.toggle('isHidden');
    toggle.classList.toggle('isOpen');
  });
  
  // Keyboard accessibility
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    
    const el = e.target;
    if (!(el && el.classList && el.classList.contains('toggle-fa'))) return;
    
    e.preventDefault();
    el.click();
  });
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Get URL parameter value
 */
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Resolve a relative asset URL against the current document.
 * This makes fetch() work reliably on subdirectory hosting (e.g. GitHub Pages).
 */
function resolveAssetURL(path) {
  const p = String(path || '');
  // Leave absolute/virtual URLs untouched
  if (/^(https?:|data:|blob:)/i.test(p)) return p;
  // Support absolute-path URLs like "/assets/..." by resolving against origin
  if (p.startsWith('/')) return new URL(p, window.location.origin).toString();
  return new URL(p, document.baseURI).toString();
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch JSON with error handling
 */
async function fetchJSON(url, options = {}) {
  const resolved = resolveAssetURL(url);
  const defaultOptions = { cache: 'default', ...options };

  // Retry transient server/CDN hiccups (GitHub Pages occasionally throws 503)
  const retryStatuses = new Set([502, 503, 504]);
  const attempts = Number(options.__attempts || 3);

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(resolved, defaultOptions);
      if (!res.ok) {
        // Retry only transient statuses
        if (retryStatuses.has(res.status) && i < attempts - 1) {
          await sleep(250 * (i + 1));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${resolved}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await sleep(250 * (i + 1));
        continue;
      }
    }
  }
  throw lastErr || new Error(`Fetch failed: ${resolved}`);
}

/**
 * Normalize text for search (lowercase, trim)
 */
function normalizeText(str) {
  return (str || '').toString().toLowerCase().trim();
}

/**
 * Format date/time nicely
 */
function formatDate(timestamp) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

// Export all functions
if (typeof window !== 'undefined') {
  window.Utils = {
    escapeHTML,
    clearEl,
    makeEl,
    qs,
    qsa,
    wireBilingualToggles,
    formatTime,
    safeJsonParse,
    getParam,
    resolveAssetURL,
    fetchJSON,
    sleep,
    normalizeText,
    formatDate
  };
}
