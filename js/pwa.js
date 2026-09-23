const INSTALL_EVENT = "idesuss:pwa-install-available";

let deferredInstallPrompt = null;

function setInstallState(state) {
  const target = document.getElementById("installStatus");
  if (!target) return;

  target.dataset.pwaState = state;
  const label = target.querySelector("span:last-child") || target;

  const texts = {
    installed: "PWA telepítve",
    available: "PWA telepíthető",
    ready: "PWA kész",
    unsupported: "PWA nem támogatott"
  };

  if (texts[state]) label.textContent = texts[state];
  target.classList.toggle("status-ok", ["installed", "available", "ready"].includes(state));
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export async function registerIdesussPwa() {
  if (!("serviceWorker" in navigator)) {
    setInstallState("unsupported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    setInstallState(isStandalone() ? "installed" : "ready");
    return registration;
  } catch (error) {
    console.error("Idesüss service worker registration failed", error);
    setInstallState("unsupported");
    return null;
  }
}

export function initPwaInstallSignals() {
  if (isStandalone()) setInstallState("installed");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallState("available");
    window.dispatchEvent(new CustomEvent(INSTALL_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallState("installed");
  });
}

export async function promptIdesussInstall() {
  if (!deferredInstallPrompt) return { available: false, outcome: null };
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return { available: true, outcome: choice?.outcome || null };
}

initPwaInstallSignals();
registerIdesussPwa();
