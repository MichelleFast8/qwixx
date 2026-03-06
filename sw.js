const CACHE_NAME = 'qwixx-v13';
const ASSETS = [
  '/qwixx/',
  '/qwixx/index.html',
  '/qwixx/css/styles.css',
  '/qwixx/js/app.js',
  '/qwixx/js/game.js',
  '/qwixx/js/dice.js',
  '/qwixx/js/ui.js',
  '/qwixx/manifest.json',
  '/qwixx/assets/icons/icon-192.svg',
  '/qwixx/assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
