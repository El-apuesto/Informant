// Service Worker for caching and performance
const CACHE_NAME = 'n4mint-v1';
const STATIC_CACHE = 'n4mint-static-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/logo.png',
  'https://fonts.googleapis.com/css2?family=Audiowide&family=Share+Tech+Mono&display=swap'
];

// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // iOS FIX: Bypass Service Worker for large uploads to avoid memory crash
  if (isIOS && (request.method === 'POST' || request.method === 'PUT')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return; // Let browser handle natively - prevents "Load failed" error
    }
  }
  
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
