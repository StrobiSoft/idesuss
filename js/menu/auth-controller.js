import {
  currentIdentity,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  subscribeAuthState,
  updatePassword
} from "../shared/auth-service.js?v=20260920-auth2";
import { loadMyProfile } from "../shared/profile-service.js?v=20260920-auth2";
import { openProfilePanel } from "./profile.js?v=20260920-auth2";
import {
  closeAuthModal,
  ensureAuthModal,
  openAuthModal
} from "./auth-shell.js?v=20260920-auth2";

let identity = null;
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

function updateButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const menuLogout = document.getElementById("logoutBtnMenu");

  if (loginBtn && registerBtn) {
    if (identity) {
      loginBtn.textContent = identity.email || "Belépve";
      registerBtn.textContent = "Kijelentkezés";
    } else {
      loginBtn.textContent = "Bejelentkezés";
      registerBtn.textContent = "Regisztráció";
    }
  }

  if (menuLogout) {
    menuLogout.hidden = !identity;
  }
}

async function maybeOpenProfile() {
  if (!identity) return;

  try {
    const profile = await loadMyProfile(getClient());
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
    setMessage(error?.message || "A jelszó-visszaállító e-mail küldése nem sikerült.");
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
      setMessage(error?.message || "Az új jelszó mentése nem sikerült.");
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
      await signUp(client, { email, password });
      identity = await currentIdentity(client);
      updateButtons();

      if (!identity) {
        setMessage("Regisztráció elküldve. Ellenőrizd az e-mail fiókodat, ha megerősítés szükséges.");
        return;
      }

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

    setMessage(error?.message || "A művelet nem sikerült.");
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
}

export async function initRootAuthController() {
  const client = getClient();
  ensureAuthModal();
  bindHandlers();

  recoveryRequested = isPasswordRecoveryLocation();

  if (unsubscribeAuth) unsubscribeAuth();
  unsubscribeAuth = subscribeAuthState(client, async (nextIdentity, event) => {
    identity = nextIdentity;
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
