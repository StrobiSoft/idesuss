import {
  currentIdentity,
  signIn,
  signOut,
  signUp,
  subscribeAuthState
} from "../shared/auth-service.js";
import { loadMyProfile } from "../shared/profile-service.js";
import { openProfilePanel } from "./profile.js";
import {
  closeAuthModal,
  ensureAuthModal,
  openAuthModal
} from "./auth-shell.js";

let identity = null;
let unsubscribeAuth = null;

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

function localizeAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Hibás e-mail cím vagy jelszó.";
  if (message.includes("email not confirmed")) return "Az e-mail címed még nincs megerősítve. Ellenőrizd a postafiókodat.";
  if (message.includes("user already registered")) return "Ezzel az e-mail címmel már létezik fiók.";
  if (message.includes("password should be")) return "A megadott jelszó nem felel meg a biztonsági követelményeknek.";
  if (message.includes("auth session missing")) return "A regisztráció elkészült, de a belépéshez előbb erősítsd meg az e-mail címedet.";
  return "A művelet nem sikerült. Próbáld újra.";
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

  if (menuLogout) menuLogout.hidden = !identity;
}

async function maybeOpenProfile() {
  if (!identity) return;

  try {
    const profile = await loadMyProfile(getClient());
    if (!profile?.profile_completed) await openProfilePanel();
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

async function handleSubmit(event) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();

  const modal = document.getElementById("idesussAuthModal");
  const email = document.getElementById("authEmail")?.value.trim() || "";
  const password = document.getElementById("authPassword")?.value || "";
  const repeatPassword = document.getElementById("authPasswordRepeat")?.value || "";
  const mode = modal?.dataset.mode === "register" ? "register" : "login";

  if (!email || !password) {
    setMessage("Add meg az e-mail címet és a jelszót.");
    return;
  }

  if (mode === "register" && password !== repeatPassword) {
    setMessage("A két jelszó nem egyezik.");
    return;
  }

  setMessage("Dolgozom...");

  try {
    const client = getClient();

    if (mode === "register") {
      await signUp(client, { email, password });
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      const sessionUser = sessionData?.session?.user || null;
      identity = sessionUser
        ? { id: sessionUser.id, email: sessionUser.email || "" }
        : null;
      updateButtons();

      if (!identity) {
        setMessage("Regisztráció elküldve. Küldtünk egy megerősítő e-mailt. Kattints a levélben található linkre, majd jelentkezz be.");
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
    setMessage(localizeAuthError(error));
  }
}

function bindHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const menuLogout = document.getElementById("logoutBtnMenu");
  const submitBtn = document.getElementById("authSubmitBtn");

  loginBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    if (identity) openProfilePanel();
    else openAuthModal("login");
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
}

export async function initRootAuthController() {
  const client = getClient();
  ensureAuthModal();
  bindHandlers();

  try {
    identity = await currentIdentity(client);
  } catch (error) {
    console.error("Shared auth restore failed", error);
    identity = null;
  }

  updateButtons();
  if (identity) await maybeOpenProfile();

  if (unsubscribeAuth) unsubscribeAuth();
  unsubscribeAuth = subscribeAuthState(client, async (nextIdentity) => {
    identity = nextIdentity;
    updateButtons();
    if (identity) await maybeOpenProfile();
  });

  return () => {
    unsubscribeAuth?.();
    unsubscribeAuth = null;
  };
}
