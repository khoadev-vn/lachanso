self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  if (req.url.includes('/api/')) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (req.url.includes('/assets/') || req.url.includes('/logo'))) {
          const clone = res.clone();
          caches.open('lachanso-v1').then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});