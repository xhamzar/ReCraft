const CACHE_NAME = 'recraft-v1';
const DYNAMIC_CACHE = 'recraft-dynamic-v1';

// HANYA cache root. Jangan cache file spesifik seperti index.tsx atau index.html di sini
// karena nama filenya bisa berubah saat build atau tidak ada di server produksi.
const PRECACHE_URLS = [
  './',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tambahkan catch agar satu file gagal tidak membatalkan seluruh SW
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strategi: Stale-While-Revalidate untuk aset eksternal yang stabil
  // Network-First untuk file aplikasi lokal

  // 1. Aset Eksternal (CDN, Fonts, Three.js) - Cache First / Stale-While-Revalidate
  if (url.origin.includes('aistudiocdn.com') || 
      url.origin.includes('fonts.googleapis.com') || 
      url.origin.includes('fonts.gstatic.com') ||
      url.origin.includes('cdn.tailwindcss.com') ||
      url.origin.includes('cdn-icons-png.flaticon.com')) {
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
           if (networkResponse && networkResponse.status === 200) {
             const responseToCache = networkResponse.clone();
             caches.open(DYNAMIC_CACHE).then((cache) => {
               cache.put(event.request, responseToCache);
             });
           }
           return networkResponse;
        }).catch(() => { /* Abaikan error fetch jika offline */ });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. File Aplikasi Lokal - Network First, fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Hanya cache request sukses dan valid (bukan chrome-extension, dll)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Jika offline, cari di cache
        return caches.match(event.request);
      })
  );
});