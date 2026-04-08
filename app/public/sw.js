// Service Worker for caching and performance
const CACHE_NAME = 'n4mint-v1';
const STATIC_CACHE = 'n4mint-static-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/logo.png',
  'https://fonts.googleapis.com/css2?family=Audiowide&family=Share+Tech+Mono&display=swap'
];

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
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '');
  
  if (isIOS && (request.method === 'POST' || request.method === 'PUT')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return;
    }
  }
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200 && request.method === 'GET') {
          const responseClone = networkResponse.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
              return cache.put(request, responseClone);
            })
          );
        }
        return networkResponse;
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
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
