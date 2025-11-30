const CACHE_NAME = "recraft-cache-v2";
const ASSETS = [
  "./", 
  "./index.html",
  "./manifest.json"
];

// Install Event: Cache aset inti
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Gunakan addAll dengan catch agar satu kegagalan tidak membatalkan installasi
      return cache.addAll(ASSETS).catch(err => console.warn("Precache warning:", err));
    })
  );
  self.skipWaiting();
});

// Activate Event: Bersihkan cache versi lama
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Strategi Caching
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan request non-GET atau ke scheme yang tidak didukung (seperti chrome-extension)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // 1. HTML Documents (Network First, fallback ke Cache)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2. Aset Lainnya (Cache First)
  event.respondWith(
    caches.match(request).then(cached => {
      return (
        cached ||
        fetch(request).then(res => {
          // Hanya cache respon sukses (200) dan valid
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
             const clone = res.clone();
             caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return res;
        }).catch(() => {
           // Opsional: Return placeholder image jika fetch gambar gagal
        })
      );
    })
  );
});