/* Dictionary page (letter-based, streaming)
   Data source: assets/data/dict_letters/{a..z}.json
   Each file maps UPPERCASE headwords to an entry:
     { MEANINGS: { "1": [pos, def], ... }, SYNONYMS: [], ANTONYMS: [] }
*/
(function(){
  'use strict';

  const $ = (s) => document.querySelector(s);

  const els = {
    q: $('#q'),
    btnClear: $('#btnClear'),
    meta: $('#meta'),
    matches: $('#matches'),
    entryMeta: $('#entryMeta'),
    entry: $('#entry'),
  };

  const CACHE = new Map(); // letter -> data (LRU)

  function chunkKeyFor(text){
    const t = String(text||'').toLowerCase();
    const m = t.match(/[a-z]/);
    return m ? m[0] : null;
  }

  async function loadLetter(letter){
    if(!letter) return null;
    if(CACHE.has(letter)){
      const v = CACHE.get(letter);
      CACHE.delete(letter); CACHE.set(letter, v);
      return v;
    }
    try{
      const res = await fetch(`assets/data/dict_letters/${letter}.json`, { cache: 'force-cache' });
      if(!res.ok) return null;
      const data = await res.json();
      CACHE.set(letter, data);
      while(CACHE.size > 3){
        const oldest = CACHE.keys().next().value;
        CACHE.delete(oldest);
      }
      return data;
    }catch(e){
      console.warn('dict load failed', e);
      return null;
    }
  }

  function normalizeQuery(q){
    const up = String(q||'').trim().toUpperCase();
    if(!up) return '';
    // keep dot and hyphen (they exist in keys)
    return up.replace(/[^A-Z0-9\.\-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  }

  function clearEntry(){
    if(els.entryMeta) els.entryMeta.textContent = '';
    if(els.entry) els.entry.innerHTML = '';
  }

  function renderEntry(headword, entry){
    clearEntry();
    if(!els.entry) return;

    if(els.entryMeta){
      els.entryMeta.textContent = headword;
    }

    if(!entry){
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No entry found.';
      els.entry.appendChild(p);
      return;
    }

    const meanings = entry.MEANINGS && typeof entry.MEANINGS === 'object' ? entry.MEANINGS : null;

    if(meanings){
      const ol = document.createElement('ol');
      ol.className = 'list';
      Object.keys(meanings)
        .sort((a,b)=>parseFloat(a)-parseFloat(b))
        .slice(0, 15)
        .forEach(k=>{
          const pair = meanings[k];
          const li = document.createElement('li');
          const pos = (pair && pair[0]) ? String(pair[0]) : '';
          const def = (pair && pair[1]) ? String(pair[1]) : '';
          li.textContent = (pos ? `(${pos}) ` : '') + def;
          ol.appendChild(li);
        });
      els.entry.appendChild(ol);
    }else{
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No meanings available.';
      els.entry.appendChild(p);
    }

    // chips
    const chipWrap = document.createElement('div');
    chipWrap.className = 'dictChips';

    function addChipGroup(title, arr){
      if(!Array.isArray(arr) || !arr.length) return;
      const g = document.createElement('div');
      g.className = 'chipGroup';
      const h = document.createElement('div');
      h.className = 'chipTitle';
      h.textContent = title;
      g.appendChild(h);
      const row = document.createElement('div');
      row.className = 'chipRow';
      arr.slice(0, 24).forEach(v=>{
        const a = document.createElement('a');
        a.href = `word.html?id=${encodeURIComponent(String(v))}`;
        a.className = 'chip';
        a.textContent = String(v);
        row.appendChild(a);
      });
      g.appendChild(row);
      chipWrap.appendChild(g);
    }

    addChipGroup('Synonyms', entry.SYNONYMS);
    addChipGroup('Antonyms', entry.ANTONYMS);

    if(chipWrap.children.length){
      els.entry.appendChild(chipWrap);
    }
  }

  async function search(){
    const qRaw = String(els.q?.value || '').trim();
    const q = normalizeQuery(qRaw);

    if(els.btnClear){
      els.btnClear.disabled = !qRaw;
    }

    if(!q){
      if(els.meta) els.meta.textContent = '';
      if(els.matches) els.matches.innerHTML = '';
      clearEntry();
      return;
    }

    const letter = chunkKeyFor(q);
    if(!letter){
      if(els.meta) els.meta.textContent = 'Type an English word (A–Z).';
      if(els.matches) els.matches.innerHTML = '';
      clearEntry();
      return;
    }

    const data = await loadLetter(letter);
    if(!data){
      if(els.meta) els.meta.textContent = 'Dictionary data failed to load.';
      if(els.matches) els.matches.innerHTML = '';
      clearEntry();
      return;
    }

    const keys = Object.keys(data);
    const matches = [];
    // Prefix match first, then includes
    for(const k of keys){
      if(k.startsWith(q)){
        matches.push(k);
        if(matches.length >= 60) break;
      }
    }
    if(matches.length < 20){
      const q2 = q.replace(/-/g,'');
      for(const k of keys){
        if(matches.length >= 60) break;
        if(matches.includes(k)) continue;
        if(k.includes(q) || (q2 && k.includes(q2))){
          matches.push(k);
        }
      }
    }

    if(els.meta){
      els.meta.textContent = `${matches.length ? matches.length : 0} matches in “${letter.toUpperCase()}”`;
    }

    if(els.matches){
      els.matches.innerHTML = '';
      if(!matches.length){
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'No matches found.';
        els.matches.appendChild(p);
      }else{
        matches.slice(0, 50).forEach(k=>{
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'match-item';
          a.textContent = k;
          a.addEventListener('click', async (ev)=>{
            ev.preventDefault();
            renderEntry(k, data[k]);
            history.replaceState(null, '', `dictionary.html?q=${encodeURIComponent(qRaw)}&w=${encodeURIComponent(k)}`);
          });
          els.matches.appendChild(a);
        });
      }
    }

    // auto-open exact match
    if(data[q]){
      renderEntry(q, data[q]);
    }else{
      clearEntry();
    }
  }

  function initFromURL(){
    try{
      const u = new URL(location.href);
      const q = u.searchParams.get('q');
      const w = u.searchParams.get('w');
      if(q && els.q) els.q.value = q;
      if(w){
        // will render after search loads letter
      }
    }catch(e){}
  }

  function bind(){
    if(els.q){
      let t = null;
      els.q.addEventListener('input', ()=>{
        clearTimeout(t);
        t = setTimeout(search, 140);
      });
      els.q.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          search();
        }
      });
    }
    if(els.btnClear){
      els.btnClear.addEventListener('click', ()=>{
        if(els.q) els.q.value = '';
        if(els.q) els.q.focus();
        search();
      });
    }
  }

  bind();
  initFromURL();
  search();

})();