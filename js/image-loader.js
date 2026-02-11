/**
 * ImageLoader: lightweight lazy-loading + blurred placeholders for static sites.
 * - Uses IntersectionObserver when available
 * - Supports data-src, data-srcset, data-sizes
 * - Applies placeholder src from assets/images/placeholders.json (generated)
 */
(function(){
  const PLACEHOLDER_URL = 'assets/images/placeholders.json';
  let phCache = null;
  let phPromise = null;

  function supportsIO(){
    return 'IntersectionObserver' in window;
  }

  function fetchPlaceholders(){
    if (phCache) return Promise.resolve(phCache);
    if (phPromise) return phPromise;
    phPromise = fetch(PLACEHOLDER_URL, {cache:'force-cache'})
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        phCache = (data && data.placeholders) ? data.placeholders : {};
        return phCache;
      })
      .catch(() => (phCache = {}));
    return phPromise;
  }

  function applyPlaceholder(img){
    const key = img.getAttribute('data-placeholder-key') || img.getAttribute('data-src') || img.getAttribute('src');
    if (!key) return;
    return fetchPlaceholders().then(map => {
      const ph = map[key];
      if (ph && !img.getAttribute('src')) img.setAttribute('src', ph);
      if (ph && img.getAttribute('src') === key) img.setAttribute('src', ph);
      if (ph) img.classList.add('is-placeholder');
    });
  }

  function loadReal(img){
    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');
    const sizes = img.getAttribute('data-sizes');
    if (srcset) img.setAttribute('srcset', srcset);
    if (sizes) img.setAttribute('sizes', sizes);
    if (src) img.setAttribute('src', src);
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('data-sizes');

    img.addEventListener('load', () => {
      img.classList.add('is-loaded');
      img.classList.remove('is-placeholder');
    }, {once:true});

    img.addEventListener('error', () => {
      img.classList.add('is-error');
    }, {once:true});
  }

  function enhance(img){
    if (!img || img.dataset.enhanced) return;
    img.dataset.enhanced = '1';
    img.decoding = 'async';
    img.loading = img.loading || 'lazy';
    img.classList.add('lazy-img');
    applyPlaceholder(img).finally(() => {
      if (!supportsIO()){
        loadReal(img);
        return;
      }
      const io = new IntersectionObserver((entries) => {
        for (const e of entries){
          if (e.isIntersecting){
            loadReal(img);
            io.disconnect();
            break;
          }
        }
      }, {rootMargin:'300px 0px'});
      io.observe(img);
    });
  }

  function enhanceAll(rootEl){
    const root = rootEl || document;
    root.querySelectorAll('img[data-src], img[data-srcset]').forEach(enhance);
  }

  window.ImageLoader = { enhance, enhanceAll, fetchPlaceholders };
})();
