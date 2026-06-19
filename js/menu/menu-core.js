import { openProfilePanel } from "./profile.js";

document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("idesussMenu");

  if (!menu) return;

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
});