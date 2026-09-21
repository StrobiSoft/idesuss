import {
  APPROVED_AVATAR_EMOJIS,
  getCurrentUser,
  loadMyAvatarSubmissions,
  loadMyProfile,
  saveMyProfile,
  subscribeToMyProfile,
  uploadAvatarSubmission
} from "../shared/profile-service.js?v=20260920-avatar1";

let unsubscribeProfile = null;

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 6L18 18M18 6L6 18"></path>
  </svg>
`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function closeProfilePanel(panel) {
  panel?.classList.remove("show");
  panel?.setAttribute("aria-hidden", "true");
}

function bindClose(panel) {
  document.getElementById("closeProfilePanel")?.addEventListener("click", () => closeProfilePanel(panel));
}

function submissionStatusText(submissions = []) {
  const latest = submissions[0];
  if (!latest) return "";
  if (latest.status === "pending") return "A legutóbbi saját képed ellenőrzésre vár.";
  if (latest.status === "approved") return "A legutóbbi saját képed jóváhagyva.";
  if (latest.status === "rejected") return "A legutóbbi saját kép nem került jóváhagyásra.";
  return "";
}

async function renderProfile(panel, profile, user) {
  const nickname = profile?.nickname || "";
  const avatar = APPROVED_AVATAR_EMOJIS.includes(profile?.avatar_emoji) ? profile.avatar_emoji : "🙂";
  const visibility = profile?.email_visibility || "hidden";
  let submissions = [];

  try {
    submissions = await loadMyAvatarSubmissions(window.supabaseClient);
  } catch (error) {
    console.error("Avatar submission status load failed", error);
  }

  panel.innerHTML = `
    <div class="profile-panel-card" role="dialog" aria-modal="true" aria-labelledby="profilePanelTitle">
      <button id="closeProfilePanel" class="profile-panel-close icon-close-btn" type="button" aria-label="Bezárás" title="Bezárás">
        ${CLOSE_ICON}
      </button>
      <h2 id="profilePanelTitle">Profil</h2>
      <p>Ugyanez a profil használható a főoldalon, a webappban és később a natív alkalmazásban is.</p>

      <div class="profile-placeholder">
        <strong>Fiók</strong>
        <span>${escapeHtml(user?.email || "")}</span>
      </div>

      <div class="profile-placeholder profile-avatar-section">
        <strong>Avatar</strong>
        <div class="profile-avatar-current" aria-live="polite">
          <span id="profileAvatarPreview" class="profile-avatar-preview" aria-hidden="true">${escapeHtml(avatar)}</span>
          <button id="toggleAvatarPicker" class="profile-avatar-open" type="button" aria-expanded="false" aria-controls="profileAvatarPicker">
            Avatar választása
          </button>
        </div>

        <div id="profileAvatarPicker" class="profile-avatar-picker" hidden>
          <div class="profile-avatar-grid" role="list" aria-label="Választható avatárok">
            ${APPROVED_AVATAR_EMOJIS.map((emoji) => `
              <button
                class="profile-avatar-choice${emoji === avatar ? " selected" : ""}"
                type="button"
                data-avatar="${escapeHtml(emoji)}"
                aria-label="Avatar: ${escapeHtml(emoji)}"
                aria-pressed="${emoji === avatar ? "true" : "false"}"
              >${escapeHtml(emoji)}</button>
            `).join("")}
          </div>

          <button id="openAvatarUpload" class="profile-avatar-upload-link" type="button">Saját kép feltöltése</button>
          <input id="profileAvatarFile" type="file" accept="image/jpeg,image/png,image/webp" hidden />
          <p class="profile-avatar-rule">
            Saját kép csak ellenőrzés után válhat nyilvános avatárrá. Pornográf, szexuálisan explicit vagy intim testrészeket szándékosan feltáró kép nem engedélyezett.
            <a href="/rules/" target="_blank" rel="noopener">Házirend</a>
          </p>
          <div id="avatarUploadMessage" class="profile-avatar-status" aria-live="polite">${escapeHtml(submissionStatusText(submissions))}</div>
        </div>

        <input id="profileAvatar" type="hidden" value="${escapeHtml(avatar)}" />
      </div>

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

  bindClose(panel);

  const picker = document.getElementById("profileAvatarPicker");
  const toggle = document.getElementById("toggleAvatarPicker");
  toggle?.addEventListener("click", () => {
    const willOpen = picker?.hidden !== false;
    if (picker) picker.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.querySelectorAll(".profile-avatar-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.avatar || "🙂";
      const input = document.getElementById("profileAvatar");
      const preview = document.getElementById("profileAvatarPreview");
      if (input) input.value = next;
      if (preview) preview.textContent = next;

      document.querySelectorAll(".profile-avatar-choice").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    });
  });

  const fileInput = document.getElementById("profileAvatarFile");
  document.getElementById("openAvatarUpload")?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const message = document.getElementById("avatarUploadMessage");
    if (message) message.textContent = "Feltöltés…";

    try {
      await uploadAvatarSubmission(window.supabaseClient, file);
      if (message) {
        message.textContent = "A kép feltöltve. Ellenőrzésig nem jelenik meg nyilvános avatárként.";
      }
      fileInput.value = "";
    } catch (error) {
      console.error("Avatar upload failed", error);
      if (message) {
        if (error?.code === "AVATAR_SIZE") message.textContent = "A kép legfeljebb 2 MB lehet.";
        else if (error?.code === "AVATAR_TYPE") message.textContent = "Csak JPEG, PNG vagy WebP kép tölthető fel.";
        else message.textContent = "A kép feltöltése nem sikerült.";
      }
    }
  });

  document.getElementById("saveProfilePanel")?.addEventListener("click", async () => {
    const message = document.getElementById("profilePanelMessage");
    if (message) message.textContent = "Mentés…";

    try {
      const saved = await saveMyProfile(window.supabaseClient, {
        nickname: document.getElementById("profileNickname")?.value.trim() || "",
        avatar_emoji: document.getElementById("profileAvatar")?.value || "🙂",
        email_visibility: document.getElementById("profileEmailVisibility")?.value || "hidden"
      });

      window.dispatchEvent(new CustomEvent("idesuss:profile-saved", {
        detail: { nickname: saved?.nickname || "" }
      }));

      if (message) message.textContent = "Profil mentve.";
      await renderProfile(panel, saved, user);
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

function renderPanelState(panel, body) {
  panel.innerHTML = `
    <div class="profile-panel-card" role="dialog" aria-modal="true" aria-labelledby="profilePanelTitle">
      <button id="closeProfilePanel" class="profile-panel-close icon-close-btn" type="button" aria-label="Bezárás" title="Bezárás">
        ${CLOSE_ICON}
      </button>
      <h2 id="profilePanelTitle">Profil</h2>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
  bindClose(panel);
}

export async function openProfilePanel() {
  let panel = document.getElementById("profilePanel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "profilePanel";
    panel.setAttribute("aria-hidden", "true");
    document.body.appendChild(panel);

    panel.addEventListener("click", (event) => {
      if (event.target === panel) closeProfilePanel(panel);
    });
  }

  panel.classList.add("show");
  panel.setAttribute("aria-hidden", "false");
  renderPanelState(panel, "Betöltés…");

  try {
    const user = await getCurrentUser(window.supabaseClient);

    if (!user) {
      renderPanelState(panel, "A profil megnyitásához előbb jelentkezz be.");
      return;
    }

    const profile = await loadMyProfile(window.supabaseClient);
    await renderProfile(panel, profile, user);

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
    renderPanelState(panel, "A profil betöltése nem sikerült.");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProfilePanel(document.getElementById("profilePanel"));
  }
});
