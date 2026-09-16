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
  const menu = document.getElementById("idesussMenu");

  if (menu) {
    let profileBtn = document.getElementById("profileMenuBtn");

    if (!profileBtn) {
      profileBtn = document.createElement("button");
      profileBtn.id = "profileMenuBtn";
      profileBtn.type = "button";
      profileBtn.textContent = "Profil";
      profileBtn.className = "menu-profile-btn";

      menu.prepend(profileBtn);
    }

    profileBtn.addEventListener("click", () => {
      openProfilePanel();
    });
  }

  try {
    await initRootAuthController();
  } catch (error) {
    console.error("Shared root auth controller init failed", error);
  }

  handleRequestedPanel();
});

window.addEventListener("hashchange", handleRequestedPanel);
