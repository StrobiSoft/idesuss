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
  const avatar = selectedProfileAvatar || window.ownProfile?.avatar_emoji || "🙂";

  profilePreviewName.textContent = name;
  profilePreviewAvatar.textContent = avatar;
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
  selectedProfileAvatar = data.avatar_emoji || "🙂";

  window.ownProfile = data;

  const welcomeTitle = document.getElementById("welcomeTitle");
  if (welcomeTitle) {
  welcomeTitle.textContent = welcomeText(data.nickname);
  }

  updateProfilePreview();

  renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, function pickProfileAvatar(val) {
    selectedProfileAvatar = val;
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

  const avatarEmoji = selectedProfileAvatar || "🙂";

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      avatar_emoji: avatarEmoji
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
  }
}