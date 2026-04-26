let cropper = null;
function renderAvatarGrid(container, selectedValue, onPick) {
  container.innerHTML = "";

  AVATARS.forEach((avatar) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-btn" + (avatar === selectedValue ? " selected" : "");
    btn.textContent = avatar;
    btn.onclick = () => onPick(avatar);
    container.appendChild(btn);
  });
}

function updateProfilePreview() {
  const name = profileNickname.value.trim() || "Névtelen";
  const avatarUrl = profileAvatarUrl.value.trim();

  profilePreviewName.textContent = name;

  if (avatarUrl) {
    profilePreviewAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  } else {
    profilePreviewAvatar.textContent =
      selectedProfileAvatar || window.ownProfile?.avatar_emoji || "🙂";
  }
}

function handleAvatarFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Csak képfájl választható", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    profilePreviewAvatar.innerHTML = `<img id="cropImage" src="${e.target.result}">`;

    const img = document.getElementById("cropImage");

    if (cropper) cropper.destroy();

    cropper = new Cropper(img, {
      aspectRatio: 1,          // 🔥 KÖR avatar
      viewMode: 1,
      movable: true,
      zoomable: true,
      cropBoxResizable: true,
      dragMode: "move",
      background: false
    });
  };

  reader.readAsDataURL(file);
}

  const reader = new FileReader();

  reader.onload = function(e) {
    profilePreviewAvatar.innerHTML = `<img id="cropImage" 

  const reader = new FileReader();

  reader.onload = function(e) {
    profileAvatarUrl.value = e.target.result;
    selectedProfileAvatar = null;
    updateProfilePreview();
  };

  reader.readAsDataURL(file);
}

async function loadOwnProfile() {
  if (!currentUser) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("PROFILE LOAD ERROR:", error);
    showToast("Profil hiba: " + error.message, "error");
    setStatus("PROFILE LOAD ERROR: " + error.message);
    return null;
  }

  profileNickname.value = data.nickname || "";
  profileNickname.readOnly = true;

  profileAvatarUrl.value = data.avatar_url || "";
  selectedProfileAvatar = data.avatar_emoji || "🙂";

  window.ownProfile = data;

  const welcomeTitle = document.getElementById("welcomeTitle");
  if (welcomeTitle && typeof welcomeText === "function") {
    welcomeTitle.textContent = welcomeText(data.nickname);
  }

  updateProfilePreview();

  renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, function pickProfileAvatar(val) {
    selectedProfileAvatar = val;
    profileAvatarUrl.value = "";
    renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, pickProfileAvatar);
    updateProfilePreview();
  });

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }

  return data;
}

async function saveProfile() {
  if (!currentUser) return;

  const avatarUrl = profileAvatarUrl.value.trim();

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      avatar_emoji: avatarUrl ? null : selectedProfileAvatar,
      avatar_url: avatarUrl || null
    })
    .eq("id", currentUser.id);

  if (error) {
    console.error("PROFILE SAVE ERROR:", error);
    showToast("Profil hiba: " + error.message, "error");
    setStatus("PROFILE SAVE ERROR: " + error.message);
    return;
  }

  showToast("Profil mentve", "success");

  await loadOwnProfile();
  await loadPosts();

  if (typeof showHome === "function") {
    showHome();
  }

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
    
    profileAvatarGrid.classList.add("hidden");
  }
}

chooseAvatarFileBtn.onclick = () => {
  avatarFileInput.value = "";
  avatarFileInput.click();
};

takeAvatarPhotoBtn.onclick = () => {
  avatarCameraInput.value = "";
  avatarCameraInput.click();
};

avatarFileInput.onchange = handleAvatarFile;
avatarCameraInput.onchange = handleAvatarFile;