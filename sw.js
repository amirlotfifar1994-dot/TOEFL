/* Service worker for TOEFL Academic PWA
   - Scope-aware paths so it works on subdirectory hosting (e.g. GitHub Pages)
*/

const CACHE_VERSION = '6.27.7';
const CACHE_NAME = `toefl-academic-${CACHE_VERSION}`;

// Resolve base path (scope) for subdirectory hosting
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.replace(/\/$/, ''); // e.g. "" or "/myapp"

const withBase = (path) => `${BASE_PATH}/${path.replace(/^\//,'')}`;

// Assets that are essential for the app shell. Cached during install.
const CORE_ASSETS = [
  withBase('index.html'),
  withBase('dictionary.html'),
  withBase('lesson.html'),
  withBase('grammar.html'),
  withBase('exercise.html'),
  withBase('word.html'),
  withBase('collocation.html'),
  withBase('about.html'),
  withBase('settings.html'),
  withBase('offline.html'),
  withBase('manifest.json'),
  withBase('css/base.css'),
  withBase('css/components.css'),
  withBase('css/custom.css'),
  withBase('css/theme-pro.css'),
  withBase('css/luxe.css'),
  withBase('css/theme-nebula.css'),
  withBase('css/patch-v6.css'),
  withBase('css/patch-v19.css'),
  withBase('css/patch-v21.css'),
  withBase('css/patch-v23.css'),
  withBase('css/patch-v28.css'),
  withBase('css/patch-v29.css'),
  withBase('css/patch-v30.css'),
  withBase('css/patch-v31.css'),
  withBase('css/patch-v32.css'),
  withBase('css/patch-v33.css'),
  withBase('css/patch-v35.css'),
  withBase('css/slider-pro.css'),
  withBase('js/main.js'),
  withBase('js/dictionary.js'),
  withBase('js/offline.js'),
  withBase('js/lesson.js'),
  withBase('js/tts.js'),
  withBase('js/grammar.js'),
  withBase('js/exercise.js'),
  withBase('js/speaking.js'),
  withBase('js/theme.js'),
  withBase('js/image-loader.js'),
  withBase('js/bilingual.js'),
  withBase('js/word.js'),
  withBase('js/collocation.js'),
  withBase('assets/data/registry.json'),
  withBase('assets/data/lexicon.json'),
  withBase('assets/data/lexicon_updated.json'),
  withBase('assets/data/word_context_index.json'),
  withBase('assets/data/dict_en_subset.json'),
  withBase('assets/data/collocations_index.json'),
  withBase('assets/images/placeholders.json'),
  withBase('assets/icons/icon-192.png'),
  withBase('assets/icons/icon-512.png'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key.startsWith('toefl-academic-') && key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;

  const isUnder = (pfx) => path.startsWith(`${BASE_PATH}/${pfx.replace(/^\//,'')}`);

  // Data files: stale-while-revalidate
  if (isUnder('assets/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })());
    return;
  }

  // Images: cache-first
  if (isUnder('assets/images/') || isUnder('assets/icons/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      } catch {
        return caches.match(withBase('offline.html'));
      }
    })());
    return;
  }

  // Navigation: network-first, fallback to cache, then offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match(withBase('offline.html'));
      }
    })());
    return;
  }

  // Default: cache falling back to network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    return cached || fetch(req);
  })());
});
