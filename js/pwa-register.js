export function registerIdesussPwa() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .catch((error) => console.error("Idesuss PWA service worker registration failed", error));
  }, { once: true });
}

registerIdesussPwa();
