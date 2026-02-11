function clearEl(el){ if(el) el?.replaceChildren(); }
function makeEl(tag, className, text){ const e=document.createElement(tag); if(className) e.className=className; if(text!==undefined) e.textContent=String(text); return e; }



/**
 * index page: load lessons list from registry and render cards.
 */

function toWebpSrcset(src800) {
  // expected: assets/images/<name>-800.webp
  const src1600 = src800.replace(/-800\.webp$/i, '-1600.webp');
  return `${src800} 800w, ${src1600} 1600w`;
}

function normalizeLessonImage(lesson){
  // Supports multiple registry schemas
  // - legacy: lesson.image (string)
  // - current: lesson.image800 / lesson.image1600
  // - alt: lesson.image object (src800/src1600)
  if (!lesson) return { src800: '', src1600: '' };

  // Newer registry.json uses image800/image1600
  if (typeof lesson.image800 === 'string' && lesson.image800) {
    return {
      src800: lesson.image800,
      src1600: (typeof lesson.image1600 === 'string' && lesson.image1600) ? lesson.image1600 : ''
    };
  }

  // Legacy
  if (typeof lesson.image === 'string' && lesson.image) {
    return { src800: lesson.image, src1600: '' };
  }

  // Some lesson objects embed an image object
  if (lesson.image && typeof lesson.image === 'object') {
    const src800 = lesson.image.src800 || lesson.image.src || '';
    const src1600 = lesson.image.src1600 || '';
    return { src800, src1600 };
  }

  return { src800: '', src1600: '' };
}



function computeLessonStats(data){
  if (!data || typeof data !== 'object') return null;

  const vocabDetailed = Array.isArray(data.vocabularyDetailed) ? data.vocabularyDetailed.length : 0;

  let vocabExt = 0;
  if (data.vocabularyExtended && typeof data.vocabularyExtended === 'object') {
    for (const v of Object.values(data.vocabularyExtended)) {
      if (Array.isArray(v)) vocabExt += v.length;
    }
  }

  // Practice count = generic practice blocks + TOEFL tasks/questions
  let practiceCount = 0;

  if (data.practice && typeof data.practice === 'object') {
    for (const v of Object.values(data.practice)) {
      if (Array.isArray(v)) practiceCount += v.length;
      else if (v && typeof v === 'object') {
        for (const vv of Object.values(v)) if (Array.isArray(vv)) practiceCount += vv.length;
      }
    }
  }

  if (data.toefl && typeof data.toefl === 'object') {
    const t = data.toefl;
    if (Array.isArray(t.questions)) practiceCount += t.questions.length;
    if (Array.isArray(t.speakingTasks)) practiceCount += t.speakingTasks.length;
    if (Array.isArray(t.writingTasks)) practiceCount += t.writingTasks.length;
    if (Array.isArray(t.reading)) practiceCount += t.reading.length;
    if (Array.isArray(t.listening)) practiceCount += t.listening.length;
  }

  const hasToefl = !!data.toefl;

  // Levels = number of text difficulty variants
  const levels =
    (data.descriptions && typeof data.descriptions === 'object') ? Object.keys(data.descriptions).length :
    ['simpleEnglish','intermediateEnglish','advancedEnglish'].filter((k)=>!!data[k]).length;

  const versions = ['simpleEnglish','intermediateEnglish','advancedEnglish'].filter((k)=>!!data[k]).length;

  return {
    vocab: vocabDetailed + vocabExt,
    practice: practiceCount,
    levels,
    hasToefl,
    versions
  };
}

function formatLessonStats(stats){
  if (!stats) return '';
  const parts = [];
  if (stats.vocab) parts.push(`Vocab: ${stats.vocab}`);
  if (stats.practice) parts.push(`Practice: ${stats.practice}`);
  if (stats.levels) parts.push(`Levels: ${stats.levels}`);
  if (stats.versions) parts.push(`Texts: ${stats.versions}`);
  if (stats.hasToefl) parts.push('TOEFL');
  return parts.join(' • ');
}

function updateLessonCardPills(card, stats){
  if(!card) return;
  const host = card.querySelector('.lesson-pills');
  if(!host) return;
  host.replaceChildren();
  const add = (label, value) => {
    if (value === undefined || value === null || value === '' || value === 0) return;
    const sp = document.createElement('span');
    sp.className = 'lesson-pill';
    sp.textContent = value === true ? String(label) : `${label}: ${value}`;
    host.appendChild(sp);
  };
  if(stats){
    add('Vocab', stats.vocab);
    add('Practice', stats.practice);
    add('Texts', stats.versions);
    if(stats.hasToefl) add('TOEFL', true);
  }
}

async function enrichLessonsWithStats(lessons){
  if (!Array.isArray(lessons) || !lessons.length) return;

  const tasks = lessons.map(async (lesson) => {
    if (!lesson || !lesson.file || lesson._stats) return;
    try {
      const res = await fetch(lesson.file, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      lesson._stats = computeLessonStats(data);
    } catch (_) {}
  });

  await Promise.all(tasks);
}

function createLessonCard(lesson) {
  const card = document.createElement('a');
  card.href = `lesson.html?id=${encodeURIComponent(lesson.id)}`;
  card.className = 'lesson-card';
  if (lesson && lesson.id) card.dataset.lessonId = lesson.id;

  // Badges
  // Badge: needs new image
  if (lesson.needsNewImage) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-warn';
    badge.textContent = 'Needs custom photo';
    card?.appendChild(badge);
  }

  // Badge: Multi-level (if lesson JSON provides levels)
  if (lesson.levels) {
    const b = document.createElement('span');
    b.className = 'badge badge-levels';
    b.textContent = 'Multi-level';
    card?.appendChild(b);
  }

  // Badge: First tag as a skill/topic hint
  if (Array.isArray(lesson.tags) && lesson.tags.length) {
    const t = document.createElement('span');
    t.className = 'badge badge-skill';
    t.textContent = lesson.tags[0];
    card?.appendChild(t);
  }

  // Image (lazy + blurred placeholder)
  const { src800, src1600 } = normalizeLessonImage(lesson);
  if (src800) {
    const img = document.createElement('img');
    img.alt = lesson.title || 'Lesson image';

    // Use placeholder first, load real via ImageLoader
    img.setAttribute('data-src', src800);
    img.setAttribute('data-placeholder-key', src800);

    if (/-800\.webp$/i.test(src800)) {
      const s1600 = src1600 || src800.replace(/-800\.webp$/i, '-1600.webp');
      img.setAttribute('data-srcset', `${src800} 800w, ${s1600} 1600w`);
      img.setAttribute('data-sizes', '(max-width: 700px) 100vw, 33vw');
    }

    card?.appendChild(img);
    if (window.ImageLoader) window.ImageLoader.enhance(img);
  }


  // Title
  const title = document.createElement('h2');
  title.textContent = lesson.title || 'Untitled lesson';
  card?.appendChild(title);

  // Caption / short description
  if (lesson.caption) {
    const cap = document.createElement('p');
    cap.className = 'lesson-caption';
    cap.textContent = lesson.caption;
    card?.appendChild(cap);
  }

  // Tags
  const tagsArr = Array.isArray(lesson.tags) ? lesson.tags : [];

  // Avoid repeating the first tag (already shown as a badge)
  const restTags = tagsArr.slice(1, 5);
  if (restTags.length) {
    const meta = document.createElement('div');
    meta.className = 'lesson-metaRow';
    restTags.forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'lesson-tagChip';
      chip.textContent = String(t);
      meta.appendChild(chip);
    });
    card?.appendChild(meta);
  }

  // Stats as pills (cleaner than a long sentence)
  const stats = lesson._stats || null;
  const pills = document.createElement('div');
  pills.className = 'lesson-pills';

  const addPill = (label, value) => {
    if (value === undefined || value === null || value === '' || value === 0) return;
    const sp = document.createElement('span');
    sp.className = 'lesson-pill';
    sp.textContent = value === true ? String(label) : `${label}: ${value}`;
    pills.appendChild(sp);
  };

  if (stats) {
    addPill('Vocab', stats.vocab);
    addPill('Practice', stats.practice);
    addPill('Texts', stats.versions);
    if (stats.hasToefl) addPill('TOEFL', true);
  } else {
    // Fallback: keep something visible
    const s = formatLessonStats(null);
    if (s) addPill('Info', s);
  }

  if (pills.children.length) card?.appendChild(pills);

  return card;
}


function topTags(lessons, limit=12){
  const counts = new Map();
  lessons.forEach(l=>{
    (Array.isArray(l.tags)?l.tags:[]).forEach(t=>{
      const key=(t||'').toString().trim();
      if(!key) return;
      counts.set(key, (counts.get(key)||0)+1);
    });
  });
  return Array.from(counts.entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, limit)
    .map(([t])=>t);
}

function renderChips(container, tags){
  if(!container) return;
  clearEl(container);
  const frag=document.createDocumentFragment();

  const allBtn=document.createElement('button');
  allBtn.className='chip active';
  allBtn.type='button';
  allBtn.dataset.tag='';
  allBtn.textContent='All';
  frag?.appendChild(allBtn);

  tags.forEach(t=>{
    const b=document.createElement('button');
    b.className='chip';
    b.type='button';
    b.dataset.tag=t;
    b.textContent=t;
    frag?.appendChild(b);
  });

  container?.appendChild(frag);
}

function setActiveChip(container, tag){
  if(!container) return;
  container.querySelectorAll('.chip').forEach(b=>{
    b.classList.toggle('active', (b.dataset.tag||'') === (tag||''));
  });
}

function normalizeText(s) {
  return (s || '').toString().toLowerCase().trim();
}

function matchLesson(lesson, q) {
  if (!q) return true;
  const hay = [
    lesson.title,
    lesson.level,
    Array.isArray(lesson.tags) ? lesson.tags.join(' ') : '',
  ].map(normalizeText).join(' ');
  return hay.includes(q);
}

function renderLessons(container, list) {
  clearEl(container);
  const frag = document.createDocumentFragment();
  list.forEach((lesson) => frag?.appendChild(createLessonCard(lesson)));
  container?.appendChild(frag);
}

function setResultMeta(el, shown, total, q) {
  if (!el) return;
  if (!q) {
    el.textContent = `Showing ${total} lessons`;
  } else {
    el.textContent = `Results: ${shown} of ${total}`;
  }
}


// ---------- Featured slider (index hero) ----------
function buildFeaturedSlider(lessons){
  const slider = document.getElementById('featuredSlider');
  const track = document.getElementById('featuredSliderTrack');
  if(!slider || !track || !Array.isArray(lessons) || !lessons.length) return;

  // pick up to 6 lessons: early ones are usually curated
  const picks = lessons.slice(0, Math.min(6, lessons.length));

  // clear
  track.innerHTML = '';

  for(const l of picks){
    const slide = document.createElement('div');
    slide.className = 'pro-slider__slide';
    slide.setAttribute('data-slide', '');

    const img = document.createElement('img');
    img.className = 'pro-slider__image';
    const { src800, src1600 } = (typeof normalizeLessonImage==='function') ? normalizeLessonImage(l) : {src800:'', src1600:''};
    img.src = src800 || '';
    if (src800 && /-800\.webp$/i.test(src800)) {
      const s1600 = src1600 || src800.replace(/-800\.webp$/i, '-1600.webp');
      img.srcset = `${src800} 800w, ${s1600} 1600w`;
      img.sizes = '(max-width: 900px) 100vw, 1200px';
    }
    img.alt = (l.title || 'Lesson');
    img.loading = 'lazy';
    img.decoding = 'async';

    const content = document.createElement('div');
    content.className = 'pro-slider__content';

    const title = document.createElement('div');
    title.className = 'pro-slider__title';
    title.textContent = l.title || '';

    const caption = document.createElement('div');
    caption.className = 'pro-slider__caption';
    caption.textContent = l.caption || '';

    const btn = document.createElement('a');
    btn.className = 'pro-slider__btn';
    btn.href = `lesson.html?id=${encodeURIComponent(l.id || '')}`;
    btn.textContent = 'Open lesson';

    content.appendChild(title);
    if (l.caption) content.appendChild(caption);
    content.appendChild(btn);

    slide.appendChild(img);
    slide.appendChild(content);

    track.appendChild(slide);
  }

  // Remove loading state so slider can measure
  slider.classList.remove('is-loading');

  // Init ProSlider after slides are in DOM (registry loads async)
  try {
    if (window.ProSlider) {
      if (slider._proSlider && typeof slider._proSlider.destroy === 'function') {
        slider._proSlider.destroy();
      }
      slider._proSlider = new window.ProSlider(slider, {
        style: (slider.dataset.sliderStyle || 'fade'),
        autoplay: (slider.dataset.sliderAutoplay !== 'false'),
        duration: parseInt(slider.dataset.sliderDuration || '5500', 10) || 5500,
      });
    }
  } catch (e) {
    console.warn('Featured slider init failed', e);
  }
}

async function loadLessons() {
  const container = document.getElementById('lessonsContainer');
  if(!container) return; // not on index page
  const searchInput = document.getElementById('searchInput');
  const resultMeta = document.getElementById('resultMeta');

  try {
    const chipContainer = document.getElementById('filterChips');

	  // Use shared fetchJSON: resolves GitHub Pages subpaths and retries transient 503s
	  const data = await (window.Utils?.fetchJSON
	    ? window.Utils.fetchJSON('assets/data/registry.json', { cache: 'no-store' })
	    : (await (await fetch('assets/data/registry.json', { cache: 'no-store' })).json()));
    const lessons = Array.isArray(data) ? data : (data && Array.isArray(data.lessons) ? data.lessons : []);

	  // Home hero slider uses lesson images; slides are generated from registry.
	  buildFeaturedSlider(lessons);

    let query = '';
    let filterTag = '';

    const applyFilter = () => {
      const q = normalizeText(query);
      const filtered = lessons
        .filter((l) => matchLesson(l, q))
        .filter((l) => {
          if (!filterTag) return true;
          const tags = Array.isArray(l.tags) ? l.tags : [];
          return tags.includes(filterTag);
        });
      renderLessons(container, filtered);
      setResultMeta(resultMeta, filtered.length, lessons.length, q);
    };

    // build chips from tags
    if (chipContainer) {
      const tags = topTags(lessons, 14);
      renderChips(chipContainer, tags);
      chipContainer.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.chip') : null;
        if (!btn) return;
        filterTag = btn.dataset.tag || '';
        setActiveChip(chipContainer, filterTag);
        applyFilter();
      });
    }

    // initial render
    applyFilter();

    // Enrich cards with more detailed stats (vocab/practice/etc.)
    enrichLessonsWithStats(lessons).then(() => {
      // Update currently rendered cards in-place
      lessons.forEach((l) => {
        if (!l || !l.id || !l._stats) return;
        const esc = (window.CSS && CSS.escape) ? CSS.escape(l.id) : l.id;
        const card = document.querySelector(`.lesson-card[data-lesson-id="${esc}"]`);
        if (!card) return;
        updateLessonCardPills(card, l._stats);
      });
    });

    // search
    if (searchInput) {
      let t = null;
      searchInput.addEventListener('input', (e) => {
        query = e.target.value || '';
        clearTimeout(t);
        t = setTimeout(applyFilter, 120);
      });
    }
  } catch (err) {
    console.error(err);
    container?.replaceChildren(makeEl('p', null, "\u062e\u0637\u0627 \u062f\u0631 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0641\u0647\u0631\u0633\u062a \u062f\u0631\u0633\u200c\u0647\u0627. \u0644\u0637\u0641\u0627\u064b \u0627\u062a\u0635\u0627\u0644 \u0627\u06cc\u0646\u062a\u0631\u0646\u062a \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc\u062f."));
  }
}

document.addEventListener('DOMContentLoaded', loadLessons);
