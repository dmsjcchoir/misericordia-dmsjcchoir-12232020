importScripts('./songs.js');

const CACHE_NAME = 'misericordia-v1.0.0';

const IS_LOCAL_DEV =
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === 'localhost';

const SONG_ASSETS = (typeof RAW_SONGS !== 'undefined' ? RAW_SONGS : []).flatMap(
  ([id, , , , , hasSheet = true]) => {
    const files = [`assets/lyrics/${id}.html`];
    if (hasSheet) {
      files.push(`assets/sheets/${id}.html`);
    }
    return files;
  }
);

const RELATIVE_ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'songs.js',
  'manifest.json',
  'assets/choir-logo-2024.png',
  'assets/Newsreader-VariableFont_opsz,wght.ttf',
  'assets/Newsreader-Italic-VariableFont_opsz,wght.ttf',
  'assets/icons/icon192x192.png',
  'assets/icons/icon512x512.png',
  ...SONG_ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const path of RELATIVE_ASSETS) {
        const fullUrl = new URL(path, self.registration.scope).href;
        try {
          const response = await fetch(fullUrl, { cache: 'reload' });
          if (response.ok) {
            await cache.put(fullUrl, response);
          } else {
            console.warn('Skipped precaching (HTTP ' + response.status + '):', fullUrl);
          }
        } catch (err) {
          console.warn('Skipped precaching (network error):', fullUrl, err);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, copy);
    }
    return response;
  } catch (err) {
    return new Response('Offline — this content is not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(request) {
  try {
    const fetchRequest = IS_LOCAL_DEV
      ? new Request(request, { cache: 'no-store' })
      : request;
    const response = await fetch(fetchRequest);

    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, copy);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    return new Response('Offline — this content is not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // In local dev (Live Server), always try network first so edits appear immediately,
  // and fall back to cache when offline.
  if (IS_LOCAL_DEV) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // In production, use network-first for navigation/HTML/JS/CSS so updates land cleanly,
  // and cache-first for static assets (lyrics, sheets, fonts, images).
  const isCodeOrDoc =
    event.request.mode === 'navigate' ||
    /\.(?:html|js|css|json)$/i.test(url.pathname);

  if (isCodeOrDoc) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});