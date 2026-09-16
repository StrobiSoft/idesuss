import {
  getCurrentUser,
  loadMyProfile,
  saveMyProfile,
  subscribeToMyProfile
} from "../shared/profile-service.js";

let unsubscribeProfile = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderProfile(panel, profile, user) {
  const nickname = profile?.nickname || "";
  const avatar = profile?.avatar_emoji || "🙂";
  const visibility = profile?.email_visibility || "hidden";

  panel.innerHTML = `
    <div class="profile-panel-card">
      <button id="closeProfilePanel" class="profile-panel-close" type="button">×</button>
      <h2>Profil</h2>
      <p>Ugyanez a profil használható a főoldalon, a webappban és később a natív alkalmazásban is.</p>

      <div class="profile-placeholder">
        <strong>Fiók</strong>
        <span>${escapeHtml(user?.email || "")}</span>
      </div>

      <label class="profile-placeholder">
        <strong>Avatar</strong>
        <input id="profileAvatar" type="text" maxlength="8" value="${escapeHtml(avatar)}" aria-label="Avatar" />
      </label>

      <label class="profile-placeholder">
        <strong>Becenév</strong>
        <input id="profileNickname" type="text" maxlength="40" value="${escapeHtml(nickname)}" autocomplete="nickname" />
      </label>

      <label class="profile-placeholder">
        <strong>E-mail láthatóság</strong>
        <select id="profileEmailVisibility">
          <option value="hidden"${visibility === "hidden" ? " selected" : ""}>Rejtett</option>
          <option value="masked"${visibility === "masked" ? " selected" : ""}>Maszkolt</option>
          <option value="public"${visibility === "public" ? " selected" : ""}>Nyilvános</option>
        </select>
      </label>

      <button id="saveProfilePanel" class="menu-profile-btn" type="button">Profil mentése</button>
      <div id="profilePanelMessage" class="profile-placeholder" aria-live="polite"></div>
    </div>
  `;

  document.getElementById("closeProfilePanel")?.addEventListener("click", () => {
    panel.classList.remove("show");
  });

  document.getElementById("saveProfilePanel")?.addEventListener("click", async () => {
    const message = document.getElementById("profilePanelMessage");
    if (message) message.textContent = "Mentés…";

    try {
      const saved = await saveMyProfile(window.supabaseClient, {
        nickname: document.getElementById("profileNickname")?.value.trim() || "",
        avatar_emoji: document.getElementById("profileAvatar")?.value.trim() || "🙂",
        email_visibility: document.getElementById("profileEmailVisibility")?.value || "hidden"
      });

      window.dispatchEvent(new CustomEvent("idesuss:profile-saved", {
        detail: { nickname: saved?.nickname || "" }
      }));

      if (message) message.textContent = "Profil mentve.";
      renderProfile(panel, saved, user);
    } catch (error) {
      console.error("Profile save failed", error);
      if (message) {
        message.textContent = error?.code === "TAKEN"
          ? "Ez a becenév már használatban van."
          : "A profil mentése nem sikerült.";
      }
    }
  });
}

export async function openProfilePanel() {
  let panel = document.getElementById("profilePanel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "profilePanel";
    document.body.appendChild(panel);
  }

  panel.classList.add("show");
  panel.innerHTML = `
    <div class="profile-panel-card">
      <button id="closeProfilePanel" class="profile-panel-close" type="button">×</button>
      <h2>Profil</h2>
      <p>Betöltés…</p>
    </div>
  `;

  document.getElementById("closeProfilePanel")?.addEventListener("click", () => {
    panel.classList.remove("show");
  });

  try {
    const user = await getCurrentUser(window.supabaseClient);

    if (!user) {
      panel.innerHTML = `
        <div class="profile-panel-card">
          <button id="closeProfilePanel" class="profile-panel-close" type="button">×</button>
          <h2>Profil</h2>
          <p>A profil megnyitásához előbb jelentkezz be.</p>
        </div>
      `;
      document.getElementById("closeProfilePanel")?.addEventListener("click", () => {
        panel.classList.remove("show");
      });
      return;
    }

    const profile = await loadMyProfile(window.supabaseClient);
    renderProfile(panel, profile, user);

    if (unsubscribeProfile) unsubscribeProfile();
    unsubscribeProfile = subscribeToMyProfile(window.supabaseClient, user.id, (nextProfile) => {
      window.dispatchEvent(new CustomEvent("idesuss:profile-saved", {
        detail: { nickname: nextProfile?.nickname || "" }
      }));
      if (panel.classList.contains("show")) {
        renderProfile(panel, nextProfile, user);
      }
    });
  } catch (error) {
    console.error("Profile load failed", error);
    panel.innerHTML = `
      <div class="profile-panel-card">
        <button id="closeProfilePanel" class="profile-panel-close" type="button">×</button>
        <h2>Profil</h2>
        <p>A profil betöltése nem sikerült.</p>
      </div>
    `;
    document.getElementById("closeProfilePanel")?.addEventListener("click", () => {
      panel.classList.remove("show");
    });
  }
}
