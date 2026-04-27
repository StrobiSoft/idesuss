async function init() {
  bindEvents();

  if (typeof initMenu === "function") {
    initMenu();
  }

  showView("choice");
  await refreshSession();

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }

  await loadPosts();

  if (typeof applyLang === "function") {
    applyLang();
  }
}

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

  renderAvatarGrid(registerAvatarGrid, selectedRegisterAvatar, function pickRegisterAvatar(avatar) {
    selectedRegisterAvatar = avatar;
    renderAvatarGrid(registerAvatarGrid, selectedRegisterAvatar, pickRegisterAvatar);
  });
}

window.addEventListener("DOMContentLoaded", init);