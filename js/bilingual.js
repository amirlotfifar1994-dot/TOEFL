/* Shared bilingual toggles: click English to reveal Persian (and vice versa if desired). */
(function(){
  'use strict';

  function wireBilingualToggles(root){
    root = root || document;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('.toggle-fa, [data-toggle="fa"], .bi [data-en]');
      if (!t) return;
      // If the click is on a navigation link, do not toggle.
      const nav = e.target && e.target.closest ? e.target.closest('a.no-toggle') : null;
      if (nav) return;
      // If it's a link/button that should navigate, ignore.
      if (t.tagName === 'A' && t.classList.contains('no-toggle')) return;

      const row = t.closest('.vocab-item, .colloc-item, .bi, li, .exampleLine, .row') || t.parentElement;
      if (!row) return;
      const fa = row.querySelector('.fa, .vocab-fa, .v-fa, [data-fa]');
      if (!fa) return;
      fa.classList.toggle('isHidden');
    });

    // Keyboard accessibility: Enter/Space on .toggle-fa
    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t) return;
      if (!(t.classList && t.classList.contains('toggle-fa'))) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      t.click();
    });
  }

  window.wireBilingualToggles = wireBilingualToggles;
})();
