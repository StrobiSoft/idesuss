import {
  APPROVED_AVATAR_EMOJIS,
  STAFF_AVATAR_EMOJI,
  getCurrentUser,
  loadMyAvatarSubmissions,
  loadMyProfile,
  saveMyProfile,
  subscribeToMyProfile,
  uploadAvatarSubmission,
  validateAvatarFile
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

function avatarErrorText(error) {
  if (error?.code === "AVATAR_SIZE") return "A kép legfeljebb 2 MB lehet.";
  if (error?.code === "AVATAR_TYPE") return "Csak JPEG, PNG vagy WebP kép tölthető fel.";
  if (error?.code === "AUTH_REQUIRED") return "A kép beküldéséhez be kell jelentkezni.";
  return error?.message ? `A kép beküldése nem sikerült: ${error.message}` : "A kép beküldése nem sikerült.";
}

function profileSaveErrorText(error) {
  const raw = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.trim();
  if (error?.code === "TAKEN" || raw.includes("INVALID_NICKNAME:TAKEN")) return "Ez a becenév már használatban van.";
  if (raw.includes("INVALID_NICKNAME:EMPTY")) return "A becenév nem lehet üres.";
  if (raw.includes("INVALID_NICKNAME:RESERVED_SUFFIX")) return "Ez a becenév-végződés fenntartott.";
  if (raw.includes("INVALID_NICKNAME:RESERVED")) return "Ez a becenév fenntartott, válassz másikat.";
  if (raw.includes("INVALID_PROFILE:STAFF_AVATAR_RESERVED")) return "Ez az avatar kizárólag moderátorok és adminok számára van fenntartva.";
  if (raw.includes("INVALID_PROFILE:STAFF_AVATAR_LOCKED")) return "Moderátori vagy admin szerepkörben az avatar rögzített.";
  if (raw.includes("INVALID_PROFILE:AVATAR_REQUIRED")) return "Válassz avatart a profil mentéséhez.";
  if (raw.includes("INVALID_PROFILE:EMAIL_VISIBILITY")) return "Érvénytelen e-mail láthatósági beállítás.";
  if (raw.includes("AUTH_REQUIRED")) return "A profil mentéséhez újra be kell jelentkezni.";
  return raw ? `A profil mentése nem sikerült: ${raw}` : "A profil mentése nem sikerült.";
}

async function loadAvatarImageSource(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createCroppedAvatarFile(file, positionX, positionY, zoom) {
  const bitmap = await loadAvatarImageSource(file);
  try {
    const minSide = Math.min(bitmap.width, bitmap.height);
    const cropSize = Math.max(1, minSide / Math.max(1, zoom));
    const centerX = (Math.min(100, Math.max(0, positionX)) / 100) * bitmap.width;
    const centerY = (Math.min(100, Math.max(0, positionY)) / 100) * bitmap.height;
    const sx = Math.min(bitmap.width - cropSize, Math.max(0, centerX - cropSize / 2));
    const sy = Math.min(bitmap.height - cropSize, Math.max(0, centerY - cropSize / 2));

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("A képvágó nem indítható.");

    context.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, 512, 512);
    const outputType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("A kép előkészítése nem sikerült.")),
        outputType,
        outputType === "image/png" ? undefined : 0.9
      );
    });

    const baseName = String(file.name || "avatar").replace(/\.[^.]+$/, "");
    const extension = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${baseName}-idesuss-avatar.${extension}`, { type: outputType });
  } finally {
    bitmap.close?.();
  }
}

async function renderProfile(panel, profile, user) {
  const nickname = profile?.nickname || "";
  const nicknameLocked = profile?.profile_completed === true && Boolean(profile?.nickname_normalized || nickname);
  const isStaffAvatarLocked = ["moderator", "admin"].includes(profile?.role);
  const avatar = isStaffAvatarLocked
    ? STAFF_AVATAR_EMOJI
    : (APPROVED_AVATAR_EMOJIS.includes(profile?.avatar_emoji) ? profile.avatar_emoji : "🙂");
  const selectableAvatars = isStaffAvatarLocked ? [STAFF_AVATAR_EMOJI] : APPROVED_AVATAR_EMOJIS;
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
          <button id="toggleAvatarPicker" class="profile-avatar-open" type="button" aria-expanded="false" aria-controls="profileAvatarPicker"${isStaffAvatarLocked ? " disabled" : ""}>
            ${isStaffAvatarLocked ? "Szolgálati avatar" : "Avatar választása"}
          </button>
        </div>

        <div id="profileAvatarPicker" class="profile-avatar-picker" hidden>
          <div class="profile-avatar-grid" role="list" aria-label="Választható avatárok">
            ${selectableAvatars.map((emoji) => `
              <button
                class="profile-avatar-choice${emoji === avatar ? " selected" : ""}"
                type="button"
                data-avatar="${escapeHtml(emoji)}"
                aria-label="Avatar: ${escapeHtml(emoji)}"
                aria-pressed="${emoji === avatar ? "true" : "false"}"
              >${escapeHtml(emoji)}</button>
            `).join("")}
          </div>

          ${isStaffAvatarLocked
            ? '<p class="profile-avatar-rule">Moderátori vagy admin szerepkörben ez a szolgálati avatar kötelező, és más avatar vagy saját kép nem választható.</p>'
            : '<button id="openAvatarUpload" class="profile-avatar-upload-link" type="button">Saját kép feltöltése</button><input id="profileAvatarFile" type="file" accept="image/jpeg,image/png,image/webp" hidden />'}

          <div id="avatarCropEditor" class="avatar-crop-editor" hidden>
            <div id="avatarCropFrame" class="avatar-crop-frame" aria-label="Avatar kép pozicionálása">
              <img id="avatarCropImage" alt="Avatar előnézet" draggable="false" />
            </div>
            <p class="avatar-crop-help">Húzd a képet a kívánt helyre. A csúszkával nagyíthatsz vagy kicsinyíthetsz.</p>
            <label class="avatar-crop-zoom">
              <span>Nagyítás</span>
              <input id="avatarCropZoom" type="range" min="1" max="3" step="0.05" value="1" />
            </label>
            <div class="avatar-crop-actions">
              <button id="acceptAvatarCrop" class="avatar-crop-action primary" type="button">Kép elfogadása</button>
              <button id="cancelAvatarCrop" class="avatar-crop-action" type="button">Mégse</button>
            </div>
          </div>

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
        <input id="profileNickname" type="text" maxlength="40" value="${escapeHtml(nickname)}" autocomplete="nickname"${nicknameLocked ? ' readonly aria-readonly="true"' : ""} />
        <span class="profile-nickname-note">${nicknameLocked
          ? "A becenév végleges és ehhez a fiókhoz tartozik. Új becenévhez új fiók szükséges."
          : "A becenevet csak egyszer választhatod meg. Az első profilmentés után végleg ehhez a fiókhoz kötődik."}</span>
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
  if (!isStaffAvatarLocked) {
    toggle?.addEventListener("click", () => {
      const willOpen = picker?.hidden !== false;
      if (picker) picker.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  }

  let pendingAvatarFile = null;
  let pendingAvatarObjectUrl = "";
  let pendingAvatarAccepted = false;
  let cropPositionX = 50;
  let cropPositionY = 50;
  let cropZoom = 1;

  const preview = document.getElementById("profileAvatarPreview");
  const cropEditor = document.getElementById("avatarCropEditor");
  const cropFrame = document.getElementById("avatarCropFrame");
  const cropImage = document.getElementById("avatarCropImage");
  const cropZoomInput = document.getElementById("avatarCropZoom");
  const uploadMessage = document.getElementById("avatarUploadMessage");

  const clearPendingAvatar = () => {
    if (pendingAvatarObjectUrl) URL.revokeObjectURL(pendingAvatarObjectUrl);
    pendingAvatarObjectUrl = "";
    pendingAvatarFile = null;
    pendingAvatarAccepted = false;
    cropPositionX = 50;
    cropPositionY = 50;
    cropZoom = 1;
    if (cropEditor) cropEditor.hidden = true;
  };

  const updateCropPreview = () => {
    if (!cropImage) return;
    cropImage.style.objectPosition = `${cropPositionX}% ${cropPositionY}%`;
    cropImage.style.transform = `scale(${cropZoom})`;
  };

  const renderPendingPhotoPreview = () => {
    if (!preview || !pendingAvatarObjectUrl) return;
    preview.textContent = "";
    const image = document.createElement("img");
    image.src = pendingAvatarObjectUrl;
    image.alt = "Kiválasztott avatar előnézete";
    image.style.objectPosition = `${cropPositionX}% ${cropPositionY}%`;
    image.style.transform = `scale(${cropZoom})`;
    preview.appendChild(image);
  };

  if (!isStaffAvatarLocked) document.querySelectorAll(".profile-avatar-choice").forEach((button) => {
    button.addEventListener("click", () => {
      clearPendingAvatar();
      const next = button.dataset.avatar || "🙂";
      const input = document.getElementById("profileAvatar");
      if (input) input.value = next;
      if (preview) {
        preview.replaceChildren();
        preview.textContent = next;
      }

      document.querySelectorAll(".profile-avatar-choice").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      if (uploadMessage) uploadMessage.textContent = submissionStatusText(submissions);
    });
  });

  const fileInput = document.getElementById("profileAvatarFile");
  if (!isStaffAvatarLocked) {
    document.getElementById("openAvatarUpload")?.addEventListener("click", () => fileInput?.click());
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      if (uploadMessage) uploadMessage.textContent = validation.reason === "SIZE"
        ? "A kép legfeljebb 2 MB lehet."
        : validation.reason === "TYPE"
          ? "Csak JPEG, PNG vagy WebP kép tölthető fel."
          : "Nem sikerült kiválasztani a képet.";
      fileInput.value = "";
      return;
    }

    clearPendingAvatar();
    pendingAvatarFile = file;
    pendingAvatarObjectUrl = URL.createObjectURL(file);
    if (cropImage) cropImage.src = pendingAvatarObjectUrl;
    if (cropZoomInput) cropZoomInput.value = "1";
    updateCropPreview();
    if (cropEditor) cropEditor.hidden = false;
    if (uploadMessage) uploadMessage.textContent = "A kép még nincs beküldve. Állítsd be, majd fogadd el.";
    fileInput.value = "";
  });

  cropZoomInput?.addEventListener("input", () => {
    cropZoom = Math.max(1, Number(cropZoomInput.value) || 1);
    updateCropPreview();
  });

  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragBaseX = 50;
  let dragBaseY = 50;

  cropFrame?.addEventListener("pointerdown", (event) => {
    if (!pendingAvatarFile) return;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragBaseX = cropPositionX;
    dragBaseY = cropPositionY;
    cropFrame.setPointerCapture?.(event.pointerId);
  });

  cropFrame?.addEventListener("pointermove", (event) => {
    if (dragPointerId !== event.pointerId || !cropFrame) return;
    const rect = cropFrame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cropPositionX = Math.min(100, Math.max(0, dragBaseX + ((event.clientX - dragStartX) / rect.width) * 100));
    cropPositionY = Math.min(100, Math.max(0, dragBaseY + ((event.clientY - dragStartY) / rect.height) * 100));
    updateCropPreview();
  });

  const stopDrag = (event) => {
    if (dragPointerId !== event.pointerId) return;
    dragPointerId = null;
  };
  cropFrame?.addEventListener("pointerup", stopDrag);
  cropFrame?.addEventListener("pointercancel", stopDrag);

  document.getElementById("acceptAvatarCrop")?.addEventListener("click", () => {
    if (!pendingAvatarFile) return;
    pendingAvatarAccepted = true;
    if (cropEditor) cropEditor.hidden = true;
    renderPendingPhotoPreview();
    if (uploadMessage) uploadMessage.textContent = "A kép elfogadva. Csak a Profil mentése gombbal kerül elővizsgálatra.";
  });

  document.getElementById("cancelAvatarCrop")?.addEventListener("click", () => {
    clearPendingAvatar();
    if (preview) {
      preview.replaceChildren();
      preview.textContent = document.getElementById("profileAvatar")?.value || "🙂";
    }
    if (uploadMessage) uploadMessage.textContent = submissionStatusText(submissions);
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

      let avatarSubmitted = false;
      let avatarSubmissionError = null;
      if (pendingAvatarFile && pendingAvatarAccepted) {
        try {
          const croppedFile = await createCroppedAvatarFile(
            pendingAvatarFile,
            cropPositionX,
            cropPositionY,
            cropZoom
          );
          await uploadAvatarSubmission(window.supabaseClient, croppedFile);
          avatarSubmitted = true;
        } catch (error) {
          console.error("Avatar submission after profile save failed", error);
          avatarSubmissionError = error;
        }
      }

      window.dispatchEvent(new CustomEvent("idesuss:profile-saved", {
        detail: { nickname: saved?.nickname || "" }
      }));

      clearPendingAvatar();
      await renderProfile(panel, saved, user);
      const nextMessage = document.getElementById("profilePanelMessage");
      if (nextMessage) {
        nextMessage.textContent = avatarSubmissionError
          ? `A profil mentve, de a kép nem került elővizsgálatra. ${avatarErrorText(avatarSubmissionError)}`
          : avatarSubmitted
            ? "Profil mentve. A kép elővizsgálatra elküldve."
            : "Profil mentve.";
      }
    } catch (error) {
      console.error("Profile save failed", error);
      if (message) message.textContent = profileSaveErrorText(error);
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
