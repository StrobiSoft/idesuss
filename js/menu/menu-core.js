import { initRootAuthController } from "./auth-controller.js?v=20260924-vip-presence1";
import { openProfilePanel } from "./profile.js?v=20260923-eula1";
import { initSettingsPreferences, openSettingsPanel } from "./settings.js?v=20260923-finalweb1";


function registerRootServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .catch((error) => console.error("Root service worker registration failed", error));
  }, { once: true });
}

function initFloatingMenu() {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("idesussMenu");
  const openWebappBtn = document.getElementById("openWebappBtn");
  const openRulesBtn = document.getElementById("openRulesBtn");
  const openAdminPanelBtn = document.getElementById("openAdminPanelBtn");
  const openMessagesBtn = document.getElementById("openMessagesBtn");
  const openIdeaBoxBtn = document.getElementById("openIdeaBoxBtn");
  const openSettingsBtn = document.getElementById("openSettingsBtn");

  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.style.display = open ? "flex" : "none";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  toggle.setAttribute("aria-controls", "idesussMenu");
  toggle.setAttribute("aria-expanded", "false");

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(menu.style.display !== "flex");
  });

  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  openWebappBtn?.addEventListener("click", () => {
    window.location.href = "/app/";
  });

  openRulesBtn?.addEventListener("click", () => {
    window.location.href = "/rules/";
  });

  openAdminPanelBtn?.addEventListener("click", () => {
    window.location.href = "/admin/";
  });

  openMessagesBtn?.addEventListener("click", () => {
    window.location.href = "/messages/";
  });

  openIdeaBoxBtn?.addEventListener("click", () => {
    window.location.href = "/ideas/";
  });

  openSettingsBtn?.addEventListener("click", () => {
    openSettingsPanel();
  });

  menu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      setOpen(false);
    });
  });
}

function handleRequestedPanel() {
  const hash = window.location.hash.toLowerCase();

  if (hash === "#profile") {
    openProfilePanel();
    return;
  }

  if (hash === "#login") {
    window.setTimeout(() => {
      document.getElementById("loginBtn")?.click();
    }, 0);
  }
}

registerRootServiceWorker();

document.addEventListener("DOMContentLoaded", async () => {
  initSettingsPreferences();
  initFloatingMenu();

  const radioBtn = document.getElementById("openRadioBtn");
  radioBtn?.addEventListener("click", () => {
    window.location.href = "/radio/?autoplay=1";
  });

  const profileBtn = document.getElementById("openProfileBtn");
  profileBtn?.addEventListener("click", () => {
    openProfilePanel();
  });

  try {
    await initRootAuthController();
  } catch (error) {
    console.error("Shared root auth controller init failed", error);
  }

  handleRequestedPanel();
});

window.addEventListener("hashchange", handleRequestedPanel);
