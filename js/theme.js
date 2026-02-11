/**
 * Enhanced Theme Toggler - 3 Themes Support
 * - Dark (default)
 * - Light
 * - Nebula (new cosmic theme)
 * 
 * Persist choice in localStorage
 */

(function () {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;
  
  // Available themes
  const THEMES = {
    dark: { name: 'Dark', icon: '🌙', next: 'light' },
    light: { name: 'Light', icon: '☀️', next: 'nebula' },
    nebula: { name: 'Nebula', icon: '🌌', next: 'dark' }
  };

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches 
      ? 'light' 
      : 'dark';
  }

  function applyTheme(theme) {
    // Validate theme
    if (!THEMES[theme]) {
      theme = 'dark';
    }
    
    // Apply to root element
    if (theme === 'dark') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // Update toggle button
    updateToggle(theme);
    
    // Add/remove nebula particles if needed
    if (theme === 'nebula') {
      addNebulaParticles();
    } else {
      removeNebulaParticles();
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function updateToggle(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    
    const themeData = THEMES[theme] || THEMES.dark;
    
    btn.setAttribute('aria-pressed', String(theme !== 'dark'));
    btn.setAttribute('aria-label', `Switch to ${THEMES[themeData.next].name} mode`);
    btn.textContent = themeData.icon;
    btn.title = `Current: ${themeData.name} • Click for ${THEMES[themeData.next].name}`;
  }

  function addNebulaParticles() {
    // Check if already exists
    if (document.querySelector('.nebula-particles')) return;
    
    const container = document.createElement('div');
    container.className = 'nebula-particles';
    container.setAttribute('aria-hidden', 'true');
    
    // Create 5 floating particles
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('div');
      particle.className = 'nebula-particle';
      container.appendChild(particle);
    }
    
    document.body.appendChild(container);
  }

  function removeNebulaParticles() {
    const particles = document.querySelector('.nebula-particles');
    if (particles) {
      particles.remove();
    }
  }

  function cycleTheme() {
    const current = root.getAttribute('data-theme') || 'dark';
    const themeData = THEMES[current] || THEMES.dark;
    const next = themeData.next;
    applyTheme(next);
  }

  function init() {
    // Get saved theme or use system preference
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = THEMES[saved] ? saved : getSystemTheme();
    applyTheme(theme);

    // Bind toggle button
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', cycleTheme);
    }

    // Responsive menu toggle (mobile)
    const header = document.querySelector('header.appHeader');
    const menuBtn = document.getElementById('menuToggle');
    if (header && menuBtn) {
      const closeMenu = () => {
        header.classList.remove('isMenuOpen');
        menuBtn.setAttribute('aria-expanded', 'false');
      };

      menuBtn.addEventListener('click', () => {
        const willOpen = !header.classList.contains('isMenuOpen');
        header.classList.toggle('isMenuOpen', willOpen);
        menuBtn.setAttribute('aria-expanded', String(willOpen));
      });

      // Close when a nav link is tapped
      header.querySelectorAll('nav a').forEach((a) => 
        a.addEventListener('click', closeMenu)
      );

      // Close on resize back to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 720) closeMenu();
      }, { passive: true });
    }
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually selected a theme
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global bilingual toggles (click English to reveal Persian)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.toggle-fa');
    if (!t) return;
    const p = t.parentElement;
    const fa = p && p.querySelector('.fa');
    if (!fa) return;
    // If this is a link, don't block navigation unless it has a dedicated toggle button.
    if (t.tagName === 'A') return;
    fa.classList.toggle('isHidden');
    t.classList.toggle('isOpen');
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target;
    if (!(el && el.classList && el.classList.contains('toggle-fa'))) return;
    e.preventDefault();
    el.click();
  });

})();
