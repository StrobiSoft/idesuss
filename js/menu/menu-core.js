import { initRootAuthController } from "./auth-controller.js?v=20260920-auth2";
import { openProfilePanel } from "./profile.js?v=20260920-auth2";

function initFloatingMenu() {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("idesussMenu");
  const openWebappBtn = document.getElementById("openWebappBtn");

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

document.addEventListener("DOMContentLoaded", async () => {
  initFloatingMenu();

  const radioBtn = document.getElementById("openRadioBtn");
  radioBtn?.addEventListener("click", () => {
    window.location.href = "/radio/";
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
