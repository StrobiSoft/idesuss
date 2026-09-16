import {
  currentIdentity,
  signIn,
  signOut,
  signUp,
  subscribeAuthState
} from "../shared/auth-service.js";
import { loadMyProfile } from "../shared/profile-service.js";
import { openProfilePanel } from "./profile.js";

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

function updateButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  if (!loginBtn || !registerBtn) return;

  if (identity) {
    loginBtn.textContent = identity.email || "Belépve";
    registerBtn.textContent = "Kijelentkezés";
  } else {
    loginBtn.textContent = "Bejelentkezés";
    registerBtn.textContent = "Regisztráció";
  }
}

function openAuth(mode) {
  if (typeof window.openAuthModal === "function") {
    window.openAuthModal(mode);
    return;
  }

  console.warn("Shared auth controller could not find the current auth shell.");
}

function closeAuth() {
  if (typeof window.closeAuthModal === "function") {
    window.closeAuthModal();
  }
}

function suppressGen1ProfileOnboarding() {
  // The profile UI is now served by the shared profile panel. Keep the old
  // modal code present for rollback, but stop it from becoming an active
  // consumer while the migration branch is being proven.
  if (typeof window.checkProfileCompletion === "function") {
    window.__idesussGen1CheckProfileCompletion = window.checkProfileCompletion;
    window.checkProfileCompletion = async () => {};
  }

  const oldModal = document.getElementById("idesussProfileModal");
  if (oldModal) oldModal.style.display = "none";
}

async function maybeOpenProfile() {
  if (!identity) return;

  try {
    const profile = await loadMyProfile(getClient());
    if (!profile?.profile_completed) {
      const oldModal = document.getElementById("idesussProfileModal");
      if (oldModal) oldModal.style.display = "none";
      await openProfilePanel();
    }
  } catch (error) {
    console.error("Shared profile completion check failed", error);
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
      identity = await currentIdentity(client);
      updateButtons();

      if (!identity) {
        setMessage("Regisztráció elküldve. Ellenőrizd az e-mail fiókodat, ha megerősítés szükséges.");
        return;
      }

      setMessage("Sikeres regisztráció.");
      closeAuth();
      await maybeOpenProfile();
      return;
    }

    identity = await signIn(client, { email, password });
    updateButtons();
    setMessage("Sikeres bejelentkezés.");
    window.setTimeout(closeAuth, 350);
    await maybeOpenProfile();
  } catch (error) {
    console.error("Shared auth action failed", error);
    setMessage(error?.message || "A művelet nem sikerült.");
  }
}

function bindCaptureHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const submitBtn = document.getElementById("authSubmitBtn");

  loginBtn?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (identity) {
        openProfilePanel();
      } else {
        openAuth("login");
      }
    },
    true
  );

  registerBtn?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!identity) {
        openAuth("register");
        return;
      }

      try {
        await signOut(getClient());
        identity = null;
        updateButtons();
      } catch (error) {
        console.error("Shared sign-out failed", error);
      }
    },
    true
  );

  submitBtn?.addEventListener("click", handleSubmit, true);
}

export async function initRootAuthController() {
  const client = getClient();
  suppressGen1ProfileOnboarding();
  bindCaptureHandlers();

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
    const oldModal = document.getElementById("idesussProfileModal");
    if (oldModal) oldModal.style.display = "none";
    if (identity) await maybeOpenProfile();
  });

  return () => {
    unsubscribeAuth?.();
    unsubscribeAuth = null;
  };
}
