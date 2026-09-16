import { openProfilePanel } from "./profile.js";

function handleRequestedPanel() {
  const hash = window.location.hash.toLowerCase();

  if (hash === "#profile") {
    openProfilePanel();
    return;
  }

  if (hash === "#login") {
    // Keep the current GEN1 login UI as the visible consumer for now.
    // Trigger its existing click handler instead of duplicating auth UI logic.
    window.setTimeout(() => {
      document.getElementById("loginBtn")?.click();
    }, 0);
  }
}

document.addEventListener("DOMContentLoaded", () => {
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

  handleRequestedPanel();
});

window.addEventListener("hashchange", handleRequestedPanel);
