export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // Buat URL absolut ke service worker relatif terhadap lokasi modul saat ini.
      // Ini adalah cara paling tangguh untuk menghindari masalah lintas-domain di lingkungan iframe.
      const swUrl = new URL('sw.js', import.meta.url);
      navigator.serviceWorker
        .register(swUrl, { scope: './' })
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    });
  }
}
