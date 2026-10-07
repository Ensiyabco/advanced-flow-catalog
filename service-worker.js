const CACHE = 'ensiyabco-app-v2-social-20261007';
const APP_SHELL = ['./','./index.html','./products.html','./manifest.webmanifest','./offline.html','./assets/images/ensiyabco-product-placeholder-20260910.jpeg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(event.request,copy)); return response; }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./offline.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then(cache => cache.put(event.request,response.clone())); return response; })));
});