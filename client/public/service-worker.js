const CACHE_NAME = 'cut-app-v1';
const VERSION = '__VERSION__'; // This will be replaced during build
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Add version to cache name
const VERSIONED_CACHE = `${CACHE_NAME}-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSIONED_CACHE).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== VERSIONED_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Listen for the skipWaiting event
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Add version check endpoint
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/version-check')) {
    event.respondWith(
      new Response(JSON.stringify({ version: VERSION }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
});
