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
  const name = profileNickname.value.trim() || "Felhasználó";
  const avatarUrl = profileAvatarUrl.value.trim();

  profilePreviewName.textContent = name;

  if (avatarUrl) {
    profilePreviewAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  } else {
    profilePreviewAvatar.innerHTML = "";
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
    openCropModal(e.target.result);
  };

  reader.readAsDataURL(file);
}
    }

    cropper = new Cropper(img, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: "move",
      movable: true,
      zoomable: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      background: false
    });
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

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, pickProfileAvatar);
    updateProfilePreview();
  });

  profileAvatarGrid.style.display = "none";

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }

  return data;
}

async function saveProfile() {
  if (!currentUser) return;

  let avatarUrl = profileAvatarUrl.value.trim();

  if (cropper) {
    const canvas = cropper.getCroppedCanvas({
      width: 256,
      height: 256
    });

    avatarUrl = canvas.toDataURL("image/jpeg", 0.9);
    profileAvatarUrl.value = avatarUrl;

    cropper.destroy();
    cropper = null;
  }

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
    return;
  }

  showToast("Profil mentve", "success");
  profileAvatarGrid.style.display = "none";

  await loadOwnProfile();
  await loadPosts();

  if (typeof showHome === "function") {
    showHome();
  }

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }
}

profilePreviewAvatar.onclick = () => {
  const isHidden = getComputedStyle(profileAvatarGrid).display === "none";
  profileAvatarGrid.style.display = isHidden ? "grid" : "none";
};

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