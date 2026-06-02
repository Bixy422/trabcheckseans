const V = 'st-v3';
const PRECACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(V).then(c => {
      // Kritik dosyaları önceden cache'le
      return Promise.allSettled(PRECACHE.map(url => c.add(url).catch(() => {})));
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Font istekleri: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const cl = res.clone();
            caches.open(V).then(c => c.put(e.request, cl));
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // CDN kütüphaneleri: cache-first
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const cl = res.clone();
            caches.open(V).then(c => c.put(e.request, cl));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Uygulama dosyaları: network-first, offline fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type !== 'opaque') {
        const cl = res.clone();
        caches.open(V).then(c => c.put(e.request, cl));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
