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
  const url = profileAvatarUrl.value.trim();

  profilePreviewName.textContent = name;

  if (url) {
    profilePreviewAvatar.innerHTML = `<img src="${escapeHtml(url)}">`;
  } else {
    profilePreviewAvatar.textContent = selectedProfileAvatar;
  }
}

async function loadOwnProfile() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
  console.error("PROFILE SAVE ERROR:", error);
  showToast("Profil hiba: " + error.message, "error");
  setStatus("PROFILE SAVE ERROR: " + error.message);
  return;
}

  profileNickname.value = data.nickname || "";
  profileAvatarUrl.value = data.avatar_url || "";
  selectedProfileAvatar = data.avatar_emoji || "🙂";

  updateProfilePreview();

  renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, function pickProfileAvatar(val) {
    selectedProfileAvatar = val;
    renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, pickProfileAvatar);
    updateProfilePreview();
  });
}

async function saveProfile() {
  if (!currentUser) return;

  const nickname = profileNickname.value.trim();
  const avatarUrl = profileAvatarUrl.value.trim();

  if (!nickname) {
    showToast("Adj meg nicknevet", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({
  id: currentUser.id,
  nickname,
  avatar_emoji: selectedProfileAvatar
});

  if (error) {
    showToast("Profil hiba", "error");
    return;
  }

  showToast("Profil mentve", "success");
  await loadOwnProfile();
  await loadPosts();
}