/* word.js — Word detail page (v18) */
(() => {
  "use strict";

  // ---------- helpers ----------
  const qs = (sel, root=document) => root.querySelector(sel);
  const makeEl = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };

  const normalizeWord = (w) => (w || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");

  const safe = (s) => (s == null ? "" : String(s));

  const fetchJSON = async (url) => {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  };

  // ---------- data loaders ----------
  let __lexIndex = null;
  let __registry = null;

  async function loadLexiconIndex(){
    if (__lexIndex) return __lexIndex;
    const raw = await fetchJSON("assets/data/lexicon.json");
    const entries = Array.isArray(raw) ? raw : (raw.entries || []);
    const byEn = Object.create(null);
    const byId = Object.create(null);

    for (const e of entries){
      const en = normalizeWord(e.en || e.word || e.id || "");
      if (!en) continue;
      byEn[en] = e;
      if (e.id) byId[String(e.id)] = e;
    }
    __lexIndex = { raw, entries, byEn, byId };
    return __lexIndex;
  }

  async function loadRegistry(){
    if (__registry) return __registry;
    try{
      __registry = await fetchJSON("assets/data/registry.json");
    }catch(_){
      __registry = null;
    }
    return __registry;
  }

  const __letterCache = new Map();
  async function loadLetterProfiles(letter){
    const key = letter || "_";
    if (__letterCache.has(key)) return __letterCache.get(key);
    const url = `assets/data/word_profiles/${key}.json`;
    const data = await fetchJSON(url);
    __letterCache.set(key, data);
    return data;
  }

  async function getWordProfile(word){
    const w = normalizeWord(word);
    const first = w[0];
    const letter = (first && first >= "a" && first <= "z") ? first : "_";
    const map = await loadLetterProfiles(letter);
    // profiles are keyed by normalized word/phrase
    return map[w] || null;
  }

  // ---------- UI ----------
  function setStatus(msg){
    let el = qs("#status");
    if (!el){
      const main = qs('#main');
      if (main){
        el = document.createElement('div');
        el.id = 'status';
        el.className = 'muted';
        el.style.margin = '10px 0';
        main.prepend(el);
      }
    }
    if (el) el.textContent = msg;
  }

  function tinyFaButton(onClick){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fa-toggle-btn";
    btn.title = "Show/hide Persian";
    btn.setAttribute("aria-label", "Show/hide Persian");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5c5.2 0 9.4 3.2 10.8 7-1.4 3.8-5.6 7-10.8 7S2.6 15.8 1.2 12C2.6 8.2 6.8 5 12 5Z" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.6"/>
      </svg>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderWord({word, entry, profile, registry}){
    const main = qs("#main");
    if (!main) return;
    main.innerHTML = "";

    // Hero
    const hero = makeEl("div", "word-hero");
    const h1 = makeEl("h1", "", word);
    hero.appendChild(h1);

    const pos = safe(profile?.pos || entry?.pos || "");
    if (pos){
      const pill = makeEl("span", "word-pill", pos);
      hero.appendChild(pill);
    }

    // Persian meaning (hidden by default; reveal with tiny button)
    const faList = (entry?.fa && Array.isArray(entry.fa)) ? entry.fa.filter(Boolean) : [];
    if (faList.length){
      const pill = makeEl("span", "word-pill");
      const faText = makeEl("span", "fa isHidden", faList.join(", "));
      faText.title = "Click to show Persian";
      faText.addEventListener("click", () => faText.classList.toggle("isHidden"));
      pill.appendChild(makeEl("span", "", "Persian"));
      pill.appendChild(faText);
      pill.appendChild(tinyFaButton(() => faText.classList.toggle("isHidden")));
      hero.appendChild(pill);
    }
    main.appendChild(hero);

    // Layout grid
    const grid = makeEl("div", "word-grid");

    // Left: definition + examples
    const left = makeEl("div", "word-card");
    left.appendChild(makeEl("h2", "", "Definition"));

    const def = safe(profile?.definition || entry?.definition || entry?.gloss || "");
    if (def){
      left.appendChild(makeEl("p", "", def));
    }else{
      left.appendChild(makeEl("p", "muted", "No definition available for this word."));
    }

    // Patterns / usage
    const patterns = Array.isArray(profile?.patterns) ? profile.patterns : [];
    if (patterns.length){
      left.appendChild(makeEl("h2", "", "Patterns"));
      const ul = makeEl("ul");
      for (const p of patterns.slice(0, 10)){
        ul.appendChild(makeEl("li", "", safe(p)));
      }
      left.appendChild(ul);
    }

    // Examples
    const examples = Array.isArray(profile?.examples) ? profile.examples : [];
    left.appendChild(makeEl("h2", "", "Examples"));
    if (examples.length){
      const exWrap = makeEl("div");
      for (const ex of examples.slice(0, 8)){
        const card = makeEl("div", "word-card");
        card.style.padding = "10px";
        const en = makeEl("div", "", safe(ex.en || ex));
        card.appendChild(en);

        if (ex.fa){
          const fa = makeEl("div", "fa isHidden", safe(ex.fa));
          fa.title = "Click to show Persian";
          fa.addEventListener("click", () => fa.classList.toggle("isHidden"));
          card.appendChild(fa);
        }
        exWrap.appendChild(card);
      }
      left.appendChild(exWrap);
    }else{
      left.appendChild(makeEl("p", "muted", "No examples available for this word."));
    }

    grid.appendChild(left);

    // Right: synonyms/antonyms + lessons
    const right = makeEl("div", "word-card");

    right.appendChild(makeEl("h2", "", "Synonyms & Antonyms"));

    const syn = Array.isArray(profile?.synonyms) ? profile.synonyms : [];
    const ant = Array.isArray(profile?.antonyms) ? profile.antonyms : [];

    const chips = makeEl("div", "word-chips");
    if (syn.length){
      const label = makeEl("div", "muted", "Synonyms:");
      right.appendChild(label);
      for (const w of syn.slice(0, 12)){
        const a = makeEl("a", "word-chip", safe(w));
        a.href = `word.html?id=${encodeURIComponent(safe(w))}`;
        chips.appendChild(a);
      }
      right.appendChild(chips.cloneNode(false));
      right.appendChild(chips);
    }else{
      right.appendChild(makeEl("p", "muted", "No synonyms listed."));
    }

    if (ant.length){
      const wrap = makeEl("div");
      wrap.appendChild(makeEl("div", "muted", "Antonyms:"));
      const antChips = makeEl("div", "word-chips");
      for (const w of ant.slice(0, 12)){
        const a = makeEl("a", "word-chip", safe(w));
        a.href = `word.html?id=${encodeURIComponent(safe(w))}`;
        antChips.appendChild(a);
      }
      wrap.appendChild(antChips);
      right.appendChild(wrap);
    }else{
      right.appendChild(makeEl("p", "muted", "No antonyms listed."));
    }

    // Lessons referencing this word (from entry.lessons if present)
    const lessonIds = Array.isArray(entry?.lessons) ? entry.lessons : (Array.isArray(entry?.lessonIds) ? entry.lessonIds : []);
    if (lessonIds.length){
      right.appendChild(makeEl("h2", "", "Lessons"));
      const ul = makeEl("ul");
      for (const lid of lessonIds.slice(0, 10)){
        const li = makeEl("li");
        const title = registry?.lessons?.find?.(x => x.id===lid)?.title || lid;
        const a = makeEl("a", "word-chip", title);
        a.href = `lesson.html?id=${encodeURIComponent(lid)}`;
        li.appendChild(a);
        ul.appendChild(li);
      }
      right.appendChild(ul);
    }

    grid.appendChild(right);
    main.appendChild(grid);
  }

  async function init(){
    try{
      const params = new URLSearchParams(location.search);
      const rawQ = params.get("id") || params.get("word") || params.get("w") || "";
      const q = rawQ.trim();
      if (!q){
        setStatus("No word specified.");
        return;
      }
      setStatus("Loading...");

      const lex = await loadLexiconIndex();
      const registry = await loadRegistry();

      const tryKeys = [
        q,
        q.replace(/-/g, " "),
        q.replace(/_/g, " "),
      ].map(normalizeWord);

      let entry = null;
      for (const k of tryKeys){
        entry = lex.byId[k] || lex.byEn[k] || null;
        if (entry) break;
      }

      const word = safe(entry?.en || q.replace(/[-_]/g, " "));
      const profile = await getWordProfile(word) || await getWordProfile(q.replace(/[-_]/g, " "));

      renderWord({ word, entry, profile, registry });
      setStatus("");
    }catch(err){
      console.error(err);
      setStatus("Failed to load this word's data.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
