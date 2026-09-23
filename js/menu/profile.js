import {
  APPROVED_AVATAR_EMOJIS,
  STAFF_AVATAR_EMOJI,
  acceptCurrentEula,
  getCurrentUser,
  getMyEulaStatus,
  getProfileAvatarImageUrl,
  loadMyAvatarSubmissions,
  loadMyProfile,
  saveMyProfile,
  setMyPresenceVisibility,
  subscribeToMyProfile,
  uploadAvatarSubmission,
  validateAvatarFile
} from "../shared/profile-service.js?v=20260923-eula1";
import { shellT, subscribeShellLanguage } from "../shared/shell-language.js";

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
  if (latest.status === "pending") return shellT("submissionPending");
  if (latest.status === "approved") return shellT("submissionApproved");
  if (latest.status === "rejected") return shellT("submissionRejected");
  return "";
}

function avatarErrorText(error) {
  if (error?.code === "AVATAR_SIZE") return shellT("avatarMaxSize");
  if (error?.code === "AVATAR_TYPE") return shellT("avatarType");
  if (error?.code === "AUTH_REQUIRED") return shellT("avatarAuth");
  return error?.message ? shellT("avatarSubmitFailedDetail",{detail:error.message}) : shellT("avatarSubmitFailed");
}

function profileSaveErrorText(error) {
  const raw = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.trim();
  if (error?.code === "TAKEN" || raw.includes("INVALID_NICKNAME:TAKEN")) return shellT("nicknameTaken");
  if (raw.includes("INVALID_NICKNAME:EMPTY")) return shellT("nicknameEmpty");
  if (raw.includes("INVALID_NICKNAME:RESERVED_SUFFIX")) return shellT("nicknameReservedSuffix");
  if (raw.includes("INVALID_NICKNAME:RESERVED")) return shellT("nicknameReserved");
  if (raw.includes("INVALID_PROFILE:STAFF_AVATAR_RESERVED")) return shellT("staffAvatarReserved");
  if (raw.includes("INVALID_PROFILE:STAFF_AVATAR_LOCKED")) return shellT("staffAvatarLocked");
  if (raw.includes("INVALID_PROFILE:AVATAR_REQUIRED")) return shellT("avatarRequired");
  if (raw.includes("INVALID_PROFILE:EMAIL_VISIBILITY")) return shellT("invalidEmailVisibility");
  if (raw.includes("EULA_ACCEPTANCE_REQUIRED")) return shellT("eulaRequired");
  if (raw.includes("AUTH_REQUIRED")) return shellT("profileAuth");
  return raw ? shellT("profileSaveFailedDetail",{detail:raw}) : shellT("profileSaveFailed");
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
    if (!context) throw new Error(shellT("cropUnavailable"));

    context.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, 512, 512);
    const outputType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error(shellT("imagePrepareFailed"))),
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
  const presenceVisibility = profile?.presence_visibility || "friends";
  let submissions = [];
  let approvedAvatarUrl = "";
  let eulaStatus = { accepted: false, required_version: null };

  try {
    submissions = await loadMyAvatarSubmissions(window.supabaseClient);
    approvedAvatarUrl = await getProfileAvatarImageUrl(window.supabaseClient, profile);
    eulaStatus = await getMyEulaStatus(window.supabaseClient);
  } catch (error) {
    console.error("Profile auxiliary data load failed", error);
  }

  panel.innerHTML = `
    <div class="profile-panel-card" role="dialog" aria-modal="true" aria-labelledby="profilePanelTitle">
      <button id="closeProfilePanel" class="profile-panel-close icon-close-btn" type="button" aria-label="${shellT("close")}" title="${shellT("close")}">
        ${CLOSE_ICON}
      </button>
      <h2 id="profilePanelTitle">${shellT("profileTitle")}</h2>
      <p>${shellT("profileIntro")}</p>

      <div class="profile-placeholder">
        <strong>${shellT("account")}</strong>
        <span>${escapeHtml(user?.email || "")}</span>
      </div>

      <div class="profile-placeholder profile-avatar-section">
        <strong>${shellT("avatar")}</strong>
        <div class="profile-avatar-current" aria-live="polite">
          <span id="profileAvatarPreview" class="profile-avatar-preview" aria-hidden="true">${approvedAvatarUrl ? `<img src="${escapeHtml(approvedAvatarUrl)}" alt="" />` : escapeHtml(avatar)}</span>
          <button id="toggleAvatarPicker" class="profile-avatar-open" type="button" aria-expanded="false" aria-controls="profileAvatarPicker"${isStaffAvatarLocked ? " disabled" : ""}>
            ${isStaffAvatarLocked ? shellT("serviceAvatar") : shellT("chooseAvatar")}
          </button>
        </div>

        <div id="profileAvatarPicker" class="profile-avatar-picker" hidden>
          <div class="profile-avatar-grid" role="list" aria-label="${shellT("avatarsLabel")}">
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
            ? `<p class="profile-avatar-rule">${shellT("staffAvatarRule")}</p>`
            : `<button id="openAvatarUpload" class="profile-avatar-upload-link" type="button">${shellT("uploadOwnImage")}</button><input id="profileAvatarFile" type="file" accept="image/jpeg,image/png,image/webp" hidden />`}

          <div id="avatarCropEditor" class="avatar-crop-editor" hidden>
            <div id="avatarCropFrame" class="avatar-crop-frame" aria-label="${shellT("cropPosition")}">
              <img id="avatarCropImage" alt="${shellT("avatarPreview")}" draggable="false" />
            </div>
            <p class="avatar-crop-help">${shellT("cropHelp")}</p>
            <label class="avatar-crop-zoom">
              <span>${shellT("zoom")}</span>
              <input id="avatarCropZoom" type="range" min="1" max="3" step="0.05" value="1" />
            </label>
            <div class="avatar-crop-actions">
              <button id="acceptAvatarCrop" class="avatar-crop-action primary" type="button">${shellT("acceptImage")}</button>
              <button id="cancelAvatarCrop" class="avatar-crop-action" type="button">${shellT("cancel")}</button>
            </div>
          </div>

          <p class="profile-avatar-rule">
            ${shellT("avatarRule")}
            <a href="/rules/" target="_blank" rel="noopener">${shellT("houseRules")}</a>
          </p>
          <div id="avatarUploadMessage" class="profile-avatar-status" aria-live="polite">${escapeHtml(submissionStatusText(submissions))}</div>
        </div>

        <input id="profileAvatar" type="hidden" value="${escapeHtml(avatar)}" />
      </div>

      <label class="profile-placeholder">
        <strong>${shellT("nickname")}</strong>
        <input id="profileNickname" type="text" maxlength="40" value="${escapeHtml(nickname)}" autocomplete="nickname"${nicknameLocked ? ' readonly aria-readonly="true"' : ""} />
        <span class="profile-nickname-note">${nicknameLocked
          ? shellT("nicknameLocked")
          : shellT("nicknameFirst")}</span>
      </label>

      <label class="profile-placeholder">
        <strong>${shellT("emailVisibility")}</strong>
        <select id="profileEmailVisibility">
          <option value="hidden"${visibility === "hidden" ? " selected" : ""}>${shellT("hidden")}</option>
          <option value="masked"${visibility === "masked" ? " selected" : ""}>${shellT("masked")}</option>
          <option value="public"${visibility === "public" ? " selected" : ""}>${shellT("public")}</option>
        </select>
      </label>

      <label class="profile-placeholder">
        <strong>${shellT("presenceVisibility")}</strong>
        <select id="profilePresenceVisibility">
          <option value="nobody"${presenceVisibility === "nobody" ? " selected" : ""}>${shellT("nobody")}</option>
          <option value="friends"${presenceVisibility === "friends" ? " selected" : ""}>${shellT("friendsOnly")}</option>
          <option value="everyone"${presenceVisibility === "everyone" ? " selected" : ""}>${shellT("everyone")}</option>
        </select>
      </label>

      <a class="menu-profile-btn" href="/messages/">${shellT("friendsMessages")}</a>

      <div class="profile-placeholder profile-eula">
        <label style="display:flex;gap:10px;align-items:flex-start">
          <input id="profileEulaAccepted" type="checkbox"${eulaStatus.accepted ? " checked disabled" : ""} />
          <span>${eulaStatus.accepted ? shellT("eulaAccepted") : shellT("eulaAcceptLabel")}</span>
        </label>
        <a href="/eula/" target="_blank" rel="noopener">${shellT("eulaLink")}</a>
      </div>

      <button id="saveProfilePanel" class="menu-profile-btn" type="button">${shellT("saveProfile")}</button>
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
  const eulaCheckbox = document.getElementById("profileEulaAccepted");
  const saveProfileButton = document.getElementById("saveProfilePanel");

  if (!eulaStatus.accepted) {
    eulaCheckbox?.addEventListener("change", () => {
      const message = document.getElementById("profilePanelMessage");
      if (message && eulaCheckbox.checked && message.textContent === shellT("eulaRequired")) {
        message.textContent = "";
      }
      saveProfileButton?.classList.toggle("eula-pending", !eulaCheckbox.checked);
    });
    saveProfileButton?.classList.add("eula-pending");
  }

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
    image.alt = shellT("avatarPreview");
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
        ? shellT("avatarMaxSize")
        : validation.reason === "TYPE"
          ? shellT("avatarType")
          : shellT("imageSelectFailed");
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
    if (uploadMessage) uploadMessage.textContent = shellT("imagePending");
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
    if (uploadMessage) uploadMessage.textContent = shellT("imageAccepted");
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

    if (!eulaStatus.accepted && !eulaCheckbox?.checked) {
      if (message) message.textContent = shellT("eulaRequired");
      return;
    }

    if (message) message.textContent = shellT("saving");

    try {
      if (!eulaStatus.accepted) {
        await acceptCurrentEula(window.supabaseClient);
        eulaStatus = { ...eulaStatus, accepted: true };
      }

      const saved = await saveMyProfile(window.supabaseClient, {
        nickname: document.getElementById("profileNickname")?.value.trim() || "",
        avatar_emoji: document.getElementById("profileAvatar")?.value || "🙂",
        email_visibility: document.getElementById("profileEmailVisibility")?.value || "hidden"
      });

      await setMyPresenceVisibility(
        window.supabaseClient,
        document.getElementById("profilePresenceVisibility")?.value || "friends"
      );

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
          ? shellT("profileSavedImageFailed",{detail:avatarErrorText(avatarSubmissionError)})
          : avatarSubmitted
            ? shellT("profileSavedSubmitted")
            : shellT("profileSaved");
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
      <button id="closeProfilePanel" class="profile-panel-close icon-close-btn" type="button" aria-label="${shellT("close")}" title="${shellT("close")}">
        ${CLOSE_ICON}
      </button>
      <h2 id="profilePanelTitle">${shellT("profileTitle")}</h2>
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
  renderPanelState(panel, shellT("loading"));

  try {
    const user = await getCurrentUser(window.supabaseClient);

    if (!user) {
      renderPanelState(panel, shellT("profileLoginRequired"));
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
    renderPanelState(panel, shellT("profileLoadFailed"));
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProfilePanel(document.getElementById("profilePanel"));
  }
});


subscribeShellLanguage(() => {
  const panel = document.getElementById("profilePanel");
  if (panel?.classList.contains("show")) {
    openProfilePanel().catch((error) => console.error("Profile relocalization failed", error));
  }
});
