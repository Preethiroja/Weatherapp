const CACHE_NAME = 'pro-weather-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  // add icons if present
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Simple strategy: try network, fallback to cache
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  } else {
    // For external (API) requests, try network then cache a generic fallback
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
  }
});