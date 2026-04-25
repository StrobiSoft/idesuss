function renderAuthState() {
  authChoiceView.classList.add("hidden");
  loginView.classList.add("hidden");
  registerView.classList.add("hidden");
  resetView.classList.add("hidden");

  if (currentUser) {
    authInfo.parentElement.classList.add("hidden");

    newPostInput.disabled = false;
    sendBtn.disabled = false;
    profilePanel.classList.remove("hidden");
  } else {
    authInfo.parentElement.classList.remove("hidden");

    authInfo.textContent = "Nincs bejelentkezett user.";
    newPostInput.disabled = true;
    sendBtn.disabled = true;
    profilePanel.classList.add("hidden");
    authChoiceView.classList.remove("hidden");

    const welcome = document.getElementById("welcomeTitle");
    if (welcome) {
      welcome.textContent = "Welcome dear User 👋";
    }
  }

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }
}

async function refreshSession() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  renderAuthState();

  if (currentUser && typeof loadOwnProfile === "function") {
    const profile = await loadOwnProfile();

    const welcome = document.getElementById("welcomeTitle");
    if (welcome) {
      if (profile && profile.nickname) {
      welcome.textContent = "Üdv, kedves Felhasználó 👋";
      } else {
        welcome.textContent = "Üdv, kedves " + profile.nickname + " 👋";
      }
    }
  }

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }
}

async function login() {
  clearMessages();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = "Adj meg email címet és jelszót.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = "Belépési hiba: " + error.message;
    showToast("Belépési hiba", "error");
    return;
  }

  currentUser = data.user;
  showToast("Belépve", "success");

  await refreshSession();
  await loadPosts();
}

async function register() {
  clearMessages();

  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const password2 = registerPassword2.value;
  const nickname = registerNickname.value.trim();

  if (!email || !password || !password2 || !nickname) {
    registerError.textContent = "Minden mezőt tölts ki.";
    return;
  }

  if (password !== password2) {
    registerError.textContent = "A két jelszó nem egyezik.";
    return;
  }

  if (!consentCheckbox.checked) {
    registerError.textContent = "Fogadd el a feltételeket.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      data: {
        nickname,
        avatar_emoji: selectedRegisterAvatar
      }
    }
  });

  if (error) {
    registerError.textContent = "Regisztrációs hiba: " + error.message;
    return;
  }

  if (data?.user) {
    await supabaseClient.from("profiles").upsert({
      id: data.user.id,
      nickname,
      avatar_emoji: selectedRegisterAvatar
    });
  }

  registerSuccess.textContent = "Regisztráció kész. Nézd meg az emailedet.";
  showToast("Regisztráció kész", "success");
  showView("login");
  loginEmail.value = email;
  loginPassword.value = "";
}

async function resetPassword() {
  clearMessages();

  const email = loginEmail.value.trim();

  if (!email) {
    loginError.textContent = "Add meg az email címedet.";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });

  if (error) {
    loginError.textContent = "Jelszó-visszaállítási hiba: " + error.message;
    showToast("Email hiba", "error");
    return;
  }

  loginSuccess.textContent = "Jelszó-visszaállító email elküldve.";
  showToast("Email elküldve", "success");
}

async function saveNewPassword() {
  clearMessages();

  const p1 = resetPassword1.value;
  const p2 = resetPassword2.value;

  if (!p1 || !p2) {
    resetError.textContent = "Mindkét mezőt töltsd ki.";
    return;
  }

  if (p1 !== p2) {
    resetError.textContent = "A két jelszó nem egyezik.";
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: p1
  });

  if (error) {
    resetError.textContent = "Jelszó mentési hiba: " + error.message;
    showToast("Jelszó hiba", "error");
    return;
  }

  resetSuccess.textContent = "Új jelszó mentve.";
  showToast("Új jelszó mentve", "success");
  showView("login");
  resetPassword1.value = "";
  resetPassword2.value = "";
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  window.ownProfile = null;

  showToast("Kilépve", "info");
  renderAuthState();

  if (typeof updateMenuVisibility === "function") {
    updateMenuVisibility();
  }

  await loadPosts();
  showView("choice");
}