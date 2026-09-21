import {
  currentIdentity,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  subscribeAuthState,
  updatePassword
} from "../shared/auth-service.js?v=20260921-prod-refresh1";
import { loadMyProfile } from "../shared/profile-service.js?v=20260921-prod-refresh1";
import { openProfilePanel } from "./profile.js?v=20260921-prod-refresh1";
import {
  closeAuthModal,
  ensureAuthModal,
  openAuthModal,
  showAuthToast
} from "./auth-shell.js?v=20260921-prod-refresh1";

let identity = null;
let profileNickname = "";
let unsubscribeAuth = null;
let recoveryRequested = false;

function isPasswordRecoveryLocation() {
  const url = new URL(window.location.href);
  const hash = url.hash.toLowerCase();
  const authMode = (url.searchParams.get("auth") || "").toLowerCase();
  const type = (url.searchParams.get("type") || "").toLowerCase();

  return (
    authMode === "password-reset" ||
    type === "recovery" ||
    hash === "#password-reset" ||
    hash.includes("type=recovery")
  );
}

function clearPasswordRecoveryLocation() {
  const url = new URL(window.location.href);
  url.searchParams.delete("auth");
  url.searchParams.delete("type");

  if (url.hash === "#password-reset" || url.hash.toLowerCase().includes("type=recovery")) {
    url.hash = "";
  }

  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function getClient() {
  if (!window.supabaseClient) throw new Error("Missing Supabase client.");
  return window.supabaseClient;
}

function authMessage() {
  return document.getElementById("authMessage");
}

function setMessage(text) {
  const target = authMessage();
  if (target) target.textContent = text || "";
}

function homeText(key, fallback) {
  const value = window.idesussHomeTranslations?.[key];
  return typeof value === "string" && value ? value : fallback;
}

function localizeAuthError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("email rate limit exceeded") ||
    message.includes("for security purposes") ||
    message.includes("request this after")
  ) {
    return "Biztonsági okból várnod kell egy rövid ideig az újabb kérés előtt. Próbáld meg később.";
  }
  if (message.includes("invalid login credentials")) return "Hibás e-mail cím vagy jelszó.";
  if (message.includes("email not confirmed")) return "Az e-mail címed még nincs megerősítve. Ellenőrizd a postafiókodat.";
  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Ezzel az e-mail címmel már létezik fiók.";
  }
  if (message.includes("password should be")) return "A megadott jelszó nem felel meg a biztonsági követelményeknek.";
  if (message.includes("auth session missing")) {
    return "A munkamenet már nem érvényes. Nyisd meg újra a műveletet, vagy jelentkezz be ismét.";
  }

  return error?.message || "A művelet nem sikerült. Próbáld újra.";
}

function updateButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const menuLogout = document.getElementById("logoutBtnMenu");

  if (loginBtn && registerBtn) {
    if (identity) {
      loginBtn.textContent = profileNickname || identity.email || homeText("login", "Bejelentkezés");
      registerBtn.textContent = homeText("logout", "🚪 Kijelentkezés").replace(/^🚪\s*/, "");
    } else {
      loginBtn.textContent = homeText("login", "Bejelentkezés");
      registerBtn.textContent = homeText("register", "Regisztráció");
    }
  }

  if (menuLogout) {
    menuLogout.textContent = homeText("logout", "🚪 Kijelentkezés");
    menuLogout.hidden = !identity;
  }
}

async function maybeOpenProfile() {
  if (!identity) return;

  try {
    const profile = await loadMyProfile(getClient());
    profileNickname = profile?.nickname || "";
    updateButtons();

    if (!profile?.profile_completed) {
      await openProfilePanel();
    }
  } catch (error) {
    console.error("Shared profile completion check failed", error);
  }
}

async function performSignOut() {
  try {
    await signOut(getClient());
    identity = null;
    profileNickname = "";
    updateButtons();
  } catch (error) {
    console.error("Shared sign-out failed", error);
  }
}

async function handlePasswordResetRequest() {
  const email = document.getElementById("authEmail")?.value.trim() || "";

  if (!email) {
    setMessage("Előbb add meg az e-mail címedet.");
    document.getElementById("authEmail")?.focus();
    return;
  }

  setMessage("Jelszó-visszaállító e-mail küldése...");

  try {
    await requestPasswordReset(getClient(), {
      email,
      redirectTo: new URL("/?auth=password-reset", window.location.origin).href
    });

    setMessage(
      "Ha ehhez az e-mail címhez tartozik fiók, elküldtük a jelszó-visszaállító linket."
    );
  } catch (error) {
    console.error("Password reset request failed", error);
    setMessage(localizeAuthError(error));
  }
}

async function handleSubmit(event) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();

  const modal = document.getElementById("idesussAuthModal");
  const email = document.getElementById("authEmail")?.value.trim() || "";
  const password = document.getElementById("authPassword")?.value || "";
  const repeatPassword = document.getElementById("authPasswordRepeat")?.value || "";
  const mode = modal?.dataset.mode || "login";

  if (mode === "reset") {
    if (!password || !repeatPassword) {
      setMessage("Add meg kétszer az új jelszót.");
      return;
    }

    if (password !== repeatPassword) {
      setMessage("A két jelszó nem egyezik.");
      return;
    }

    if (password.length < 8) {
      setMessage("Az új jelszó legalább 8 karakter legyen.");
      return;
    }

    setMessage("Új jelszó mentése...");

    try {
      identity = await updatePassword(getClient(), { password });
      recoveryRequested = false;
      updateButtons();
      setMessage("A jelszó sikeresen megváltozott.");
      clearPasswordRecoveryLocation();
      window.setTimeout(closeAuthModal, 650);
    } catch (error) {
      console.error("Password update failed", error);
      setMessage(localizeAuthError(error));
    }
    return;
  }

  if (!email || !password) {
    setMessage("Add meg az e-mail címet és a jelszót.");
    return;
  }

  if (mode === "register") {
    if (password !== repeatPassword) {
      setMessage("A két jelszó nem egyezik.");
      return;
    }

    if (password.length < 8) {
      setMessage("A jelszó legalább 8 karakter legyen.");
      return;
    }
  }

  setMessage("Dolgozom...");

  try {
    const client = getClient();

    if (mode === "register") {
      const result = await signUp(client, {
        email,
        password,
        emailRedirectTo: new URL("/", window.location.origin).href
      });

      if (!result?.session) {
        identity = null;
        updateButtons();
        document.getElementById("authPassword").value = "";
        document.getElementById("authPasswordRepeat").value = "";
        closeAuthModal();
        showAuthToast("Regisztráció elküldve. Küldtünk egy megerősítő e-mailt; a fiók az e-mail-cím megerősítése után lesz aktív.");
        return;
      }

      identity = result.user;
      updateButtons();
      setMessage("Sikeres regisztráció.");
      closeAuthModal();
      await maybeOpenProfile();
      return;
    }

    identity = await signIn(client, { email, password });
    updateButtons();
    setMessage("Sikeres bejelentkezés.");
    window.setTimeout(closeAuthModal, 350);
    await maybeOpenProfile();
  } catch (error) {
    console.error("Shared auth action failed", error);

    if (mode === "register" && /already|registered|exists/i.test(error?.message || "")) {
      setMessage("Ezzel az e-mail címmel már létezik fiók. Jelentkezz be, vagy állítsd vissza a jelszavad.");
      return;
    }

    setMessage(localizeAuthError(error));
  }
}

function bindHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const menuLogout = document.getElementById("logoutBtnMenu");
  const submitBtn = document.getElementById("authSubmitBtn");
  const forgotBtn = document.getElementById("authForgotPassword");
  const modeSwitch = document.getElementById("authModeSwitch");

  loginBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    if (identity) {
      openProfilePanel();
    } else {
      openAuthModal("login");
    }
  });

  registerBtn?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!identity) {
      openAuthModal("register");
      return;
    }
    await performSignOut();
  });

  menuLogout?.addEventListener("click", async (event) => {
    event.preventDefault();
    await performSignOut();
  });

  submitBtn?.addEventListener("click", handleSubmit);
  forgotBtn?.addEventListener("click", handlePasswordResetRequest);
  modeSwitch?.addEventListener("click", () => {
    const modal = document.getElementById("idesussAuthModal");
    openAuthModal(modal?.dataset.mode === "register" ? "login" : "register");
  });

  window.addEventListener("idesuss:profile-saved", (event) => {
    if (!identity) return;
    profileNickname = event?.detail?.nickname || "";
    updateButtons();
  });
}

export async function initRootAuthController() {
  const client = getClient();
  ensureAuthModal();
  bindHandlers();

  recoveryRequested = isPasswordRecoveryLocation();

  if (unsubscribeAuth) unsubscribeAuth();
  unsubscribeAuth = subscribeAuthState(client, async (nextIdentity, event) => {
    identity = nextIdentity;
    profileNickname = "";
    updateButtons();

    if (event === "PASSWORD_RECOVERY") {
      recoveryRequested = true;
      openAuthModal("reset");
      setMessage("Állíts be egy új jelszót.");
      return;
    }

    if (identity && !recoveryRequested) await maybeOpenProfile();
  });

  try {
    identity = await currentIdentity(client);
  } catch (error) {
    console.error("Shared auth restore failed", error);
    identity = null;
  }

  profileNickname = "";
  updateButtons();

  if (recoveryRequested) {
    openAuthModal("reset");
    setMessage("Állíts be egy új jelszót.");
  } else if (identity) {
    await maybeOpenProfile();
  }

  return () => {
    unsubscribeAuth?.();
    unsubscribeAuth = null;
  };
}


window.addEventListener("idesuss:home-language-applied", () => {
  updateButtons();
});
