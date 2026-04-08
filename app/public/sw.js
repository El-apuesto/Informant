// /service-worker.js

const CACHE_NAME = 'n4mint-v2';
const STATIC_CACHE = 'n4mint-static-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/static/logo.png',
];

// INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  const whitelist = [CACHE_NAME, STATIC_CACHE];

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!whitelist.includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle navigation (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            );
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Handle assets (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            request.method === 'GET' &&
            request.url.startsWith(self.location.origin)
          ) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            );
          }
          return response;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    })
  );
});
