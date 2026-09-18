import { initRootAuthController } from "./auth-controller.js";
import { openProfilePanel } from "./profile.js";

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
