export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js") // Gunakan path relatif
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    });
  }
}
