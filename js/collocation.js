/* Collocation page (bilingual, multi-level, multi-tense) */
(function(){
  'use strict';
// replaceAll polyfill (older browsers)
// replaceAll polyfill
if (!String.prototype.replaceAll) {
  // eslint-disable-next-line no-extend-native
  String.prototype.replaceAll = function(search, replacement) {
    return this.split(search).join(replacement);
  };
}

// Placeholder FA labels that must not be shown as real translations
const __BLACK_FA__ = new Set(['فعل/عمل','موضوع/مفهوم','شیء/وسیله']);
function __cleanFa__(faArr) {
  const arr = Array.isArray(faArr) ? faArr : (faArr ? [faArr] : []);
  const cleaned = arr.map(x => String(x||'').trim()).filter(x => x && !__BLACK_FA__.has(x));
  return cleaned.length ? cleaned : null;
}


  const $ = (sel) => document.querySelector(sel);

  function getParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  function escapeHtml(str){
    return String(str || '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  function slugify(s){
    s = String(s||'').toLowerCase().trim();
    s = s.replace(/[’']/g,'');
    s = s.replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    return s.slice(0,64) || 'item';
  }

  // Small verb inflection helper
  const IRR = {
    take:{past:'took',pp:'taken'},
    make:{past:'made',pp:'made'},
    get:{past:'got',pp:'gotten'},
    go:{past:'went',pp:'gone'},
    come:{past:'came',pp:'come'},
    run:{past:'ran',pp:'run'},
    sit:{past:'sat',pp:'sat'},
    eat:{past:'ate',pp:'eaten'},
    drink:{past:'drank',pp:'drunk'},
    write:{past:'wrote',pp:'written'},
    speak:{past:'spoke',pp:'spoken'},
    see:{past:'saw',pp:'seen'},
    feel:{past:'felt',pp:'felt'},
    keep:{past:'kept',pp:'kept'},
    leave:{past:'left',pp:'left'},
    hold:{past:'held',pp:'held'},
    stand:{past:'stood',pp:'stood'},
    build:{past:'built',pp:'built'},
    bring:{past:'brought',pp:'brought'},
    buy:{past:'bought',pp:'bought'},
    catch:{past:'caught',pp:'caught'},
    think:{past:'thought',pp:'thought'},
    wear:{past:'wore',pp:'worn'},
    ride:{past:'rode',pp:'ridden'}
  };

  function thirdS(v){
    if (v.endsWith('y') && !/[aeiou]y$/.test(v)) return v.slice(0,-1)+'ies';
    if (/(s|sh|ch|x|z|o)$/.test(v)) return v+'es';
    return v+'s';
  }
  function ing(v){
    if (v.endsWith('ie')) return v.slice(0,-2)+'ying';
    if (v.endsWith('e') && !v.endsWith('ee')) return v.slice(0,-1)+'ing';
    if (/[^aeiou][aeiou][^aeiou]$/.test(v) && v.length<=5) return v+v.slice(-1)+'ing';
    return v+'ing';
  }
  function past(v){
    if (IRR[v]) return IRR[v].past;
    if (v.endsWith('e')) return v+'d';
    if (v.endsWith('y') && !/[aeiou]y$/.test(v)) return v.slice(0,-1)+'ied';
    if (/[^aeiou][aeiou][^aeiou]$/.test(v) && v.length<=5) return v+v.slice(-1)+'ed';
    return v+'ed';
  }
  function pp(v){
    if (IRR[v]) return IRR[v].pp;
    return past(v);
  }

  function splitVerbPhrase(phrase){
    const p = phrase.trim();
    const parts = p.split(/\s+/);
    const v = (parts[0]||'').toLowerCase();
    const rest = parts.slice(1).join(' ');
    return {v, rest};
  }

  function looksLikeVerbPhrase(phrase){
    const first = phrase.trim().split(/\s+/)[0]?.toLowerCase() || '';
    return /^[a-z]+$/.test(first) && phrase.includes(' ') && first.length>1;
  }

  function makeBi(en, fa){
    const wrap = document.createElement('div');
    wrap.className = 'exampleLine';
    const enEl = document.createElement('div');
    enEl.className = 'exampleEn toggle-fa';
    enEl.textContent = en;
    enEl.tabIndex=0;
    const faEl = document.createElement('div');
    faEl.className = 'exampleFa fa isHidden';
    faEl.dir='rtl';
    faEl.textContent = fa || '';
    wrap?.appendChild(enEl);
    wrap?.appendChild(faEl);
    return wrap;
  }

  function buildExamples(collEn, collFa){
    const out = [];
    const contexts = [
      {place:'in the photo', fa:'در عکس'},
      {place:'at work', fa:'در محل کار'},
      {place:'at school', fa:'در مدرسه/دانشگاه'},
      {place:'while traveling', fa:'هنگام سفر'},
      {place:'in the city', fa:'در شهر'}
    ];

    function add(en, fa){ out.push({en, fa}); }

    if (looksLikeVerbPhrase(collEn)){
      const {v, rest} = splitVerbPhrase(collEn);
      const r = rest ? ' ' + rest : '';

      add(`In the photo, they are ${ing(v)}${r}.`, `${contexts[0].fa} آن‌ها دارند ${collFa} انجام می‌دهند.`);
      add(`I ${past(v)}${r} yesterday, and it felt amazing.`, `دیروز من ${collFa} کردم و حسش عالی بود.`);
      add(`I have ${pp(v)}${r} many times ${contexts[3].place}.`, `من بارها ${collFa} کرده‌ام (${contexts[3].fa}).`);
      add(`Next time, I will ${v}${r} earlier to save time.`, `دفعه بعد زودتر ${collFa} می‌کنم تا وقت ذخیره شود.`);
      add(`While I was ${ing(v)}${r}, I noticed an important detail.`, `وقتی داشتم ${collFa} می‌کردم، یک جزئیات مهم دیدم.`);
      add(`You should ${v}${r} before you make a decision.`, `بهتر است قبل از تصمیم گرفتن ${collFa} انجام بدهی.`);
      add(`From a TOEFL speaking perspective, ${collEn} helps you sound natural.`, `از نظر اسپیکینگ TOEFL، «${collFa}» باعث طبیعی‌تر شدن صحبت می‌شود.`);
    } else {
      add(`This collocation (**${collEn}**) is useful for describing scenes clearly.`, `این کالوکیشن (**${collFa}**) برای توصیف صحنه‌ها مفید است.`);
      add(`I noticed **${collEn}** ${contexts[4].place} last week.`, `هفته قبل «${collFa}» را ${contexts[4].fa} دیدم.`);
      add(`People often mention **${collEn}** when they tell stories.`, `مردم اغلب هنگام تعریف داستان از «${collFa}» استفاده می‌کنند.`);
      add(`In academic writing, you can use **${collEn}** to be more precise.`, `در نوشتار آکادمیک، «${collFa}» کمک می‌کند دقیق‌تر باشی.`);
    }

    // add a few context variations
    contexts.slice(1).forEach((c) => {
      add(`I can ${collEn} ${c.place} when I need a quick example.`, `من می‌توانم ${collFa} را ${c.fa} به عنوان مثال سریع به کار ببرم.`);
    });

    return out;
  }

  async function load(){
    const lessonId = getParam('lesson');
    const cParam = getParam('c');

    // Find collocation in index
    const idxRes = await fetch('assets/data/collocations_index.json', {cache:'no-store'});
    const idx = await idxRes.json();
    let coll = (idx.entries || []).find(x => x.id === cParam && (!lessonId || x.lesson === lessonId)) || (idx.entries || []).find(x => x.id === cParam) || null;

    let lId = lessonId || (coll ? coll.lesson : '');
    if (!lId){
      $('#main').innerHTML = `<div class="container"><p class="muted">Missing lesson/collocation parameters.</p></div>`;
      return;
    }

    const lessonRes = await fetch(`assets/data/lessons/${encodeURIComponent(lId)}.json`, {cache:'no-store'}).catch(()=>null);
    let lesson = null;
    if (lessonRes && lessonRes.ok) lesson = await lessonRes.json();

    // If not found via index, try inside lesson
    if (!coll && lesson && Array.isArray(lesson.collocations)){
      coll = lesson.collocations.find((x, i) => String(x.id||i) === String(cParam)) || lesson.collocations[0] || null;
    }
    if (!coll){
      $('#main').innerHTML = `<div class="container"><p class="muted">Collocation not found.</p></div>`;
      return;
    }

    const collEn = coll.en || '';
    const collFa = coll.fa || '';

    // header
    $('#collTitle').textContent = collEn;
    $('#collFa').textContent = collFa;

    // context
    const ctx = $('#context');
    if (lesson){
      ctx.innerHTML = `
        <div class="metaGrid">
          <div class="metaItem"><div class="metaLabel">Lesson</div><div class="metaValue"><a href="lesson.html?id=${encodeURIComponent(lesson.id)}">${escapeHtml(lesson.title || lesson.id)}</a></div></div>
          <div class="metaItem"><div class="metaLabel">Scene</div><div class="metaValue">${escapeHtml((lesson.sceneDescription || lesson.caption || '').slice(0,140))}…</div></div>
        </div>
      `;
    } else {
      ctx.innerHTML = `<p class="muted">Lesson context unavailable.</p>`;
    }

    // examples
    const ex = $('#examples');
    ex.innerHTML = '';
    buildExamples(collEn, collFa).forEach((x) => ex?.appendChild(makeBi(x.en, x.fa)));

    // words inside collocation -> links
    const wordsWrap = $('#words');
    const tokens = collEn.split(/[\s-]+/).filter(Boolean);
    const uniq = [...new Set(tokens.map(t=>t.toLowerCase()))].slice(0,10);
    const ul = document.createElement('ul');
    ul.className = 'chipList';
    uniq.forEach((t) => {
      const li = document.createElement('li'); li.className='chip';
      const s = document.createElement('span'); s.className='toggle-fa'; s.textContent=t; s.tabIndex=0;
      const a = document.createElement('a'); a.className='pillLink no-toggle'; a.textContent='Open'; a.href=`word.html?w=${encodeURIComponent(slugify(t))}&q=${encodeURIComponent(t)}`;
      const fa = document.createElement('span'); fa.className='fa isHidden'; fa.dir='rtl'; fa.textContent='';
      li?.appendChild(s); li?.appendChild(a); li?.appendChild(fa);
      ul?.appendChild(li);
    });
    wordsWrap.innerHTML='';
    wordsWrap?.appendChild(ul);

    if (window.wireBilingualToggles) window.wireBilingualToggles(document);
  }

  document.addEventListener('DOMContentLoaded', load);
})();
