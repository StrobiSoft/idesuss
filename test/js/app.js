async function init() {
  bindEvents();
  
  showView("choice");
  await refreshSession();
  await loadPosts();
  
  applyLang();
}

window.addEventListener("DOMContentLoaded", init);

function bindEvents() {
  showLoginBtn.onclick = () => {
    clearMessages();
    showView("login");
  };

  showRegisterBtn.onclick = () => {
    clearMessages();
    showView("register");
  };

  backFromLoginBtn.onclick = () => {
    clearMessages();
    showView("choice");
  };

  backFromRegisterBtn.onclick = () => {
    clearMessages();
    showView("choice");
  };

  backFromResetBtn.onclick = () => {
    clearMessages();
    showView("login");
  };

  loginBtn.onclick = login;
  registerBtn.onclick = register;
  forgotBtn.onclick = resetPassword;
  resetSaveBtn.onclick = saveNewPassword;
  logoutBtn.onclick = signOut;
  saveProfileBtn.onclick = saveProfile;
  sendBtn.onclick = addPost;

  newPostInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addPost();
  });

  profileNickname.addEventListener("input", updateProfilePreview);
  profileAvatarUrl.addEventListener("input", updateProfilePreview);

  renderAvatarGrid(registerAvatarGrid, selectedRegisterAvatar, function pickRegisterAvatar(avatar) {
    selectedRegisterAvatar = avatar;
    renderAvatarGrid(registerAvatarGrid, selectedRegisterAvatar, pickRegisterAvatar);
  });

  renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, function pickProfileAvatar(avatar) {
    selectedProfileAvatar = avatar;
    renderAvatarGrid(profileAvatarGrid, selectedProfileAvatar, pickProfileAvatar);
    updateProfilePreview();
  });
}

window.addEventListener("DOMContentLoaded", init);