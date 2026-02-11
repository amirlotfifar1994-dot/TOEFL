
function clearEl(el){ if(el) el.replaceChildren(); }

function makeEl(tag, className, text){
  const el=document.createElement(tag);
  if(className) el.className=className;
  if(text !== undefined && text !== null) el.textContent=String(text);
  return el;
}


// Escape HTML for safe innerHTML usage

function wrapTables(root){
  if(!root) return;
  root.querySelectorAll('table').forEach(tbl=>{
    const p = tbl.parentElement;
    if(p && p.classList && p.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });
}
function declutterLesson(container){
  if(!container) return;
  const blocks = [
    {title:'Overview', match:['overview','introduction','scenario','context','analysis']},
    {title:'Vocabulary', match:['vocabulary','words','vocabularydetailed']},
    {title:'Collocations', match:['collocation']},
    {title:'Grammar', match:['grammar']},
    {title:'Exercises', match:['exercise','tasks','practice']}
  ];
  const children = Array.from(container.children);
  if(children.length < 3) return;

  function idxFor(match){
    for(let i=0;i<children.length;i++){
      const el = children[i];
      const tag = (el.tagName||'').toLowerCase();
      const t = (el.textContent||'').trim().toLowerCase();
      const id = (el.id||'').toLowerCase();
      const cls = (el.className||'').toLowerCase();
      for(const m of match){
        const mm = String(m).toLowerCase();
        if(tag==='h2'||tag==='h3'){
          if(t.includes(mm)) return i;
        }
        if(id.includes(mm) || cls.includes(mm)) return i;
      }
    }
    return -1;
  }

  const indices = [];
  for(const b of blocks){
    const idx = idxFor(b.match);
    if(idx>=0) indices.push({idx, title:b.title});
  }
  indices.sort((a,b)=>a.idx-b.idx);
  if(indices.length < 2) return;

  const frags = [];
  for(let i=0;i<indices.length;i++){
    const start = indices[i].idx;
    const end = (i+1<indices.length) ? indices[i+1].idx : children.length;
    frags.push({title: indices[i].title, bodyEls: children.slice(start, end)});
  }
  container.innerHTML = '';
  frags.forEach((frag, i)=>{
    const details = document.createElement('details');
    details.className = 'lesson-section';
    if(i===0) details.open = true;
    const summary = document.createElement('summary');
    summary.innerHTML = `<span>${escapeHTML(frag.title)}</span><span class="muted">${frag.bodyEls.length} items</span>`;
    const body = document.createElement('div');
    body.className = 'section-body';
    frag.bodyEls.forEach(el=>body.appendChild(el));
    details.appendChild(summary);
    details.appendChild(body);
    container.appendChild(details);
  });
}

function applyFaToggles(root){
  // Deprecated: bilingual toggles are handled globally by js/bilingual.js
  // Keep this as a no-op to avoid duplicate buttons / duplicate hiding logic.
  return;
}


function extractLessonVocabTokens(lesson){
  const out = new Set();
  const pushStr = (s)=>{
    if(!s) return;
    String(s).split(/\s+/).forEach(tok=>{
      const t = tok.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'');
      if(t && /^[A-Za-z][A-Za-z\-']*$/.test(t)) out.add(t.toLowerCase());
    });
  };
  const walkArr = (arr)=>{
    if(!Array.isArray(arr)) return;
    arr.forEach(it=>{
      if(typeof it === 'string') pushStr(it);
      else if(it && typeof it === 'object'){
        if(it.en) pushStr(it.en);
        if(it.phrase) pushStr(it.phrase);
      }
    });
  };
  walkArr(lesson?.vocabularyDetailed);
  walkArr(lesson?.vocabulary);
  walkArr(lesson?.collocations);
  walkArr(lesson?.collocationsAll);
  // also add from examples
  const vdet = Array.isArray(lesson?.vocabularyDetailed) ? lesson.vocabularyDetailed : [];
  vdet.forEach(it=>{
    const ex = it && typeof it==='object' ? it.examples : null;
    if(ex && typeof ex==='object'){
      Object.values(ex).forEach(list=>{
        if(Array.isArray(list)) list.forEach(e=> pushStr(e?.en));
      });
    }
  });
  return Array.from(out);
}

function linkifyLessonEnglish(root, vocabTokens){
  try{
    if(!root) return;
    const vocab = new Set((vocabTokens||[]).map(x=>String(x||'').toLowerCase()).filter(Boolean));
    if(!vocab.size) return;

    const els = root.querySelectorAll('.en');
    els.forEach(el=>{
      if(el.dataset && el.dataset.linkified) return;
      if(el.children && el.children.length) return;
      const text = String(el.textContent||'');
      if(!text.trim()) return;

      const parts = text.split(/(\b[A-Za-z][A-Za-z\-']*\b)/g);
      if(parts.length < 3) return;

      const frag = document.createDocumentFragment();
      parts.forEach(p=>{
        const isWord = /^[A-Za-z][A-Za-z\-']*$/.test(p);
        if(isWord && vocab.has(p.toLowerCase())){
          const a = document.createElement('a');
          a.href = `word.html?id=${encodeURIComponent(p)}`;
          a.className = 'word-link';
          a.textContent = p;
          a.addEventListener('click', (ev)=>{ ev.stopPropagation(); });
          frag.appendChild(a);
        }else{
          frag.appendChild(document.createTextNode(p));
        }
      });
      el.textContent = '';
      el.appendChild(frag);
      if(el.dataset) el.dataset.linkified = '1';
    });
  }catch(e){}
}



function escapeHTML(value){
  const s = (value===undefined || value===null) ? '' : String(value);
  return s.replace(/[&<>"'`]/g, (ch) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
  }[ch]));
}

function computeVocabCount(data){
  let n = 0;
  if (Array.isArray(data?.vocabularyDetailed)) n += data.vocabularyDetailed.length;
  if (data?.vocabularyExtended && typeof data.vocabularyExtended === 'object') {
    for (const v of Object.values(data.vocabularyExtended)) {
      if (Array.isArray(v)) n += v.length;
    }
  }
  if (Array.isArray(data?.vocabulary)) n += data.vocabulary.length;
  return n;
}

// ------------------------------
// Vocabulary helpers (profiles)
// We reuse the app's existing word_profiles dataset to enrich vocabulary cards
// with POS/definition/examples when available.
// ------------------------------

function normalizeWordForProfile(w){
  return (w || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[’']/g, "'");
}

const __vocabProfileCache = new Map(); // letter -> profile map

async function loadWordProfiles(letter){
  const key = letter || '_';
  if (__vocabProfileCache.has(key)) return __vocabProfileCache.get(key);
  try{
    const res = await fetch(`assets/data/word_profiles/${key}.json`, { cache: 'force-cache' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    __vocabProfileCache.set(key, data);
    return data;
  }catch(_){
    const empty = Object.create(null);
    __vocabProfileCache.set(key, empty);
    return empty;
  }
}

async function getWordProfileForVocab(word){
  const w = normalizeWordForProfile(word);
  const first = w ? w[0] : '';
  const letter = (first && first >= 'a' && first <= 'z') ? first : '_';
  const map = await loadWordProfiles(letter);
  return map && map[w] ? map[w] : null;
}
// --- Lesson Layout v2 (tabs + intro drawers) ---
function applyLessonLayoutV2(article){
  if(!article || article.__layoutV2Applied) return;
  article.__layoutV2Applied = true;

  // Build header
  const h1 = article.querySelector('h1');
  const meta = article.querySelector('.meta-line');
  const toc = article.querySelector('.toc-chips');
  const heroImg = article.querySelector('img.lesson-image');

  const header = document.createElement('header');
  header.className = 'lessonHeader';

  // Move title + meta + toc
  if(h1) header.appendChild(h1);
  if(meta) header.appendChild(meta);
  if(toc) header.appendChild(toc);

  // Wrap hero image
  if(heroImg){
    const heroWrap = document.createElement('div');
    heroWrap.className = 'lessonHeroWrap';
    heroWrap.appendChild(heroImg);
    header.appendChild(heroWrap);
  }

  // Insert header at top
  if(article.firstChild){
    article.insertBefore(header, article.firstChild);
  }else{
    article.appendChild(header);
  }

  // Identify sections
  const sec = (id)=>article.querySelector('#'+id);

  const secFull = sec('sec-full-desc');

  // Intro stack (Photo desc + summary + drawers)
  const intro = document.createElement('div');
  intro.className = 'lessonIntroStack';

  if(secFull) intro.appendChild(secFull);
  if(secFull && window.TTS && window.TTS.attachToSection){ window.TTS.attachToSection(secFull); }

  // Optional: lesson overview / guide if present
  const secOverview = sec('sec-overview') || sec('sec-lesson-overview');
  if(secOverview) intro.appendChild(secOverview);

  // Levelled description block (controlled by the page's Level toggle)
  const secLevels = sec('sec-levels');
  if(secLevels) intro.appendChild(secLevels);

  // Drawer: analysis & prompts (kept collapsible to avoid clutter)
  const drawerLevels = document.createElement('details');
  drawerLevels.className = 'lessonDrawer';
  drawerLevels.open = false;
  drawerLevels.innerHTML = '<summary>Analysis & prompts <span class="hint">details • speaking • sentence bank</span></summary><div class="drawerBody"></div>';
  const levelsBody = drawerLevels.querySelector('.drawerBody');

  const moreIds = ['sec-image-analysis','sec-image-prompt','sec-speaking-prompts','sec-sentence-bank'];
  moreIds.forEach(id=>{
    const el = sec(id);
    if(el) levelsBody.appendChild(el);
  });
  if(levelsBody.children.length) intro.appendChild(drawerLevels);

  // Drawer: scene details (people/place/objects/etc)
  const drawerScene = document.createElement('details');
  drawerScene.className = 'lessonDrawer';
  drawerScene.open = false;
  drawerScene.innerHTML = '<summary>Scene details <span class="hint">people • place • objects</span></summary><div class="drawerBody"></div>';
  const sceneBody = drawerScene.querySelector('.drawerBody');

  const sceneIds = ['sec-people','sec-ages','sec-appearance','sec-clothing','sec-place','sec-env','sec-weather','sec-objects','sec-actions','sec-feelings','sec-visual','sec-phrases'];
  sceneIds.forEach(id=>{
    const el = sec(id);
    if(el) sceneBody.appendChild(el);
  });
  if(sceneBody.children.length) intro.appendChild(drawerScene);

  // Drawer: tips / guide
  const drawerTips = document.createElement('details');
  drawerTips.className = 'lessonDrawer';
  drawerTips.open = false;
  drawerTips.innerHTML = '<summary>Tips & guide <span class="hint">how to use this lesson</span></summary><div class="drawerBody"></div>';
  const tipsBody = drawerTips.querySelector('.drawerBody');

  const tipsIds = ['sec-tips','sec-guide','sec-mistakes','sec-toefl','sec-strategy','sec-checklist'];
  tipsIds.forEach(id=>{
    const el = sec(id);
    if(el) tipsBody.appendChild(el);
  });
  if(tipsBody.children.length) intro.appendChild(drawerTips);

  // Place intro after header
  header.insertAdjacentElement('afterend', intro);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'lessonTabs';
  tabs.setAttribute('role','tablist');

  const panelsWrap = document.createElement('div');

  const makeTab = (key, label) => {
    const btn = document.createElement('button');
    btn.className = 'lessonTabBtn';
    btn.type = 'button';
    btn.setAttribute('role','tab');
    btn.dataset.tab = key;
    btn.setAttribute('aria-selected','false');
    btn.textContent = label;
    return btn;
  };

  const makePanel = (key) => {
    const panel = document.createElement('section');
    panel.className = 'lessonTabPanel';
    panel.dataset.tabPanel = key;
    panel.setAttribute('role','tabpanel');
    return panel;
  };

  const tabDefs = [
    ['vocab','Vocabulary'],
    ['collocations','Collocations'],
    ['grammar','Grammar'],
    ['scenario','Scenario'],
    ['practice','Practice'],
    ['more','More'],
  ];

  const panels = {};
  tabDefs.forEach(([k,label])=>{
    tabs.appendChild(makeTab(k,label));
    const p = makePanel(k);
    panels[k] = p;
    panelsWrap.appendChild(p);
  });

  // Move existing sections into panels
  const vocabEl = sec('sec-vocab');
  if(vocabEl) panels.vocab.appendChild(vocabEl);

  const collEl = sec('sec-collocations');
  if(collEl) panels.collocations.appendChild(collEl);

  const gramEl = sec('sec-grammar');
  if(gramEl) panels.grammar.appendChild(gramEl);

  const scenEl = sec('sec-scenario');
  if(scenEl) panels.scenario.appendChild(scenEl);
// Practice: exercises section + link if exists
  const exEl = sec('sec-exercises');
  if(exEl) panels.practice.appendChild(exEl);

  // If practice panel is empty, add a fallback link
  if(!panels.practice.children.length){
    const p = document.createElement('div');
    p.className = 'textSection';
    p.innerHTML = '<h2>Practice</h2><p>Open the exercises page for timed practice.</p>';
    panels.practice.appendChild(p);
  }

  // Insert tabs+panels after intro
  intro.insertAdjacentElement('afterend', tabs);
  tabs.insertAdjacentElement('afterend', panelsWrap);

  // Park any remaining sections into a dedicated 'More' tab to avoid clutter
  const moreDrawer = document.createElement('details');
  moreDrawer.className = 'drawer';
  moreDrawer.innerHTML = `<summary class="drawerSummary">More sections</summary><div class="drawerBody"></div>`;
  const moreBody = moreDrawer.querySelector('.drawerBody');

  Array.from(article.children).forEach(ch => {
    if (ch.tagName !== 'SECTION') return;
    const id = ch.id || '';
    if (['sec-vocab','sec-collocations','sec-grammar','sec-scenario','sec-exercises'].includes(id)) return;
    moreBody.appendChild(ch);
  });

  if (moreBody.children.length) {
    panels.more.appendChild(moreDrawer);
  } else {
    const bMore = tabs.querySelector('.lessonTabBtn[data-tab="more"]');
    if (bMore) bMore.style.display = 'none';
    panels.more.style.display = 'none';
  }

// Tab behavior
  const buttons = Array.from(tabs.querySelectorAll('.lessonTabBtn'));
  const setActive = (key) => {
    buttons.forEach(b=>{
      const on = b.dataset.tab === key;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Object.keys(panels).forEach(k=>{
      panels[k].dataset.active = (k===key) ? 'true' : 'false';
    });
  };

  tabs.addEventListener('click', (e)=>{
    const btn = e.target.closest('.lessonTabBtn');
    if(!btn) return;
    setActive(btn.dataset.tab);
  });

  // default active: vocab if exists else collocations else grammar else practice
  const defaultTab = (vocabEl ? 'vocab' : (collEl ? 'collocations' : (gramEl ? 'grammar' : (scenEl ? 'scenario' : 'practice'))));
  setActive(defaultTab);
}


// --- Word Profiles (for richer vocab cards) ---
const WordProfiles = (function(){
  const cache = new Map(); // letter -> data
  function norm(w){ return String(w||'').trim().toLowerCase(); }
  function firstLetterKey(word){
    const m = norm(word).match(/[a-z]/i);
    return m ? m[0].toLowerCase() : '_';
  }
  async function fetchJSON(url){
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }
  async function loadLetter(letter){
    if (cache.has(letter)) return cache.get(letter);
    const data = await fetchJSON(`assets/data/word_profiles/${letter}.json`);
    cache.set(letter, data);
    return data;
  }
  async function get(word){
    const letter = firstLetterKey(word);
    if (letter === '_') return null;
    const data = await loadLetter(letter);
    return data[norm(word)] || null;
  }
  return { get };
})();

function applyTopSectionDrawers(article){
  try{
    if (!article) return;
    const sections = Array.from(article.querySelectorAll('section.section'));
    if (!sections.length) return;

    // take the first informational sections to reduce clutter
    const stopIdx = sections.findIndex(s=> (s.id||'').includes('vocab'));
    const limit = (stopIdx>0 ? Math.min(4, stopIdx) : Math.min(4, sections.length));

    for (let i=0;i<limit;i++){
      const sec = sections[i];
      const h = sec.querySelector('h2,h3');
      const title = h ? h.textContent.trim() : `Section ${i+1}`;

      const details = document.createElement('details');
      details.className = 'drawer-card section drawerSection';
      if (i===0) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'drawer-summary';
      summary.innerHTML = `<span class="drawer-title">${escapeHTML(title)}</span><span class="drawer-chevron" aria-hidden="true">▾</span>`;
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'drawer-body';

      const children = Array.from(sec.childNodes);
      children.forEach(ch=>{
        if (h && ch === h) return;
        body.appendChild(ch);
      });

      details.appendChild(body);
      sec.replaceWith(details);
    }
  }catch(e){
    console.warn('applyTopSectionDrawers failed', e);
  }
}

async function enrichVocabItemsWithProfiles(listEl){
  try{
    if (!listEl) return;
    const items = Array.from(listEl.querySelectorAll('li.vocabItem'));
    if (!items.length) return;

    for (const li of items){
      const wordEl = li.querySelector('.en');
      if (!wordEl) continue;
      const word = wordEl.textContent.trim();
      if (!word) continue;

      const btn = document.createElement('button');
      btn.type='button';
      btn.className='miniInfo';
      btn.setAttribute('aria-label','More details');
      wordEl.appendChild(btn);

      const box = document.createElement('div');
      box.className='vocabMore hidden';
      li.appendChild(box);

      btn.addEventListener('click', async ()=>{
        box.classList.toggle('hidden');
        if (box.dataset.loaded==='1') return;

        try{
          const prof = await WordProfiles.get(word);
          if (!prof){
            box.innerHTML = `<div class="muted">No additional details available for this word.</div>`;
            box.dataset.loaded='1';
            return;
          }
          const parts = [];
          if (prof.brief) parts.push(`<div class="prose">${escapeHTML(prof.brief)}</div>`);
          if (Array.isArray(prof.examples) && prof.examples.length){
            const ex = prof.examples.slice(0,2).map(e=>`<li><div class="exEn">${escapeHTML(e.en||'')}</div>${e.fa?`<div class="exFa faHidden">${escapeHTML(e.fa)}</div>`:''}</li>`).join('');
            parts.push(`<div class="subTitle">Examples</div><ul class="exampleList">${ex}</ul>`);
          }
          if (Array.isArray(prof.collocations) && prof.collocations.length){
            const cols = prof.collocations.slice(0,6).map(c=>`<span class="pill">${escapeHTML(c)}</span>`).join('');
            parts.push(`<div class="subTitle">Collocations</div><div class="pillScroll">${cols}</div>`);
          }
          box.innerHTML = parts.join('');
          box.dataset.loaded='1';
        }catch(err){
          box.innerHTML = `<div class="errorSmall">${escapeHTML(err.message)}</div>`;
          box.dataset.loaded='1';
        }
      });

      li.addEventListener('click', (e)=>{
        const fa = e.target.closest('.exFa');
        if (fa) fa.classList.toggle('faHidden');
      }, {passive:true});
    }
  }catch(e){
    console.warn('enrichVocabItemsWithProfiles failed', e);
  }
}



function makeWordLink(enText){
  const t = (enText===undefined || enText===null) ? '' : String(enText).trim();
  const a = makeEl('a', 'word-link', t);
  a.href = `word.html?q=${encodeURIComponent(t)}`;
  a.title = 'Open word details';
  return a;
}

  // --- Word enrichment (inline mini profile) ---
  const WORD_PROFILE_LETTER_CACHE = new Map(); // letter -> dict
  let WORD_CONTEXT_INDEX = null;              // loaded on demand
  const WORD_MINI_PROFILE_CACHE = new Map();  // word -> profile subset

  function _normWord(w) {
    return String(w || '').trim();
  }
  function _letterOf(w) {
    const s = _normWord(w).toLowerCase();
    const ch = s[0] || '_';
    return (ch >= 'a' && ch <= 'z') ? ch : '_';
  }
  function _uniqClean(list, max = 10) {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of list) {
      const s = String(raw || '').trim();
      if (!s) continue;
      const key = s.toLowerCase();
      // filter garbage that sometimes leaks into data
      if (/^[-–—•]+$/.test(s)) continue;
      if (s.length > 140) continue;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
      if (out.length >= max) break;
    }
    return out;
  }

  async function getWordProfile(word) {
    const w = _normWord(word);
    if (!w) return null;
    if (WORD_MINI_PROFILE_CACHE.has(w)) return WORD_MINI_PROFILE_CACHE.get(w);

    const letter = _letterOf(w);
    if (!WORD_PROFILE_LETTER_CACHE.has(letter)) {
      const url = `assets/data/word_profiles/${letter}.json`;
      const data = await fetchJSON(url);
      WORD_PROFILE_LETTER_CACHE.set(letter, data || {});
    }
    const dict = WORD_PROFILE_LETTER_CACHE.get(letter) || {};
    const p = dict[w] || dict[w.toLowerCase()] || null;
    if (!p) {
      WORD_MINI_PROFILE_CACHE.set(w, null);
      return null;
    }

    // sanitize
    const profile = {
      word: p.word || w,
      pos: p.pos || '',
      definition: p.definition || '',
      fa: p.fa || '',
      synonyms: _uniqClean(p.synonyms, 10),
      antonyms: _uniqClean(p.antonyms, 10),
      example: p.example || ''
    };

    // Some datasets mistakenly put sentences in antonyms; detect and drop
    if (profile.antonyms.some(a => /[.!?]/.test(a) && a.split(' ').length > 6)) {
      profile.antonyms = profile.antonyms.filter(a => !( /[.!?]/.test(a) && a.split(' ').length > 6 ));
    }

    WORD_MINI_PROFILE_CACHE.set(w, profile);
    return profile;
  }

  async function getWordContext(word) {
    const w = _normWord(word).toLowerCase();
    if (!w) return null;
    if (!WORD_CONTEXT_INDEX) {
      WORD_CONTEXT_INDEX = await fetchJSON('assets/data/word_context_index.json');
    }
    return (WORD_CONTEXT_INDEX && (WORD_CONTEXT_INDEX[w] || WORD_CONTEXT_INDEX[word])) || null;
  }

  function _makePill(text, cls) {
    const s = makeEl('span', `pill ${cls || ''}`.trim(), text);
    return s;
  }

  function renderMiniProfile(word, profile, ctx) {
    const box = makeEl('div', 'v-details-inner');

    // header row
    const head = makeEl('div', 'v-details-head');
    head.appendChild(makeEl('div', 'v-details-title', word));

    if (profile && (profile.pos || profile.definition)) {
      const meta = makeEl('div', 'v-details-meta');
      if (profile.pos) meta.appendChild(_makePill(profile.pos, 'pill-pos'));
      if (profile.definition) meta.appendChild(makeEl('div', 'v-details-def', profile.definition));
      head.appendChild(meta);
    }
    box.appendChild(head);

    if (profile && profile.fa) {
      const fa = makeEl('div', 'v-details-fa fa-hide', profile.fa);
      fa.setAttribute('data-fa', '1');
      box.appendChild(fa);
    }

    // synonyms/antonyms
    const row = makeEl('div', 'v-details-row');
    if (profile && profile.synonyms && profile.synonyms.length) {
      const col = makeEl('div', 'v-col');
      col.appendChild(makeEl('div', 'v-col-title', 'Synonyms'));
      const pills = makeEl('div', 'pill-row');
      profile.synonyms.forEach(t => pills.appendChild(_makePill(t, 'pill-syn')));
      col.appendChild(pills);
      row.appendChild(col);
    }
    if (profile && profile.antonyms && profile.antonyms.length) {
      const col = makeEl('div', 'v-col');
      col.appendChild(makeEl('div', 'v-col-title', 'Antonyms'));
      const pills = makeEl('div', 'pill-row');
      profile.antonyms.forEach(t => pills.appendChild(_makePill(t, 'pill-ant')));
      col.appendChild(pills);
      row.appendChild(col);
    }
    if (row.childNodes.length) box.appendChild(row);

    // examples (prefer context index)
    const ex = [];
    if (ctx && Array.isArray(ctx.examples)) {
      for (const e of ctx.examples) {
        if (e && e.en) ex.push({ en: e.en, fa: e.fa || '' });
        if (ex.length >= 2) break;
      }
    } else if (profile && profile.example) {
      ex.push({ en: profile.example, fa: '' });
    }
    if (ex.length) {
      const exBox = makeEl('div', 'v-details-ex');
      exBox.appendChild(makeEl('div', 'v-col-title', 'Examples'));
      ex.forEach((e) => {
        const p = makeEl('div', 'ex-item');
        p.appendChild(makeEl('div', 'ex-en', e.en));
        if (e.fa) {
          const fa = makeEl('div', 'ex-fa fa-hide', e.fa);
          fa.setAttribute('data-fa', '1');
          p.appendChild(fa);
        }
        exBox.appendChild(p);
      });
      box.appendChild(exBox);
    }

    // hook bilingual toggles inside details
    applyFaToggles(box);

    return box;
  }

  async function toggleVocabDetails(li, word) {
    const w = _normWord(word);
    if (!w) return;

    let det = li.querySelector('.v-details');
    if (!det) {
      det = makeEl('div', 'v-details');
      det.setAttribute('aria-live', 'polite');
      li.appendChild(det);
    }

    const expanded = det.classList.toggle('is-open');
    li.classList.toggle('is-open', expanded);
    if (!expanded) return;

    // lazy render
    if (det.dataset.loaded === '1') return;

    det.innerHTML = '';
    const loading = makeEl('div', 'v-details-loading', 'Loading…');
    det.appendChild(loading);

    try {
      const [profile, ctx] = await Promise.all([getWordProfile(w), getWordContext(w)]);
      det.innerHTML = '';
      det.appendChild(renderMiniProfile(w, profile, ctx));
      det.dataset.loaded = '1';
    } catch (e) {
      det.innerHTML = '';
      det.appendChild(makeEl('div', 'v-details-error', 'Could not load details.'));
    }
  }


function setupSelectionLookup(root){
  if(!root) return;
  // Avoid duplicate setup
  if(root.__lookupSetup) return;
  root.__lookupSetup = true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sel-lookup-btn';
  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c5.5 0 9.7 4 11 7-1.3 3-5.5 7-11 7S2.3 15 1 12c1.3-3 5.5-7 11-7Zm0 2C7.6 7 4.2 10 3.1 12c1.1 2 4.5 5 8.9 5s7.8-3 8.9-5c-1.1-2-4.5-5-8.9-5Zm0 2.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Zm0 1.8A1 1 0 1 0 13 12a1 1 0 0 0-1-1Z"/></svg>`;
    btn.title = 'Toggle Persian translation';
    btn.setAttribute('aria-label','Toggle Persian translation');
  btn.style.display = 'none';
  document.body.appendChild(btn);

  let current = '';

  function hide(){
    btn.style.display = 'none';
    current = '';
  }

  function norm(s){
    return (s||'').trim().replace(/\s+/g,' ');
  }

  function pickSelection(){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.rangeCount===0) return null;
    const text = norm(sel.toString());
    if(!text) return null;
    // Limit length to avoid accidental paragraphs
    if(text.length > 40) return null;
    // Must contain latin letters
    if(!/[A-Za-z]/.test(text)) return null;
    return { sel, text };
  }

  function positionButton(range){
    const r = range.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 90, Math.max(8, r.right + window.scrollX));
    const y = Math.max(8, r.top + window.scrollY - 34);
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
  }

  btn.addEventListener('click', () => {
    if(!current) return;
    const q = current.toLowerCase();
    window.location.href = `word.html?id=${encodeURIComponent(q)}`;
  });

  document.addEventListener('selectionchange', () => {
    const picked = pickSelection();
    if(!picked){ hide(); return; }
    // Only show when selection is inside root
    const anchor = picked.sel.anchorNode;
    if(!anchor) { hide(); return; }
    const node = anchor.nodeType===1 ? anchor : anchor.parentElement;
    if(!node || !root.contains(node)){ hide(); return; }

    current = picked.text;
    positionButton(picked.sel.getRangeAt(0));
    btn.style.display = 'block';
  });

  // Hide on scroll/resize
  window.addEventListener('scroll', hide, {passive:true});
  window.addEventListener('resize', hide);
}


function appendHeading(parent, level, text){
  const h = makeEl('h'+level, null, text);
  parent.appendChild(h);
  return h;
}

function appendPara(parent, className, text, prewrap=false){
  // Supports bilingual objects: {en:"...", fa:"..."} (English-first)
  if(text && typeof text === 'object' && (text.en || text.fa)){
    const wrap = makeEl('div', 'bi ' + (className||''));
    const enP = makeEl('p', 'en', (text.en||'').toString());
    enP.setAttribute('data-en','1');
    if(prewrap) enP.style.whiteSpace='pre-wrap';
    wrap.appendChild(enP);

    if(text.fa){
      const faP = makeEl('p', 'fa isHidden', (text.fa||'').toString());
      faP.setAttribute('data-fa','1');
      if(prewrap) faP.style.whiteSpace='pre-wrap';
      wrap.appendChild(faP);
    }

    parent.appendChild(wrap);
    return wrap;
  }

  const p = makeEl('p', className, text);
  if(prewrap) p.style.whiteSpace='pre-wrap';
  parent.appendChild(p);
  return p;
}

function appendList(parent, items, className){
  const ul = makeEl('ul', className);
  (items||[]).forEach(it=>{
    const li = makeEl('li', null, it);
    ul.appendChild(li);
  });
  parent.appendChild(ul);
  return ul;
}


function el(tag, attrs={}, children=[]) {
  const e=document.createElement(tag);
  Object.entries(attrs||{}).forEach(([k,v])=>{
    if (k==='class') e.className=v;
    else if (k.startsWith('data-')) e.setAttribute(k,v);
    else e[k]=v;
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{
    if (c==null) return;
    if (typeof c==='string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function toWebpSrcset(src800, src1600){
  // expected: assets/images/<name>-800.webp
  const s1600 = src1600 || (src800 ? src800.replace(/-800\.webp$/i, '-1600.webp') : '');
  return (src800 && s1600) ? `${src800} 800w, ${s1600} 1600w` : '';
}

function normalizeLessonImage(data){
  // Supports multiple lesson schemas
  // - legacy: data.image (string)
  // - current: data.image object ({src800, src1600, alt})
  // - edge: data.image800/data.image1600
  if (!data) return { src800: '', src1600: '', alt: '' };

  if (data.image && typeof data.image === 'object') {
    return {
      src800: data.image.src800 || data.image.src || '',
      src1600: data.image.src1600 || '',
      alt: data.image.alt || data.imageAlt || ''
    };
  }

  if (typeof data.image === 'string' && data.image) {
    return { src800: data.image, src1600: '', alt: data.imageAlt || '' };
  }

  if (typeof data.image800 === 'string' && data.image800) {
    return { src800: data.image800, src1600: data.image1600 || '', alt: data.imageAlt || '' };
  }

  return { src800: '', src1600: '', alt: data.imageAlt || '' };
}

// Build previous/next navigation based on the registry order.
// `registry` is the `lessons` array from assets/data/registry.json
function buildPrevNextNav(registry, currentId){
  const wrap = document.createElement('div');
  wrap.className = 'lesson-nav';

  if (!Array.isArray(registry) || !registry.length) return wrap;

  const idx = registry.findIndex((l) => l && l.id === currentId);
  const prev = idx > 0 ? registry[idx - 1] : null;
  const next = (idx >= 0 && idx < registry.length - 1) ? registry[idx + 1] : null;

  const makeLink = (entry, hint) => {
    const a = document.createElement('a');
    a.href = `lesson.html?id=${encodeURIComponent(entry.id)}`;

    const h = document.createElement('span');
    h.className = 'hint';
    h.textContent = hint;
    a.appendChild(h);

    a.appendChild(document.createTextNode(entry.title || entry.caption || entry.id));
    return a;
  };

  const makeSpacer = () => {
    const s = document.createElement('span');
    s.className = 'muted';
    s.style.flex = '1';
    s.style.minWidth = '220px';
    s.style.opacity = '.6';
    s.textContent = '';
    return s;
  };

  wrap.appendChild(prev ? makeLink(prev, 'Previous lesson') : makeSpacer());
  wrap.appendChild(next ? makeLink(next, 'Next lesson') : makeSpacer());
  return wrap;
}




function renderChoiceList(choices, correctIndex) {
  const ul = document.createElement('ul');
  ul.className = 'mcq';

  choices.forEach((c, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'mcqBtn';
    btn.type = 'button';
    btn.setAttribute('data-idx', String(idx));
    btn.textContent = String(c);
    li.appendChild(btn);
    ul.appendChild(li);
  });

  ul.addEventListener('click', (e) => {
    const btn = e.target.closest('button.mcqBtn');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-idx'));
    ul.querySelectorAll('button.mcqBtn').forEach((b) => (b.disabled = true));
    btn.classList.add(idx === correctIndex ? 'isCorrect' : 'isWrong');
    const correctBtn = ul.querySelector(`button.mcqBtn[data-idx="${correctIndex}"]`);
    if (correctBtn) correctBtn.classList.add('isAnswer');
  });

  return ul;
}





function buildBilingualLookup(vocabDetailed){
  const map = new Map();
  if (!Array.isArray(vocabDetailed)) return map;
  vocabDetailed.forEach((it)=>{
    const en = (it && it.en ? String(it.en) : '').trim().toLowerCase();
    const fa = (it && it.fa ? String(it.fa) : '').trim();
    if (en) map.set(en, fa);
  });
  return map;
}

function renderLevelPractice(article, tocSections, data){
  // Disabled: lessons already include Vocabulary/Collocations/Grammar/Scenario/Exercises sections.
  return;
}


function renderToeflSection(article, tocSections, toefl) {
  if (!toefl) return;

  // Reading
  if (toefl.reading && toefl.reading.passage) {
    const sec = document.createElement('section');
    sec.id = 'toefl-reading';
    sec.className = 'card';

    appendHeading(sec, 2, 'TOEFL Reading (Academic Passage)');
    appendPara(sec, 'muted', 'Target: main idea, details, inference, vocabulary-in-context');
    appendPara(sec, 'readingText', toefl.reading.passage, true);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Reading' });
  }

  // Questions
  if (Array.isArray(toefl.questions) && toefl.questions.length) {
    const sec = document.createElement('section');
    sec.id = 'toefl-questions';
    sec.className = 'card';

    appendHeading(sec, 2, 'Reading Questions (with feedback)');

    toefl.questions.forEach((q, i) => {
      const block = document.createElement('div');
      block.className = 'qBlock';

      const prompt = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `Q${i + 1}. `;
      prompt.appendChild(strong);
      prompt.appendChild(document.createTextNode(String(q.question || '')));
      block.appendChild(prompt);

      if (Array.isArray(q.choices)) {
        block.appendChild(renderChoiceList(q.choices, Number(q.answer)));
      }

      if (q.explanation) {
        const details = document.createElement('details');
        details.className = 'qExplain';
        const summary = document.createElement('summary');
        summary.textContent = 'Explanation';
        details.appendChild(summary);
        appendPara(details, null, q.explanation);
        block.appendChild(details);
      }

      sec.appendChild(block);
    });

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Questions' });
  }

  // Listening
  if (toefl.listening && toefl.listening.script) {
    const sec = document.createElement('section');
    sec.id = 'toefl-listening';
    sec.className = 'card';

    appendHeading(sec, 2, 'TOEFL Listening (Practice Script)');
    if (toefl.listening.note) appendPara(sec, 'muted', toefl.listening.note);
    const pre = makeEl('pre', 'script', toefl.listening.script);
    sec.appendChild(pre);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Listening' });
  }

  // Speaking
  if (Array.isArray(toefl.speakingTasks) && toefl.speakingTasks.length) {
    const sec = document.createElement('section');
    sec.id = 'toefl-speaking';
    sec.className = 'card';

    appendHeading(sec, 2, 'TOEFL Speaking (Practice)');

    // Coach
    const coachBox = makeEl('div', 'coachBox');
    appendHeading(coachBox, 3, 'Speaking coach');
    appendList(coachBox, [
      'Start with a clear position in one sentence.',
      'Support with 2–3 specific details or examples.',
      'Use connectors (however, therefore, for example).',
      'Keep a steady pace; avoid long pauses.'
    ]);
    sec.appendChild(coachBox);

    toefl.speakingTasks.forEach((t, i) => {
      const block = makeEl('div', 'taskBlock');
      appendHeading(block, 3, `Task ${i + 1}: ${t.type || 'task'}`);

      if (t.prompt) appendPara(block, null, t.prompt, true);

      const meta = makeEl('p', 'muted');
      const prep = t.prepSeconds ? `Prep: ${t.prepSeconds}s` : '';
      const speak = t.speakSeconds ? `Speak: ${t.speakSeconds}s` : '';
      meta.textContent = [prep, speak].filter(Boolean).join(' • ');
      if (meta.textContent) block.appendChild(meta);

      if (t.sampleResponse) {
        const details = document.createElement('details');
        details.className = 'sample';
        const summary = document.createElement('summary');
        summary.textContent = 'Sample response';
        details.appendChild(summary);
        appendPara(details, null, t.sampleResponse, true);
        block.appendChild(details);
      }

      sec.appendChild(block);
    });

    // Rubric (quick)
    const rubricDiv = makeEl('div', 'rubric');
    appendHeading(rubricDiv, 3, 'Speaking Rubric (Quick)');
    appendList(rubricDiv, [
      'Content: answer directly + add 2–3 concrete details.',
      'Organization: clear intro → 2 points → short wrap-up.',
      'Language: varied vocabulary, correct grammar, linking words.',
      'Delivery: steady pace, clear pronunciation, confident tone.'
    ]);
    sec.appendChild(rubricDiv);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Speaking' });
  }

  // Writing
  if (Array.isArray(toefl.writingTasks) && toefl.writingTasks.length) {
    const sec = document.createElement('section');
    sec.id = 'toefl-writing';
    sec.className = 'card';

    appendHeading(sec, 2, 'TOEFL Writing (Practice)');

    toefl.writingTasks.forEach((t, i) => {
      const block = makeEl('div', 'taskBlock');
      appendHeading(block, 3, `Task ${i + 1}: ${t.type || 'task'}`);

      if (t.prompt) appendPara(block, null, t.prompt, true);

      const meta = makeEl('p', 'muted');
      const tm = t.timeMinutes ? `Time: ${t.timeMinutes} min` : '';
      meta.textContent = tm;
      if (meta.textContent) block.appendChild(meta);

      if (t.sampleAnswer) {
        const details = document.createElement('details');
        details.className = 'sample';
        const summary = document.createElement('summary');
        summary.textContent = 'Sample answer';
        details.appendChild(summary);
        appendPara(details, null, t.sampleAnswer, true);
        block.appendChild(details);
      }

      sec.appendChild(block);
    });

    const rubricDiv = makeEl('div', 'rubric');
    appendHeading(rubricDiv, 3, 'Writing Rubric (Quick)');
    appendList(rubricDiv, [
      'Thesis: clear position in 1–2 sentences.',
      'Development: 2 body paragraphs, each with an example.',
      'Coherence: transitions + topic sentences.',
      'Accuracy: reduce repeated errors; keep sentences readable.'
    ]);
    sec.appendChild(rubricDiv);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Writing' });
  }

  // Exam tips
  if (Array.isArray(toefl.examTips) && toefl.examTips.length) {
    const sec = document.createElement('section');
    sec.id = 'toefl-tips';
    sec.className = 'card';
    appendHeading(sec, 2, 'Exam Tips');
    appendList(sec, toefl.examTips);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Tips' });
  }
}


function buildToc(sections) {
  const aside = document.createElement('aside');
  aside.className = 'lesson-toc';

  const details = document.createElement('details');
  details.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Contents';
  details.appendChild(summary);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Table of contents');

  sections.forEach((s, i) => {
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.textContent = s.title;
    if (i === 0) a.classList.add('isActive');
    nav.appendChild(a);
  });

  details.appendChild(nav);
  aside.appendChild(details);

  // active state on scroll
  const links = Array.from(nav.querySelectorAll('a'));
  const ids = sections.map((s) => s.id);

  const onScroll = () => {
    let activeId = ids[0];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) activeId = id;
    }
    links.forEach((lnk) => lnk.classList.toggle('isActive', lnk.getAttribute('href') === `#${activeId}`));
  };
  document.addEventListener('scroll', onScroll, { passive: true });

  return aside;
}


function populateTocChips(navEl, tocSections){
  if (!navEl) return;
  navEl.innerHTML = '';
  // Keep chips concise: show top-level/high-signal sections first
  const top = tocSections.filter(s => /^(Description|Visual details|Image analysis|Vocabulary|Collocations|Grammar|Practice|Quiz|Timed Practice)/.test(s.title));
  const list = top.length ? top : tocSections.slice(0, 10);
  for (const s of list){
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.textContent = s.title;
    navEl.appendChild(a);
  }
}

function populateLessonSwitcher(containerEl, tocSections){
  if (!containerEl) return;
  containerEl.innerHTML = '';

  const groups = {
    all: { label: 'All', ids: tocSections.map(s => s.id) },
    photo: { label: 'Photo', ids: [] },
    vocab: { label: 'Vocabulary', ids: [] },
    colloc: { label: 'Collocations', ids: [] },
    grammar: { label: 'Grammar', ids: [] },
    practice: { label: 'Practice', ids: [] }
  };

  for (const s of tocSections){
    const t = s.title || '';
    if (/^(Description|Visual details|Image analysis|Photo prompt)/.test(t)) groups.photo.ids.push(s.id);
    if (/Vocabulary/.test(t)) groups.vocab.ids.push(s.id);
    if (/Collocations/.test(t)) groups.colloc.ids.push(s.id);
    if (/Grammar/.test(t)) groups.grammar.ids.push(s.id);
    if (/^(Practice|Quiz|Timed Practice|Questions|Tips|Scenario|Reading|Listening|Speaking|Writing)/.test(t)) groups.practice.ids.push(s.id);
  }
  // fallback: if a group ended up empty, omit it
  const order = ['all','photo','vocab','colloc','grammar','practice'].filter(k => k==='all' || groups[k].ids.length);

  const setActive = (key) => {
    const idsToShow = key==='all' ? new Set(groups.all.ids) : new Set(groups[key].ids);
    for (const secId of groups.all.ids){
      const el = document.getElementById(secId);
      if (!el) continue;
      el.classList.toggle('is-hidden', !idsToShow.has(secId));
    }
    for (const btn of containerEl.querySelectorAll('button.sw-btn')){
      btn.setAttribute('aria-pressed', btn.dataset.group===key ? 'true' : 'false');
    }
    try{ localStorage.setItem('tfl.lesson.activeGroup', key); }catch(_){}
  };

  for (const key of order){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sw-btn';
    btn.dataset.group = key;
    btn.textContent = groups[key].label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => setActive(key));
    containerEl.appendChild(btn);
  }

  let initial = 'all';
  try{
    const saved = localStorage.getItem('tfl.lesson.activeGroup');
    if (saved && order.includes(saved)) initial = saved;
  }catch(_){}
  setActive(initial);
}


// ---------- Key vocabulary slider (lesson top) ----------

function renderKeyVocabSlider(lessonDataOrVocab, opts = {}) {
  // Accept either full lesson data (with vocabularyDetailed) or a raw vocab array.
  const vocabList = Array.isArray(lessonDataOrVocab)
    ? lessonDataOrVocab
    : (lessonDataOrVocab && Array.isArray(lessonDataOrVocab.vocabularyDetailed) ? lessonDataOrVocab.vocabularyDetailed : []);

  const limit = Math.max(4, Math.min(24, Number(opts.limit || 10)));

  if (!Array.isArray(vocabList) || vocabList.length < 4) return null;

  // Pick a small, representative subset (stable order)
  const picks = vocabList.slice(0, limit);

  const slider = document.createElement('div');
  slider.className = 'pro-slider';
  slider.setAttribute('data-pro-slider', '1');

  const track = document.createElement('div');
  track.className = 'pro-track';

  for (const item of picks) {
    const en = String(item.word || item.en || '').trim();
    if (!en) continue;
    const fa = Array.isArray(item.fa) ? item.fa.join(', ') : (item.fa ? String(item.fa) : '');
    const slide = document.createElement('div');
    slide.className = 'pro-slide';
    slide.innerHTML = `
      <div class="kv-card">
        <div class="kv-en">${escapeHTML(en)}</div>
        ${fa ? `<div class="kv-fa fa isHidden" dir="rtl">${escapeHTML(fa)}</div>` : ``}
        ${fa ? `<button class="kv-tr" type="button" aria-label="Show translation">TR</button>` : ``}
      </div>
    `;
    // Link to word page (but allow TR button to toggle translation)
    slide.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.kv-tr') : null;
      if (btn) return; // button handles itself
      window.location.href = `word.html?id=${encodeURIComponent(en)}`;
    });

    // Toggle FA inside the card
    const btn = slide.querySelector('.kv-tr');
    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const faEl = slide.querySelector('.kv-fa');
        if (faEl) faEl.classList.toggle('isHidden');
        btn.classList.toggle('is-on');
      });
    }
    track.appendChild(slide);
  }

  if (!track.children.length) return null;

  slider.appendChild(track);

  // Initialize ProSlider if present
  if (window.ProSlider && typeof window.ProSlider.init === 'function') {
    try { window.ProSlider.init(slider); } catch (_) {}
  }
  return slider;
}

// -----------------------------
// Lexicon-backed FA fallback
// -----------------------------
function getLexiconEntry(en) {
  try {
    const lex = (window.__LEXICON && typeof window.__LEXICON === 'object') ? window.__LEXICON : null;
    if (!lex) return null;
    const key = String(en || '').trim().toLowerCase();
    return lex[key] || null;
  } catch {
    return null;
  }
}

function getLexiconFa(en) {
  const e = getLexiconEntry(en);
  if (!e) return '';
  // Support multiple possible shapes
  if (typeof e.fa === 'string') return e.fa;
  if (Array.isArray(e.fa)) return e.fa.filter(Boolean).join(', ');
  if (typeof e.translation_fa === 'string') return e.translation_fa;
  return '';
}

// Quick review should be compact and grid-like (not full-width slides)
function renderKeyVocabGrid(lessonDataOrVocab, opts = {}) {
  const vocabList = Array.isArray(lessonDataOrVocab)
    ? lessonDataOrVocab
    : (lessonDataOrVocab && Array.isArray(lessonDataOrVocab.vocabularyDetailed) ? lessonDataOrVocab.vocabularyDetailed : []);

  const limit = Math.max(4, Math.min(24, Number(opts.limit || 10)));
  if (!Array.isArray(vocabList) || vocabList.length < 1) return null;

  const picks = vocabList.slice(0, limit);
  const grid = document.createElement('div');
  grid.className = 'kv-grid';

  for (const item of picks) {
    const en = String(item.word || item.en || '').trim();
    if (!en) continue;
    let fa = Array.isArray(item.fa) ? item.fa.join(', ') : (item.fa ? String(item.fa) : '');
    if (!fa) fa = getLexiconFa(en);

    const card = document.createElement('div');
    card.className = 'kv-card';
    card.innerHTML = `
      <div class="kv-en">${escapeHTML(en)}</div>
      ${fa ? `<div class="kv-fa fa isHidden" dir="rtl">${escapeHTML(fa)}</div>` : `<div class="kv-fa kv-missing" dir="rtl">ترجمه موجود نیست</div>`}
      <button class="kv-tr" type="button" aria-label="Show translation">TR</button>
    `;

    // Card click navigates to word page
    card.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.kv-tr') : null;
      if (btn) return;
      window.location.href = `word.html?id=${encodeURIComponent(en)}`;
    });

    // Toggle FA
    const btn = card.querySelector('.kv-tr');
    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const faEl = card.querySelector('.kv-fa');
        if (faEl) faEl.classList.toggle('isHidden');
        btn.classList.toggle('is-on');
      });
    }
    grid.appendChild(card);
  }

  if (!grid.children.length) return null;
  return grid;
}




function buildVocabQuiz(items, count){
  try{
    items = Array.isArray(items) ? items.filter(it=>it && (it.word||it.en) && (it.translation||it.fa)) : [];
    if(!items.length) return [];
    const norm = (s)=>String(s||'').trim();
    const pool = items.map(it=>({word:norm(it.word||it.en), translation:norm(it.translation||it.fa)})).filter(it=>it.word && it.translation);
    if(pool.length < 4) return [];
    const pickN = Math.max(1, Math.min(count||5, pool.length));
    // shuffle
    const a = pool.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const tmp=a[i]; a[i]=a[j]; a[j]=tmp;
    }
    const qs=[];
    for(let i=0;i<pickN;i++){
      const correct = a[i];
      // options: correct + 3 random others
      const opts = [correct.word];
      let k=0;
      while(opts.length<4 && k<200){
        const cand = pool[Math.floor(Math.random()*pool.length)].word;
        if(cand && !opts.includes(cand)) opts.push(cand);
        k++;
      }
      // shuffle options
      for(let t=opts.length-1;t>0;t--){
        const j=Math.floor(Math.random()*(t+1));
        const tmp=opts[t]; opts[t]=opts[j]; opts[j]=tmp;
      }
      qs.push({
        prompt: correct.translation,
        options: opts,
        answer: correct.word
      });
    }
    return qs;
  }catch(e){
    console.warn('buildVocabQuiz failed', e);
    return [];
  }
}

function renderLesson(container, data, registry) {
  clearEl(container);

  // Guard flags (kept explicit to avoid runtime ReferenceError)
  const hasVocab = !!(
    (Array.isArray(data.vocabularyDetailed) && data.vocabularyDetailed.length) ||
    (Array.isArray(data.vocabulary) && data.vocabulary.length) ||
    (Array.isArray(data.vocab) && data.vocab.length)
  );

  const layout = document.createElement('div');
  layout.className = 'lesson-layout';

  const article = document.createElement('article');
  const tocSections = [];
  article.className = 'lesson-details';

  // Back link
  const backLink = document.createElement('a');
  backLink.href = 'index.html';
  backLink.className = 'back-link';
  backLink.textContent = '← Back to lessons';
  article.appendChild(backLink);

  // Prev/Next nav (top)
  if (Array.isArray(registry) && registry.length) {
    article.appendChild(buildPrevNextNav(registry, data.id));
  }

  // Title
  const title = document.createElement('h1');
  title.textContent = data.title || 'Untitled lesson';
  article.appendChild(title);

  // Meta line (tags + quick stats)
  const meta = document.createElement('div');
  meta.className = 'meta-line';

  const tagsArr = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
  if (tagsArr.length) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'meta-tags';
    tagsArr.slice(0, 7).forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'meta-tag';
      chip.textContent = String(t);
      tagsWrap.appendChild(chip);
    });
    meta.appendChild(tagsWrap);
  }

  const statsWrap = document.createElement('div');
  statsWrap.className = 'meta-stats';
  const vocabCount = computeVocabCount(data);
  if (vocabCount) {
    const s = document.createElement('span');
    s.className = 'meta-stat';
    s.textContent = `Vocab: ${vocabCount}`;
    statsWrap.appendChild(s);
  }
  if (data && data.toefl) {
    const s = document.createElement('span');
    s.className = 'meta-stat';
    s.textContent = 'TOEFL';
    statsWrap.appendChild(s);
  }
  if (statsWrap.children.length) meta.appendChild(statsWrap);

  if (meta.children.length) article.appendChild(meta);


  // Image (hero) — blurred placeholder + responsive srcset
  const { src800: hero800, src1600: hero1600, alt: heroAlt } = normalizeLessonImage(data);
  if (hero800) {
    const img = document.createElement('img');
    img.className = 'lesson-image';
    img.alt = heroAlt || (data.title ? `Lesson image: ${data.title}` : 'Lesson image');

    // Load the hero eagerly to avoid "preload was not used" warnings.
    img.loading = 'eager';
    img.decoding = 'async';
    // fetchpriority is supported in modern Chromium; harmless elsewhere.
    img.setAttribute('fetchpriority', 'high');
    img.src = hero800;

    const srcset = toWebpSrcset(hero800, hero1600);
    if (srcset && /-800\.webp$/i.test(hero800)) {
      img.srcset = srcset;
      img.sizes = '(max-width: 900px) 100vw, 900px';
    }

    article.appendChild(img);
  }


  // Caption
  if (data.caption) {
    const cap = document.createElement('p');
    cap.className = 'muted';
    cap.textContent = data.caption;
    article.appendChild(cap);
  }
  // Level-based module (3 levels) removed to avoid duplicate categories.
    // Visual analysis (full standard — like the sample)
  const fullDesc = data.fullDescription || data.imageDescription || '';
  if (fullDesc) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-full-desc';

    const h = document.createElement('h3');
    h.textContent = 'Full description in English';
    sec.appendChild(h);

    (function(){
      const bi = (fullDesc && typeof fullDesc === 'object') ? fullDesc : { en: String(fullDesc||'') };
      const enParas = (bi.en || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      const faParas = (bi.fa || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      enParas.forEach((enPara, i) => {
        const faPara = faParas[i] || (faParas.length === 1 ? faParas[0] : '');
        appendPara(sec, 'image-desc', { en: enPara, fa: faPara }, true);
      });
    })();

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Description' });

  }

  // Levelled description panes (Beginner/Intermediate/Advanced)
  const intermediateText =
    data.intermediateEnglish ||
    (data.descriptions && (data.descriptions.intermediate || data.descriptions.medium)) ||
    '';
  const lvlAny = !!(data.simpleEnglish || intermediateText || data.advancedEnglish);
  if (lvlAny) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-levels';

    const h = document.createElement('h3');
    h.textContent = 'Levelled description';
    sec.appendChild(h);

    const panes = document.createElement('div');
    panes.className = 'level-panes';

    const mkPane = (level, label, content) => {
      if (!content) return;
      const pane = document.createElement('div');
      pane.className = 'level-pane';
      pane.dataset.level = level;
      const hh = document.createElement('h4');
      hh.textContent = label;
      pane.appendChild(hh);
      appendPara(pane, null, content, true);
      panes.appendChild(pane);
    };

    mkPane('beginner', 'Beginner', data.simpleEnglish);
    mkPane('intermediate', 'Intermediate', intermediateText);
    mkPane('advanced', 'Advanced', data.advancedEnglish);

    if (panes.children.length) {
      sec.appendChild(panes);
      article.appendChild(sec);
      tocSections.push({ id: sec.id, title: 'Levels' });
    }
  }



    // Scenario (multi) — English first, tap to reveal Persian
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios
    : (data.scenario ? [{
        id: 'scn-legacy',
        level: '',
        title: 'Scenario',
        en: (typeof data.scenario === 'object') ? (data.scenario.en || '') : String(data.scenario || ''),
        fa: (typeof data.scenario === 'object') ? (data.scenario.fa || '') : ''
      }] : []);

  if (scenarios && scenarios.length) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-scenario';

    appendHeading(sec, 3, 'Scenario');

    const wrap = document.createElement('div');
    wrap.className = 'scenarioWrap';

    scenarios.forEach((sc, idx) => {
      const card = document.createElement('section');
      card.className = 'scenarioCard';

      const h4 = document.createElement('h4');
      const lvl = sc && sc.level ? `${sc.level} • ` : '';
      const t = (sc && sc.title) ? sc.title : `Scenario ${idx + 1}`;
      h4.textContent = `${lvl}${t}`;
      card.appendChild(h4);

      // Grammar focus chips
      if (sc && Array.isArray(sc.grammarFocus) && sc.grammarFocus.length) {
        const chips = document.createElement('div');
        chips.className = 'chipRow';
        sc.grammarFocus.slice(0, 8).forEach(g => {
          const sp = document.createElement('span');
          sp.className = 'chip';
          sp.textContent = String(g);
          chips.appendChild(sp);
        });
        card.appendChild(chips);
      }

      // Story text (split into paragraphs)
      const bi = (sc && typeof sc === 'object') ? { en: (sc.en || ''), fa: (sc.fa || '') } : { en: String(sc || '') };
      const enParas = (bi.en || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      const faParas = (bi.fa || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

      if (!enParas.length) {
        appendPara(card, null, bi, true);
      } else {
        enParas.forEach((enPara, i) => {
          const faPara = faParas[i] || (faParas.length === 1 ? faParas[0] : '');
          appendPara(card, null, { en: enPara, fa: faPara }, true);
        });
      }

      // Grammar used (short explanation)
      if (sc && sc.grammarUsed && (sc.grammarUsed.en || sc.grammarUsed.fa)) {
        const det = document.createElement('details');
        det.className = 'drawer';
        const sum = document.createElement('summary');
        sum.className = 'drawerSummary';
        sum.textContent = 'Grammar used';
        det.appendChild(sum);
        const body = document.createElement('div');
        body.className = 'drawerBody';
        appendPara(body, null, { en: sc.grammarUsed.en || '', fa: sc.grammarUsed.fa || '' }, true);
        det.appendChild(body);
        card.appendChild(det);
      }

      // Grammar lesson (from scratch)
      if (sc && sc.grammarLesson && (sc.grammarLesson.en || sc.grammarLesson.fa)) {
        const det2 = document.createElement('details');
        det2.className = 'drawer';
        const sum2 = document.createElement('summary');
        sum2.className = 'drawerSummary';
        sum2.textContent = 'Grammar basics';
        det2.appendChild(sum2);

        const body2 = document.createElement('div');
        body2.className = 'drawerBody';

        const gl = sc.grammarLesson || {};
        const enGL = gl.en || {};
        const faGL = gl.fa || {};

        // Tense & time
        if ((enGL.tense || '') || (faGL.tense || '')) {
          appendHeading(body2, 5, 'Tense & time');
          appendPara(body2, null, { en: enGL.tense || '', fa: faGL.tense || '' }, true);
        }

        // Sentence structure
        const sEn = Array.isArray(enGL.sentenceStructure) ? enGL.sentenceStructure : [];
        const sFa = Array.isArray(faGL.sentenceStructure) ? faGL.sentenceStructure : [];
        const sN = Math.max(sEn.length, sFa.length);
        if (sN) {
          appendHeading(body2, 5, 'Sentence structure');
          for (let i = 0; i < sN; i++) {
            appendPara(body2, null, { en: sEn[i] || '', fa: sFa[i] || '' }, true);
          }
        }

        // How to build sentences
        const bEn = Array.isArray(enGL.howToBuild) ? enGL.howToBuild : [];
        const bFa = Array.isArray(faGL.howToBuild) ? faGL.howToBuild : [];
        const bN = Math.max(bEn.length, bFa.length);
        if (bN) {
          appendHeading(body2, 5, 'How to build it');
          for (let i = 0; i < bN; i++) {
            appendPara(body2, null, { en: bEn[i] || '', fa: bFa[i] || '' }, true);
          }
        }

        // Examples
        const eEn = Array.isArray(enGL.examples) ? enGL.examples : [];
        const eFa = Array.isArray(faGL.examples) ? faGL.examples : [];
        const eN = Math.max(eEn.length, eFa.length);
        if (eN) {
          appendHeading(body2, 5, 'Examples');
          for (let i = 0; i < eN; i++) {
            appendPara(body2, null, { en: eEn[i] || '', fa: eFa[i] || '' }, true);
          }
        }

        det2.appendChild(body2);
        card.appendChild(det2);
      }


      wrap.appendChild(card);

      // TTS per scenario card
      if (window.TTS && window.TTS.attachToSection) { window.TTS.attachToSection(card); }
    });

    sec.appendChild(wrap);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Scenario' });
  }


  function addListSection(id, title, items) {
    if (!items || !Array.isArray(items) || !items.length) return;
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = id;
    const h = document.createElement('h3');
    h.textContent = title;
    sec.appendChild(h);
    const ul = document.createElement('ul');
    items.forEach((it) => {
      const li = document.createElement('li');
      li.textContent = String(it);
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title });
  }

  function addTextSection(id, title, text) {
    if (!text) return;
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = id;
    const h = document.createElement('h3');
    h.textContent = title;
    sec.appendChild(h);
    const p = document.createElement('p');
    p.textContent = String(text);
    sec.appendChild(p);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title });
  }

  addListSection('sec-actions', 'What are they doing? (Actions)', data.actions);
  if (data.people && (data.people.count || data.people.gender)) {
    const peopleLine = `${data.people.count || ''}${data.people.gender ? ' — ' + data.people.gender : ''}`.trim();
    addTextSection('sec-people', 'Gender & count', peopleLine);
  }
  addTextSection('sec-ages', 'Approximate ages', data.ages);
  addTextSection('sec-place', 'Place / neighborhood', data.place || data.scenario);
  addListSection('sec-objects', 'Objects in the photo', data.objects);
  addTextSection('sec-clothing', 'What are they wearing? (Clothing)', data.clothing);
  addTextSection('sec-appearance', 'Appearance (skin tone / hair)', data.appearance);
  addListSection('sec-feelings', 'Feelings / mood', data.feelings);
  addTextSection('sec-env', 'Environment type (setting)', data.environmentType);
  addTextSection('sec-weather', 'Weather / lighting', data.weatherLighting);

  
  // Vocabulary (unified)
  if (hasVocab) {
    const vocabSec = document.createElement('section');
    vocabSec.className = 'section vocabSection';
    vocabSec.id = 'sec-vocab';

    const vocabH2 = document.createElement('h2');
    vocabH2.textContent = 'Vocabulary';
    vocabSec.appendChild(vocabH2);

    const wrap = document.createElement('div');
    wrap.className = 'vocabWrap';

    // Quick review (collapsed by default to avoid “same list twice” fatigue)
    if (Array.isArray(data.vocabularyDetailed) && data.vocabularyDetailed.length) {
      const quick = document.createElement('details');
      quick.className = 'vocabQuick';
      quick.open = false;
      const sum = document.createElement('summary');
      sum.className = 'vocabQuickSummary';
      sum.textContent = 'Quick review (top vocabulary cards)';
      quick.appendChild(sum);
      const body = document.createElement('div');
      body.className = 'vocabQuickBody';
      body.appendChild(renderKeyVocabGrid(data.vocabularyDetailed, { limit: 12 }));
      quick.appendChild(body);
      wrap.appendChild(quick);
    }

    // Toolbar (search + toggles)
    const toolbar = document.createElement('div');
    toolbar.className = 'vocabToolbar';

    const searchInput = document.createElement('input');
    searchInput.className = 'vocabSearch';
    searchInput.type = 'search';
    searchInput.inputMode = 'search';
    searchInput.placeholder = 'Search vocabulary (English / Persian)…';
    toolbar.appendChild(searchInput);

    const toggleFaBtn = document.createElement('button');
    toggleFaBtn.type = 'button';
    toggleFaBtn.className = 'vocabToggleBtn';
    toggleFaBtn.setAttribute('aria-pressed', 'true');
    toggleFaBtn.title = 'Show/hide Persian';
    toggleFaBtn.innerHTML = '<span class="vocabToggleIcon" aria-hidden="true">FA</span><span class="vocabToggleText">Persian</span>';
    toolbar.appendChild(toggleFaBtn);

    wrap.appendChild(toolbar);

    // Build a normalized map from EN -> detailed entry (for better FA/pos)
    const detailedByEn = new Map();
    if (Array.isArray(data.vocabularyDetailed)) {
      for (const v of data.vocabularyDetailed) {
        if (v && v.en) detailedByEn.set(String(v.en).toLowerCase(), v);
      }
    }

    // Group entries (prefer vocabularyExtended categories if present)
    // Also de-duplicate across categories: one word, one card.
    const groups = new Map(); // cat -> array of entries
    const seen = new Set();
    const pushGroup = (cat, entry) => {
      const key = cat || 'Vocabulary';
      if (!groups.has(key)) groups.set(key, []);
      const enKey = String(entry && entry.en ? entry.en : '').trim().toLowerCase();
      if (!enKey) return;
      if (seen.has(enKey)) return;
      seen.add(enKey);
      groups.get(key).push(entry);
    };

    if (data.vocabularyExtended && typeof data.vocabularyExtended === 'object') {
      for (const [cat, words] of Object.entries(data.vocabularyExtended)) {
        if (!Array.isArray(words)) continue;
        for (const w of words) {
          const en = String(w || '').trim();
          if (!en) continue;
          const det = detailedByEn.get(en.toLowerCase());
          pushGroup(cat, det || { en, fa: null, pos: null });
        }
      }
    } else if (Array.isArray(data.vocabularyDetailed)) {
      for (const v of data.vocabularyDetailed) {
        if (!v || !v.en) continue;
        pushGroup(v.pos || 'Vocabulary', v);
      }
    }

    // Render grouped category cards (grid)
    const groupsHost = document.createElement('div');
    groupsHost.className = 'vocabCatsGrid';

    const catMeta = {
      academicPhrases: { label: 'Academic phrases', icon: '🎓', hint: 'High-value phrases for TOEFL speaking/writing. Use them to sound more natural and structured.' },
      actions: { label: 'Actions', icon: '🏃', hint: 'Verbs/phrases to describe what people are doing. Try: “They are …”' },
      feelings: { label: 'Feelings & mood', icon: '🙂', hint: 'Words to describe emotions and attitude. Try: “He seems …”' },
      places: { label: 'Places & settings', icon: '📍', hint: 'Vocabulary for the location and environment. Try: “This takes place in …”' },
      objects: { label: 'Objects', icon: '🧰', hint: 'Useful nouns for describing what you see. Try: “In the foreground, there is …”' },
      people: { label: 'People & roles', icon: '👥', hint: 'Roles/occupations and people-related vocabulary. Try: “The … is …”' },
      Vocabulary: { label: 'Vocabulary', icon: '🧠', hint: 'Core words and phrases used in this lesson.' },
    };

    const preferredOrder = ['academicPhrases','actions','feelings','places','objects','people','Vocabulary'];
    const sortedCats = Array.from(groups.keys()).sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return String(a).localeCompare(String(b));
    });

    const renderWordCard = (entry) => {
      const en = String(entry.en || '').trim();
      const fa = Array.isArray(entry.fa) ? entry.fa.join(', ') : (entry.fa ? String(entry.fa) : '');
      const typeBadge = (/[\s]/.test(en) || /-/.test(en)) ? 'phrase' : 'word';

      const det = document.createElement('details');
      det.className = 'vocabWordCard';
      det.dataset.q = (en + ' ' + fa + ' ' + typeBadge).toLowerCase();
      det.dataset.word = en;

      const sum = document.createElement('summary');
      sum.className = 'vocabWordSummary toggle-fa';
      sum.setAttribute('role', 'button');

      const left = document.createElement('div');
      left.className = 'vocabWordLeft';

      const top = document.createElement('div');
      top.className = 'vocabWordTop';

      const link = document.createElement('a');
      link.className = 'wordLink wordLink--inline no-toggle';
      link.href = `word.html?id=${encodeURIComponent(en)}`;
      link.textContent = en;
      link.addEventListener('click', (ev)=>ev.stopPropagation());
      top.appendChild(link);

      const pill = document.createElement('span');
      pill.className = 'vocabTypePill';
      pill.textContent = typeBadge;
      top.appendChild(pill);

      const posPill = document.createElement('span');
      posPill.className = 'vocabPosPill';
      posPill.textContent = '';
      posPill.style.display = 'none';
      top.appendChild(posPill);

      left.appendChild(top);

      const faLine = document.createElement('div');
      faLine.className = 'vocabFa fa';
      faLine.dir = 'rtl';
      if(fa && !isIncompleteFa(fa)){
        faLine.textContent = fa;
      }else{
        faLine.textContent = 'ترجمه فارسی این مورد کامل نیست.';
        faLine.classList.add('isIncomplete');
      }
      left.appendChild(faLine);

      sum.appendChild(left);

      const body = document.createElement('div');
      body.className = 'vocabWordBody';
      body.innerHTML = `<div class="muted small">Open to see a definition, examples, and synonyms (when available).</div>`;

      det.appendChild(sum);
      det.appendChild(body);

      det.addEventListener('toggle', async ()=>{
        if(!det.open) return;
        if(det.dataset.loaded === '1') return;
        det.dataset.loaded = '1';

        body.innerHTML = '<div class="muted">Loading…</div>';
        const prof = await getWordProfileForVocab(en);

        const wrap = document.createElement('div');
        wrap.className = 'vocabWordDetails';

        if(prof && (prof.definition || prof.pos || (Array.isArray(prof.examples) && prof.examples.length) || (Array.isArray(prof.synonyms) && prof.synonyms.length))){
          if(prof.pos){
            posPill.textContent = String(prof.pos);
            posPill.style.display = '';
          }

          if(prof.definition){
            const def = document.createElement('div');
            def.className = 'vocabDef';
            def.textContent = String(prof.definition);
            wrap.appendChild(def);
          }

          const examples = Array.isArray(prof.examples) ? prof.examples : [];
          if(examples.length){
            const exWrap = document.createElement('div');
            exWrap.className = 'vocabExamples';
            examples.slice(0, 2).forEach(ex=>{
              const line = document.createElement('div');
              line.className = 'vocabExample';
              const enL = document.createElement('div');
              enL.className = 'en';
              enL.textContent = String(ex.en || ex);
              line.appendChild(enL);
              if(ex && ex.fa){
                const faL = document.createElement('div');
                faL.className = 'fa vocabExampleFa';
                faL.dir = 'rtl';
                if(!isIncompleteFa(ex.fa)){
                  faL.textContent = String(ex.fa);
                }else{
                  faL.textContent = 'ترجمه فارسی مثال کامل نیست.';
                  faL.classList.add('isIncomplete');
                }
                line.appendChild(faL);
              }
              exWrap.appendChild(line);
            });
            wrap.appendChild(exWrap);
          }

          const syn = Array.isArray(prof.synonyms) ? prof.synonyms : [];
          if(syn.length){
            const synWrap = document.createElement('div');
            synWrap.className = 'vocabSynWrap';
            const lab = document.createElement('div');
            lab.className = 'muted small';
            lab.textContent = 'Synonyms';
            synWrap.appendChild(lab);
            const row = document.createElement('div');
            row.className = 'vocabChipRow';
            syn.slice(0, 8).forEach(s=>{
              const a = document.createElement('a');
              a.className = 'vocabChip no-toggle';
              a.href = `word.html?id=${encodeURIComponent(String(s))}`;
              a.textContent = String(s);
              a.addEventListener('click', (ev)=>ev.stopPropagation());
              row.appendChild(a);
            });
            synWrap.appendChild(row);
            wrap.appendChild(synWrap);
          }
        }else{
          const p = document.createElement('div');
          p.className = 'muted';
          p.textContent = 'No extra info found for this item yet. Open the word page for more details.';
          wrap.appendChild(p);
        }

        const open = document.createElement('a');
        open.className = 'vocabOpenWord no-toggle';
        open.href = `word.html?id=${encodeURIComponent(en)}`;
        open.textContent = 'Open word page →';
        open.addEventListener('click', (ev)=>ev.stopPropagation());
        wrap.appendChild(open);

        body.replaceChildren(wrap);
      });

      return det;
    };

    const renderCatCard = (catKey, items) => {
      const meta = catMeta[catKey] || { label: String(catKey), icon: '📚', hint: '' };

      const card = document.createElement('section');
      card.className = 'vocabCatCard';
      card.dataset.cat = String(catKey);

      const head = document.createElement('div');
      head.className = 'vocabCatHead';

      const left = document.createElement('div');
      left.className = 'vocabCatLeft';

      const icon = document.createElement('div');
      icon.className = 'vocabCatIcon';
      icon.textContent = meta.icon;
      left.appendChild(icon);

      const titleWrap = document.createElement('div');
      titleWrap.className = 'vocabCatTitleWrap';
      const title = document.createElement('div');
      title.className = 'vocabCatTitle';
      title.textContent = meta.label;
      titleWrap.appendChild(title);
      if(meta.hint){
        const hint = document.createElement('div');
        hint.className = 'vocabCatHint muted small';
        hint.textContent = meta.hint;
        titleWrap.appendChild(hint);
      }
      left.appendChild(titleWrap);

      const count = document.createElement('div');
      count.className = 'vocabCatCount';
      count.textContent = String(items.length);

      head.appendChild(left);
      head.appendChild(count);

      const body = document.createElement('div');
      body.className = 'vocabCatBody';
      items.forEach(it=> body.appendChild(renderWordCard(it)));

      card.appendChild(head);
      card.appendChild(body);
      return card;
    };

    for (const cat of sortedCats) {
      const items = groups.get(cat) || [];
      if (!items.length) continue;
      groupsHost.appendChild(renderCatCard(cat, items));
    }

    if (!groupsHost.children.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No vocabulary available for this lesson.';
      groupsHost.appendChild(p);
    }

    wrap.appendChild(groupsHost);
    vocabSec.appendChild(wrap);
    article.appendChild(vocabSec);

    // Toggle Persian globally (without breaking click-to-reveal)
    toggleFaBtn.addEventListener('click', ()=>{
      const pressed = toggleFaBtn.getAttribute('aria-pressed') === 'true';
      const next = !pressed;
      toggleFaBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      vocabSec.classList.toggle('vocab-hide-fa', !next);
    });

    // Live filter (hides whole category cards when empty)
    searchInput.addEventListener('input', () => {
      const q = String(searchInput.value || '').trim().toLowerCase();
      const words = groupsHost.querySelectorAll('.vocabWordCard');

      words.forEach((card)=>{
        const hay = (card.dataset.q || '').toLowerCase();
        card.style.display = (!q || hay.includes(q)) ? '' : 'none';
      });

      const cats = groupsHost.querySelectorAll('.vocabCatCard');
      cats.forEach((cat)=>{
        const anyVisible = Array.from(cat.querySelectorAll('.vocabWordCard')).some(x => x.style.display !== 'none');
        cat.style.display = anyVisible ? '' : 'none';
      });
    });
  }

// Collocations (English first; click to reveal Persian)
  if (Array.isArray(data.collocations) && data.collocations.length) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-collocations';

    appendHeading(sec, 3, 'Collocations');
    appendPara(sec, 'muted', 'Click a collocation to reveal the Persian translation.');

    const ul = document.createElement('ul');
    ul.className = 'vocab-list';

    data.collocations.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'colloc-item';

      const enS = document.createElement('span');
      enS.className = 'vocab-en toggle-fa';
      enS.setAttribute('role', 'button');
      enS.tabIndex = 0;

      const phrase = String((it && it.en) ? it.en : '').trim();
      enS.appendChild(document.createTextNode(phrase));

      // Optional: quick link to the word/phrase page (won't toggle)
      if (phrase) {
        const link = document.createElement('a');
        link.className = 'no-toggle collocLink';
        link.href = `word.html?id=${encodeURIComponent(phrase)}`;
        link.title = 'Open';
        link.textContent = ' ↗';
        enS.appendChild(link);
      }

      const faS = document.createElement('span');
      faS.className = 'vocab-fa fa isHidden';
      faS.dir = 'rtl';
      faS.textContent = String((it && it.fa) ? it.fa : '').trim();

      li.appendChild(enS);
      li.appendChild(faS);
      ul.appendChild(li);
    });

    sec.appendChild(ul);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Collocations' });
  }

// Timed Practice (one page per exercise + timer)
  if (Array.isArray(data.exercises) && data.exercises.length) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-exercises';

    appendHeading(sec, 3, 'Timed Practice');
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Each exercise opens on its own page and includes a built-in timer.';
    sec.appendChild(p);

    const byLevel = { beginner: [], intermediate: [], advanced: [] };
    data.exercises.forEach((e) => {
      if (!e || !e.level) return;
      (byLevel[e.level] || (byLevel[e.level] = [])).push(e);
    });

    const levelInfo = {
      beginner: { title: 'Beginner', desc: 'Start simple and build accuracy.' },
      intermediate: { title: 'Intermediate', desc: 'Add reasoning, prediction, and stronger structure.' },
      advanced: { title: 'Advanced', desc: 'TOEFL-style clarity with inference and solutions.' },
    };

    ['beginner', 'intermediate', 'advanced'].forEach((lvl) => {
      const items = byLevel[lvl] || [];
      if (!items.length) return;

      const wrap = document.createElement('div');
      wrap.className = 'exercise-level';

      const head = document.createElement('div');
      head.className = 'exercise-level-head';
      head.innerHTML = `<h4 class="h4">${levelInfo[lvl].title}</h4><p class="muted small">${levelInfo[lvl].desc}</p>`;
      wrap.appendChild(head);

      const ul = document.createElement('ul');
      ul.className = 'exercise-list';

      items.forEach((e) => {
        const li = document.createElement('li');
        const total = Array.isArray(e.phases) ? e.phases.reduce((a, ph) => a + (Number(ph.seconds) || 0), 0) : 0;
        const mins = total ? Math.max(1, Math.round(total / 60)) : 0;
        const href = `exercise.html?lesson=${encodeURIComponent(data.id)}&ex=${encodeURIComponent(e.id)}`;
        li.innerHTML = `<a class="exercise-link" href="${href}"><span class="ex-name">${escapeHTML(e.name || 'Exercise')}</span><span class="ex-meta">${escapeHTML(e.type || '')}${mins ? ' • ' + mins + ' min' : ''}</span></a>`;
        ul.appendChild(li);
      });

      wrap.appendChild(ul);
      sec.appendChild(wrap);
    });

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Timed Practice' });
  }


  // Custom photo prompt (for generating a matching photoreal image)
  if (data.imagePrompt) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-image-prompt';

    const h = document.createElement('h3');
    h.textContent = 'Custom photo prompt';
    sec.appendChild(h);

    if (data.needsNewImage) {
      const warn = document.createElement('p');
      warn.className = 'callout callout-warn';
      warn.textContent = 'This lesson uses a generic placeholder-style image. Consider generating a custom photoreal photo using the prompt below.';
      sec.appendChild(warn);
    } else {
      const tip = document.createElement('p');
      tip.className = 'callout callout-tip';
      tip.textContent = 'You can generate a fresh photoreal image for this lesson using the prompt below (optional).';
      sec.appendChild(tip);
    }

    const box = document.createElement('div');
    box.className = 'prompt-box';

    const pre = document.createElement('pre');
    pre.className = 'prompt-text';
    pre.textContent = data.imagePrompt;

    const actions = document.createElement('div');
    actions.className = 'prompt-actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary';
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c5.5 0 9.7 4 11 7-1.3 3-5.5 7-11 7S2.3 15 1 12c1.3-3 5.5-7 11-7Zm0 2C7.6 7 4.2 10 3.1 12c1.1 2 4.5 5 8.9 5s7.8-3 8.9-5c-1.1-2-4.5-5-8.9-5Zm0 2.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Zm0 1.8A1 1 0 1 0 13 12a1 1 0 0 0-1-1Z"/></svg>`;
    btn.title = 'Toggle Persian translation';
    btn.setAttribute('aria-label','Toggle Persian translation');
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(data.imagePrompt);
        btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c5.5 0 9.7 4 11 7-1.3 3-5.5 7-11 7S2.3 15 1 12c1.3-3 5.5-7 11-7Zm0 2C7.6 7 4.2 10 3.1 12c1.1 2 4.5 5 8.9 5s7.8-3 8.9-5c-1.1-2-4.5-5-8.9-5Zm0 2.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Zm0 1.8A1 1 0 1 0 13 12a1 1 0 0 0-1-1Z"/></svg>`;
    btn.title = 'Toggle Persian translation';
    btn.setAttribute('aria-label','Toggle Persian translation');
        setTimeout(() => (btn.textContent = 'Copy prompt'), 1200);
      } catch (_) {
        // Fallback: select text
        const ta = document.createElement('textarea');
        ta.value = data.imagePrompt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c5.5 0 9.7 4 11 7-1.3 3-5.5 7-11 7S2.3 15 1 12c1.3-3 5.5-7 11-7Zm0 2C7.6 7 4.2 10 3.1 12c1.1 2 4.5 5 8.9 5s7.8-3 8.9-5c-1.1-2-4.5-5-8.9-5Zm0 2.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Zm0 1.8A1 1 0 1 0 13 12a1 1 0 0 0-1-1Z"/></svg>`;
    btn.title = 'Toggle Persian translation';
    btn.setAttribute('aria-label','Toggle Persian translation');
        setTimeout(() => (btn.textContent = 'Copy prompt'), 1200);
      }
    });

    const spec = document.createElement('p');
    spec.className = 'muted';
    spec.textContent = 'Export as WebP: 1600px (desktop) and 800px (mobile). No text/logos/watermarks.';

    actions.appendChild(btn);
    box.appendChild(actions);
    box.appendChild(pre);
    sec.appendChild(box);
    sec.appendChild(spec);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Photo prompt' });
  }

// Image analysis checklist (structured)
  if (data.imageAnalysis) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-image-analysis';

    const h = document.createElement('h3');
    h.textContent = 'Image analysis checklist';
    sec.appendChild(h);

    const ul = document.createElement('ul');
    ul.className = 'checklist';
    const items = [
      ['Time', data.imageAnalysis.time],
      ['Weather', data.imageAnalysis.weather],
      ['People', data.imageAnalysis.people],
      ['Actions', data.imageAnalysis.actions],
      ['Clothing', data.imageAnalysis.clothing],
      ['Mood', data.imageAnalysis.mood],
    ].filter(([_, v]) => v);

    for (const [label, value] of items) {
      const li = document.createElement('li');
      const strong=document.createElement('strong');
      strong.textContent = `${label}: `;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(String(value)));
      ul.appendChild(li);
    }
    sec.appendChild(ul);

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Image analysis' });
  }

  // Practice (speaking + writing + vocab)
  if (data.practice) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-practice';

// Rubrics (quick TOEFL-style guidance)
    const rub = document.createElement('div');
    rub.className = 'rubrics';

    const sp = document.createElement('div');
    sp.className = 'rubric-card';
    appendHeading(sp, 4, 'Speaking rubric (quick)');
    appendList(sp, [
      'Content: answer the question directly + add 2–3 concrete details.',
      'Organization: clear intro → 2 points → short wrap-up.',
      'Language: varied vocabulary, correct grammar, natural linking words.',
      'Delivery: steady pace, clear pronunciation, confident tone.'
    ]);

    const wr = document.createElement('div');
    wr.className = 'rubric-card';
    appendHeading(wr, 4, 'Writing rubric (quick)');
    appendList(wr, [
      'Thesis: clear position in 1–2 sentences.',
      'Development: 2 body paragraphs, each with an example.',
      'Coherence: transitions + topic sentences.',
      'Accuracy: fix repeated errors; keep sentences readable.'
    ]);

    rub.appendChild(sp);
    rub.appendChild(wr);
    sec.appendChild(rub);


    const h = document.createElement('h3');
    h.textContent = 'Practice';
    sec.appendChild(h);

    // Practice sentences
    if (Array.isArray(data.practice.sentences)) {
      const sub = document.createElement('h4');
      sub.textContent = 'Practice sentences';
      sec.appendChild(sub);
      const ul = document.createElement('ul');
      for (const s of data.practice.sentences) {
        const li = document.createElement('li');
        li.textContent = s;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
    }

    // Q & A
    if (Array.isArray(data.practice.qa)) {
      const sub = document.createElement('h4');
      sub.textContent = 'Q & A';
      sec.appendChild(sub);
      for (const it of data.practice.qa) {
        const box = document.createElement('div');
        box.className = 'qaBlock';
        const q = document.createElement('p');
        q.className = 'qaQ';
        q.textContent = `Q: ${it.q || ''}`;
        const a = document.createElement('p');
        a.className = 'qaA';
        a.textContent = `A: ${it.a || ''}`;
        box.appendChild(q);
        box.appendChild(a);
        sec.appendChild(box);
      }
    }

    // Speaking prompts
    if (Array.isArray(data.practice.speakingPrompts)) {
      const sub = document.createElement('h4');
      sub.textContent = 'Speaking prompts';
      sec.appendChild(sub);
      const ul = document.createElement('ul');
      for (const p of data.practice.speakingPrompts) {
        const li = document.createElement('li');
        li.textContent = p;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
    }

    // Warm-up
    if (Array.isArray(data.practice.warmupQuestions)) {
      const sub = document.createElement('h4');
      sub.textContent = 'Warm-up questions';
      sec.appendChild(sub);

      const ul = document.createElement('ul');
      for (const q of data.practice.warmupQuestions) {
        const li = document.createElement('li');
        li.textContent = q;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
    }

    // Speaking
    if (data.practice.speakingTask) {
      const sub = document.createElement('h4');
      sub.textContent = 'Speaking task';
      sec.appendChild(sub);

      const p1 = document.createElement('p');
      p1.textContent = data.practice.speakingTask.prompt || '';
      sec.appendChild(p1);

      if (data.practice.speakingTask.sampleAnswer) {
        const details = document.createElement('details');
        details.className = 'answer';
        const sum = document.createElement('summary');
        sum.textContent = 'Sample answer';
        details.appendChild(sum);

        const p2 = document.createElement('p');
        p2.textContent = data.practice.speakingTask.sampleAnswer;
        details.appendChild(p2);
        sec.appendChild(details);
      }
    }

    // Writing
    if (data.practice.writingTask) {
      const sub = document.createElement('h4');
      sub.textContent = 'Writing task';
      sec.appendChild(sub);

      const p1 = document.createElement('p');
      p1.textContent = data.practice.writingTask.prompt || '';
      sec.appendChild(p1);

      if (Array.isArray(data.practice.writingTask.outline)) {
        const ol = document.createElement('ol');
        for (const step of data.practice.writingTask.outline) {
          const li = document.createElement('li');
          li.textContent = step;
          ol.appendChild(li);
        }
        sec.appendChild(ol);
      }
    }

    // Vocab practice
    if (data.practice.vocabularyPractice && Array.isArray(data.practice.vocabularyPractice.fillInTheBlank)) {
      const sub = document.createElement('h4');
      sub.textContent = 'Vocabulary practice';
      sec.appendChild(sub);

      const ul = document.createElement('ul');
      for (const s of data.practice.vocabularyPractice.fillInTheBlank) {
        const li = document.createElement('li');
        li.textContent = s;
        ul.appendChild(li);
      }
      sec.appendChild(ul);

      if (Array.isArray(data.practice.vocabularyPractice.answers)) {
        const details = document.createElement('details');
        details.className = 'answer';
        const sum = document.createElement('summary');
        sum.textContent = 'Answer key';
        details.appendChild(sum);

        const p = document.createElement('p');
        p.textContent = data.practice.vocabularyPractice.answers.join(' • ');
        details.appendChild(p);
        sec.appendChild(details);
      }
    }

    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Practice' });
  }

  // Vocabulary section (table)

// (v30.4) Removed duplicate Vocabulary table section (sec-vocab). Vocabulary is shown in the main Vocabulary section above.


// Mini quiz (based on vocabulary)
const vocabItemsForQuiz =
  (Array.isArray(data.vocabularyDetailed) && data.vocabularyDetailed.length)
    ? data.vocabularyDetailed.map(v => ({
        word: (v && v.en) ? String(v.en) : '',
        translation: (v && v.fa) ? (Array.isArray(v.fa) ? v.fa.join(', ') : String(v.fa)) : ''
      }))
    : (Array.isArray(data.vocabulary) ? data.vocabulary.map(v => ({
        word: (v && (v.word || v.en)) ? String(v.word || v.en) : '',
        translation: (v && (v.translation || v.fa)) ? String(v.translation || v.fa) : ''
      })) : []);

const quizQuestions = buildVocabQuiz(vocabItemsForQuiz, 5);
if (quizQuestions.length) {
  const sec = document.createElement('section');
  sec.className = 'section';
  sec.id = 'sec-quiz';

  const h = document.createElement('h3');
  h.textContent = 'Quiz (Vocabulary)';
  sec.appendChild(h);

  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Choose the best Persian translation for each word.';
  sec.appendChild(p);

  const form = document.createElement('div');
  form.className = 'quiz';

  quizQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';

    const qh = document.createElement('div');
    qh.className = 'quiz-q';
    qh.textContent = `${idx + 1}) ${q.word}`;
    card.appendChild(qh);

    const opts = document.createElement('div');
    opts.className = 'quiz-opts';

    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        // lock this question
        if (card.dataset.answered === '1') return;
        card.dataset.answered = '1';

        const all = opts.querySelectorAll('button.quiz-opt');
        all.forEach(b => b.disabled = true);

        if (opt === q.answer) {
          btn.classList.add('is-correct');
        } else {
          btn.classList.add('is-wrong');
          // highlight correct
          all.forEach(b => {
            if (b.textContent === q.answer) b.classList.add('is-correct');
          });
        }
      });

      opts.appendChild(btn);
    });

    card.appendChild(opts);
    form.appendChild(card);
  });

  sec.appendChild(form);
  article.appendChild(sec);
  tocSections.push({ id: sec.id, title: 'Quiz' });
}


  // Phrases section
  if (Array.isArray(data.phrases) && data.phrases.length) {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-phrases';
    const h = document.createElement('h3');
    h.textContent = 'Phrases';
    sec.appendChild(h);

    const ul = document.createElement('ul');
    ul.className = 'list';
    data.phrases.forEach((p) => {
      if (!p) return;
      const li = document.createElement('li');
      const phrase = (typeof p === 'string') ? p : (p.phrase || '');
      const tr = (typeof p === 'object' && p && p.translation) ? ` — ${p.translation}` : '';
      li.textContent = phrase + tr;
      ul.appendChild(li);
    });

    sec.appendChild(ul);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: 'Phrases' });
  }

  // Grammar section
  if (typeof data.grammar === "string" && data.grammar.trim()) {
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = "sec-grammar";
    const h = document.createElement("h3");
    h.textContent = "Grammar";
    sec.appendChild(h);

    const p = document.createElement("p");
    p.textContent = data.grammar.trim();
    sec.appendChild(p);
    article.appendChild(sec);
    tocSections.push({ id: sec.id, title: "Grammar" });
  }

  // Optional: Visual details (if present)
  if (data.visual && typeof data.visual === 'object') {
    const sec = document.createElement('section');
    sec.className = 'section';
    sec.id = 'sec-visual';
    const h = document.createElement('h3');
    h.textContent = 'Visual details';
    sec.appendChild(h);

    const list = document.createElement('ul');
    list.className = 'kv-list';
    Object.entries(data.visual).forEach(([k, v]) => {
      if (!v) return;
      const li = document.createElement('li');
      const kSpan = document.createElement('span');
      kSpan.className = 'k';
      kSpan.textContent = `${k}:`;
      const vSpan = document.createElement('span');
      vSpan.className = 'v';
      vSpan.textContent = String(v);
      li.appendChild(kSpan);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(vSpan);
      list.appendChild(li);
    });
    if (list.children.length) {
      sec.appendChild(list);
      article.appendChild(sec);
      tocSections.push({ id: sec.id, title: 'Visual details' });
    }
  }

  renderToeflSection(article, tocSections, data.toefl);

  // Prev/Next nav (bottom)
  if (Array.isArray(registry) && registry.length) {
    article.appendChild(buildPrevNextNav(registry, data.id));
  }

  // Table of contents (desktop uses it for a proper wide layout)
  try {
    const toc = buildToc(tocSections);
    layout.appendChild(toc);
  } catch (_) {}

  layout.appendChild(article);
  container.appendChild(layout);
  const vlist = article.querySelector('.vocabList');
  enrichVocabItemsWithProfiles(vlist);


  // Init interactive modules (speaking timers/recording)
  if (window.initSpeakingModules) {
    window.initSpeakingModules();
  }

  // Selection-based dictionary lookup (highlight a word/phrase)
  setupSelectionLookup(article);
  // v13: Persian translations hidden by default, tap English to reveal Persian
  try{ if(window.wireBilingualToggles) window.wireBilingualToggles(container); }catch(e){}// v13: linkify English words to dictionary pages (focus on lesson vocabulary only)
  try{
    const tokens = extractLessonVocabTokens(data);
    linkifyLessonEnglish(container, tokens);
  }catch(e){}

  // v28: Layout v2 (tabs + drawers)
  try{ applyLessonLayoutV2(article); }catch(e){}

}

async function loadLesson(){
  const container = document.getElementById('lessonContainer');
  if (!container) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) throw new Error('Missing lesson id');

    // Registry provides prev/next navigation + fallback image metadata
    const regData = await (window.Utils?.fetchJSON
      ? window.Utils.fetchJSON('assets/data/registry.json', { cache: 'no-store' })
      : (await (await fetch('assets/data/registry.json', { cache: 'no-store' })).json()));
    const registry = Array.isArray(regData)
      ? regData
      : (regData && Array.isArray(regData.lessons) ? regData.lessons : []);

    const entry = registry.find((l) => l && l.id === id) || null;
    const lessonUrl = entry && entry.file ? entry.file : null;
    if (!lessonUrl) throw new Error('Lesson not found in registry');

    const resolvedLessonUrl = window.Utils?.resolveAssetURL ? window.Utils.resolveAssetURL(lessonUrl) : lessonUrl;
    const res = await fetch(resolvedLessonUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Lesson HTTP ${res.status}`);
    const data = await res.json();

    // Merge a few useful registry fields (when lesson JSON is minimal)
    if (entry) {
      if (!data.tags && entry.tags) data.tags = entry.tags;
      if (!data.caption && entry.caption) data.caption = entry.caption;
      if (!data.title && entry.title) data.title = entry.title;

      // Some registries keep image800/image1600 at top-level
      if (!data.image && (entry.image800 || entry.image1600)) {
        data.image = {
          src800: entry.image800 || '',
          src1600: entry.image1600 || '',
          alt: data.imageAlt || (data.title ? `Lesson image: ${data.title}` : '')
        };
      }
    }

	    // Load lexicon once for FA fallbacks (vocab cards + quick review)
	    if (!window.__LEXICON && window.Utils?.fetchJSON) {
	      try {
	        window.__LEXICON = await window.Utils.fetchJSON('assets/data/lexicon_updated.json', { cache: 'no-store', __attempts: 3 });
	      } catch {
	        try { window.__LEXICON = await window.Utils.fetchJSON('assets/data/lexicon.json', { cache: 'no-store', __attempts: 3 }); } catch {}
	      }
	    }

	    renderLesson(container, data, registry);

    // Level toggle (optional)
    setupLevelToggle(data.levels || data.levelInfo || null);
  } catch (err) {
    console.error(err);
    clearEl(container);
    const sec = document.createElement('section');
    sec.className = 'panel';
    const h = document.createElement('h1');
    h.className = 'h1';
    h.textContent = 'Failed to load lesson';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'The lesson could not be loaded. Please refresh the page or open the lesson again from the lessons list.';
    const a = document.createElement('a');
    a.className = 'back-link';
    a.href = 'index.html';
    a.textContent = 'Back to lessons';
    sec.appendChild(h);
    sec.appendChild(p);
    sec.appendChild(a);
    container.appendChild(sec);
  }
}

document.addEventListener('DOMContentLoaded', loadLesson);


function setupLevelToggle(levels){
  const buttons = document.querySelectorAll('.level-btn');
  const desc = document.getElementById('levelDescription');
  const panes = document.querySelectorAll('.level-pane');

  const fallback = {
    beginner: { focus: 'Beginner', canDo: ['Describe the photo simply', 'Use 8–10 key words', 'Speak for ~30 seconds'] },
    intermediate: { focus: 'Intermediate', canDo: ['Use better structure', 'Add evidence from details', 'Speak for ~45 seconds'] },
    advanced: { focus: 'Advanced', canDo: ['Use hedging + academic phrases', 'Write a stronger paragraph', 'Speak for ~60 seconds'] }
  };
  const infoObj = (levels && typeof levels === 'object') ? levels : fallback;

  function activate(level){
    buttons.forEach(b => b.classList.toggle('active', b.dataset.level === level));
    panes.forEach(p => p.classList.toggle('active', p.dataset.level === level));

    if (desc) {
      const info = infoObj[level];
      desc.replaceChildren();
      if (info) {
        const strong = document.createElement('strong');
        strong.textContent = info.focus || '';
        desc.appendChild(strong);

        const ul = document.createElement('ul');
        (info.canDo || []).forEach((c) => {
          const li = document.createElement('li');
          li.textContent = c;
          ul.appendChild(li);
        });
        desc.appendChild(ul);
      }
    }
  }

  buttons.forEach((b) => b.addEventListener('click', () => activate(b.dataset.level)));

  // default
  activate('beginner');
}

// Detect Persian strings that still contain a noticeable amount of Latin text.
// We prefer showing EN (clean) instead of a messy mixed FA+EN line.
function isIncompleteFa(text){
  const s = String(text || '').trim();
  if(!s) return true;
  const m = s.match(/[A-Za-z]/g);
  return m && m.length >= 3;
}

