/* TTS Read Aloud (Web Speech API)
 * - English-first: excludes hidden Persian/RTL nodes from speech text
 * - Robust voice selection (waits for voiceschanged)
 * - Stops speech on navigation/visibility changes
 */
(function(){
  const hasAPI = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = hasAPI ? window.speechSynthesis : null;

  const state = {
    voicesReady: false,
    voices: [],
    voice: null,
    current: null,      // { utterance, bar }
    isPaused: false,
    lastText: ''
  };

  function normalizeText(s){
    return String(s||'').replace(/\s+/g,' ').trim();
  }

  function pickEnglishVoice(voices){
    if(!voices || !voices.length) return null;
    // Prefer local English voices, then en-US, then any English
    const english = voices.filter(v => (v.lang||'').toLowerCase().startsWith('en'));
    if(!english.length) return null;

    const local = english.filter(v => v.localService);
    const prefer = local.length ? local : english;

    const enUS = prefer.find(v => (v.lang||'').toLowerCase() === 'en-us');
    if(enUS) return enUS;

    // Some systems use en_US or en-GB etc
    const enLikeUS = prefer.find(v => (v.lang||'').toLowerCase().includes('us'));
    if(enLikeUS) return enLikeUS;

    const enGB = prefer.find(v => (v.lang||'').toLowerCase() === 'en-gb');
    if(enGB) return enGB;

    return prefer[0];
  }

  function refreshVoices(){
    if(!hasAPI) return;
    const voices = synth.getVoices ? synth.getVoices() : [];
    state.voices = voices || [];
    state.voice = pickEnglishVoice(state.voices);
    state.voicesReady = !!(state.voices && state.voices.length);
  }

  function ensureVoicesReady(cb){
    if(!hasAPI){ cb && cb(); return; }

    refreshVoices();
    if(state.voicesReady){
      cb && cb();
      return;
    }

    // Some browsers populate voices asynchronously
    let done = false;
    const onChanged = () => {
      if(done) return;
      refreshVoices();
      if(state.voicesReady){
        done = true;
        synth.removeEventListener && synth.removeEventListener('voiceschanged', onChanged);
        cb && cb();
      }
    };

    // voiceschanged may fire multiple times
    try { synth.addEventListener && synth.addEventListener('voiceschanged', onChanged); } catch(e){}

    // Fallback timeout
    setTimeout(() => {
      if(done) return;
      refreshVoices();
      done = true;
      try { synth.removeEventListener && synth.removeEventListener('voiceschanged', onChanged); } catch(e){}
      cb && cb();
    }, 1200);
  }

  function stop(){
    if(!hasAPI) return;
    // Cancel speech and clear highlight for the last spoken section (if any)
    try{ synth.cancel(); }catch(e){}
    try{
      if(state.current && state.current.ctx && state.current.ctx.section){
        clearHighlights(state.current.ctx.section);
      }
    }catch(e){}
    try{
      if(state.current && state.current.bar){
        state.current.bar.classList.remove('isSpeaking','isPaused');
        setBtnState(state.current.bar, { speaking:false, paused:false });
      }
    }catch(e){}
    state.current = null;
    state.isPaused = false;
  }

  function pause(){
    if(!hasAPI) return;
    if(!synth.speaking) return;
    try { synth.pause(); } catch(e){}
    state.isPaused = true;
    if(state.current && state.current.bar){
      state.current.bar.classList.add('isPaused');
      state.current.bar.classList.remove('isSpeaking');
      setBtnState(state.current.bar, { speaking:false, paused:true });
    }
  }

  function resume(){
    if(!hasAPI) return;
    if(!synth.paused) return;
    try { synth.resume(); } catch(e){}
    state.isPaused = false;
    if(state.current && state.current.bar){
      state.current.bar.classList.remove('isPaused');
      state.current.bar.classList.add('isSpeaking');
      setBtnState(state.current.bar, { speaking:true, paused:false });
    }
  }

  function speak(text, bar, ctx){
    if(!hasAPI) return;
    const clean = (ctx && ctx.map && ctx.map.length) ? String(text||'').trim() : normalizeText(text);
    if(!clean){
      // Nothing to say
      bar && bar.classList.remove('isSpeaking','isPaused');
      setBtnState(bar, { speaking:false, paused:false });
      return;
    }

    ensureVoicesReady(() => {
      // Cancel any previous speech
      stop();

      const u = new SpeechSynthesisUtterance(clean);
      u.lang = (state.voice && state.voice.lang) ? state.voice.lang : 'en-US';
      if(state.voice) u.voice = state.voice;

      // Conservative defaults (sound natural across engines)
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;

      u.onstart = () => {
        state.current = { utterance: u, bar, ctx: ctx||null };
        state.isPaused = false;
        if(bar){
          bar.classList.add('isSpeaking');
          bar.classList.remove('isPaused');
          setBtnState(bar, { speaking:true, paused:false });
        }
      };
      u.onend = () => {
      try{ if(ctx && ctx.section) clearHighlights(ctx.section); }catch(e){}
        if(bar){
          bar.classList.remove('isSpeaking','isPaused');
          setBtnState(bar, { speaking:false, paused:false });
        }
        state.current = null;
        state.isPaused = false;
      };
      u.onerror = () => {
        if(bar){
          bar.classList.remove('isSpeaking','isPaused');
          setBtnState(bar, { speaking:false, paused:false });
        }
        state.current = null;
        state.isPaused = false;
      };


      // Word-by-word highlight (best-effort): requires onboundary support from the active voice/engine.
      if(ctx && ctx.map && ctx.map.length){
        u.onboundary = (ev) => {
          try{
            // ev.name is often "word"; ev.charIndex points into the utterance text.
            if(typeof ev.charIndex === 'number'){
              highlightAtChar(ctx.map, ev.charIndex);
            }
          }catch(e){}
        };
      }

      state.lastText = clean;
      try { synth.speak(u); } catch(e){}
    });
  }

  function setBtnState(bar, st){
    if(!bar) return;
    const play = bar.querySelector('[data-tts="play"]');
    const pauseBtn = bar.querySelector('[data-tts="pause"]');
    const stopBtn = bar.querySelector('[data-tts="stop"]');

    const speaking = !!st.speaking;
    const paused = !!st.paused;

    if(play) play.disabled = speaking; // while speaking, you can pause/stop
    if(pauseBtn){
      pauseBtn.disabled = (!speaking && !paused);
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      pauseBtn.setAttribute('aria-label', paused ? 'Resume reading' : 'Pause reading');
    }
    if(stopBtn) stopBtn.disabled = (!speaking && !paused);
  }

  
  // --- Word highlighting support (best-effort: depends on browser onboundary support) ---
  function tokenizeForTTS(text){
    // Keep punctuation attached to words where possible; split on whitespace.
    return String(text||'').trim().split(/\s+/).filter(Boolean);
  }

  function clearHighlights(section){
    if(!section) return;
    section.querySelectorAll('.ttsWord.ttsCurrent').forEach(sp => sp.classList.remove('ttsCurrent'));
  }

  function buildSpeakMap(section){
    if(!section) return { text:'', map:[] };

    // We only speak visible English text: bilingual English paragraphs + plain <p> not marked as fa/rtl.
    const nodes = [];
    section.querySelectorAll('p.en[data-en], p[data-en], p:not(.fa):not(.rtl):not([dir="rtl"])').forEach(p => {
      if(p.classList.contains('fa') || p.classList.contains('rtl')) return;
      if(p.closest('.fa') || p.closest('[dir="rtl"]')) return;
      if(p.closest('nav') || p.closest('.ttsBar')) return;
      nodes.push(p);
    });

    if(!nodes.length){
      const txt = extractSpeakableText(section);
      return { text: txt, map: [] };
    }

    // Wrap words once
    nodes.forEach((p) => {
      if(p.__ttsPrepared) return;
      p.__ttsPrepared = true;

      const raw = (p.textContent || '').replace(/\s+/g,' ').trim();
      const tokens = tokenizeForTTS(raw);
      p.textContent = '';
      tokens.forEach((tok, wi) => {
        const sp = document.createElement('span');
        sp.className = 'ttsWord';
        sp.textContent = tok;
        p.appendChild(sp);
        if(wi < tokens.length - 1) p.appendChild(document.createTextNode(' '));
      });
    });

    // Build text + char map
    let fullText = '';
    const map = [];
    nodes.forEach((p) => {
      const spans = Array.from(p.querySelectorAll('span.ttsWord'));
      spans.forEach((sp) => {
        const tok = sp.textContent || '';
        const start = fullText.length;
        fullText += tok;
        const end = fullText.length;
        map.push({ span: sp, start, end });
        fullText += ' ';
      });
      fullText += '\n';
    });

    return { text: (fullText||'').trim(), map };
  }

  function highlightAtChar(map, charIndex){
    if(!map || !map.length) return;
    let current = null;

    for(let i=0;i<map.length;i++){
      const it = map[i];
      if(charIndex >= it.start && charIndex < it.end){ current = it; break; }
    }
    if(!current){
      for(let i=map.length-1;i>=0;i--){
        const it = map[i];
        if(charIndex >= it.start){ current = it; break; }
      }
    }
    if(!current) return;

    map.forEach(it => it.span.classList.remove('ttsCurrent'));
    current.span.classList.add('ttsCurrent');
    current.span.scrollIntoView({ block:'nearest', inline:'nearest' });
  }
function extractSpeakableText(section){
    if(!section) return '';
    // Clone and strip UI + Persian/RTL bits
    const clone = section.cloneNode(true);

    // Remove the TTS bar itself + any buttons
    clone.querySelectorAll('.ttsBar, button, nav, .toc-chips').forEach(el => el.remove());

    // Remove hidden Persian nodes commonly used in this project
    clone.querySelectorAll('.faHidden, .exFa, .fa, .rtl, [dir="rtl"]').forEach(el => el.remove());

    // Remove any elements explicitly marked as hidden for accessibility
    clone.querySelectorAll('[aria-hidden="true"]').forEach(el => el.remove());

    return normalizeText(clone.textContent || '');
  }

  function buildBar(){
    const bar = document.createElement('div');
    bar.className = 'ttsBar';
    bar.innerHTML = `
      <button type="button" class="btn ttsBtn" data-tts="play" aria-label="Read aloud">Play</button>
      <button type="button" class="btn ttsBtn" data-tts="pause" aria-label="Pause reading" disabled>Pause</button>
      <button type="button" class="btn ttsBtn" data-tts="stop" aria-label="Stop reading" disabled>Stop</button>
      <span class="ttsNote">Read aloud (English)</span>
    `;
    setBtnState(bar, { speaking:false, paused:false });
    return bar;
  }

  function attachToSection(section){
    if(!section || section.__ttsAttached) return;
    section.__ttsAttached = true;

    const bar = buildBar();

    // Insert after heading if present
    const heading = section.querySelector('h2,h3,h4');
    if(heading && heading.parentNode === section){
      heading.insertAdjacentElement('afterend', bar);
    }else{
      section.insertAdjacentElement('afterbegin', bar);
    }

    if(!hasAPI){
      bar.querySelectorAll('button').forEach(b => b.disabled = true);
      const note = bar.querySelector('.ttsNote');
      if(note) note.textContent = 'Read aloud not supported in this browser';
      return;
    }

    const play = bar.querySelector('[data-tts="play"]');
    const pauseBtn = bar.querySelector('[data-tts="pause"]');
    const stopBtn = bar.querySelector('[data-tts="stop"]');

    play && play.addEventListener('click', () => {
      clearHighlights(section);
      const built = buildSpeakMap(section);
      speak(built.text, bar, { section, map: built.map });
    });

    pauseBtn && pauseBtn.addEventListener('click', () => {
      if(!hasAPI) return;
      if(synth.paused) resume();
      else pause();
    });

    stopBtn && stopBtn.addEventListener('click', () => stop());
  }

  // Stop speech when navigating away or hiding tab
  function wireGlobalStops(){
    if(!hasAPI) return;
    window.addEventListener('pagehide', stop, { passive:true });
    window.addEventListener('beforeunload', stop, { passive:true });
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) stop();
    }, { passive:true });
  }

  wireGlobalStops();

  // Public API
  window.TTS = {
    supported: hasAPI,
    attachToSection,
    stop,
    pause,
    resume
  };
})();
