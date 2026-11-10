const CACHE_NAME = 'hydratrack-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages: network first, so updates show up; fall back to cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }

  // Other files: cache first
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => new Response('', { status: 503 }))));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
    for (const w of wins) { if ('focus' in w) return w.focus(); }
    return clients.openWindow('./');
  }));
});
