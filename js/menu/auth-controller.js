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
import { shellT } from "../shared/shell-language.js";
import { openProfilePanel } from "./profile.js?v=20260921-prod-refresh1";
import {
  closeAuthModal,
  ensureAuthModal,
  openAuthModal,
  showAuthToast
} from "./auth-shell.js?v=20260921-prod-refresh1";

let identity = null;
let profileNickname = "";
let profileRole = "user";
let unsubscribeAuth = null;
let recoveryRequested = false;
let socialSummaryTimer = null;
let socialSummaryChannel = null;

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
    return shellT("authRateLimit");
  }
  if (message.includes("invalid login credentials")) return shellT("authInvalidCredentials");
  if (message.includes("email not confirmed")) return shellT("authEmailNotConfirmed");
  if (message.includes("user already registered") || message.includes("already registered")) {
    return shellT("authAlreadyRegistered");
  }
  if (message.includes("password should be")) return shellT("authPasswordRequirement");
  if (message.includes("auth session missing")) {
    return shellT("authSessionMissing");
  }

  return error?.message || shellT("authGenericFailed");
}

function updateButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const menuLogout = document.getElementById("logoutBtnMenu");
  const adminPanelBtn = document.getElementById("openAdminPanelBtn");
  const messagesBtn = document.getElementById("openMessagesBtn");
  const messagesBadge = document.getElementById("messagesUnreadBadge");

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

  if (adminPanelBtn) {
    adminPanelBtn.hidden = !identity || !["moderator", "admin", "owner"].includes(profileRole);
  }

  if (messagesBtn) {
    messagesBtn.hidden = !identity;
  }

  if (!identity && messagesBadge) {
    messagesBadge.hidden = true;
    messagesBadge.textContent = "";
  }
}

async function refreshSocialSummary() {
  const badge = document.getElementById("messagesUnreadBadge");
  if (!identity || !badge) return;

  try {
    const { data, error } = await getClient().rpc("get_social_summary");
    if (error) throw error;
    const unread = Number(data?.unread_messages || 0);
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread < 1;
  } catch (error) {
    console.error("Social summary load failed", error);
  }
}

function stopSocialSummaryWatch() {
  if (socialSummaryTimer) window.clearInterval(socialSummaryTimer);
  socialSummaryTimer = null;
  if (socialSummaryChannel) {
    getClient().removeChannel(socialSummaryChannel);
    socialSummaryChannel = null;
  }
}

function startSocialSummaryPolling() {
  stopSocialSummaryWatch();
  if (!identity) return;

  refreshSocialSummary();

  socialSummaryChannel = getClient()
    .channel(`idesuss-social-summary-${identity.id}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "direct_messages",
      filter: `recipient_id=eq.${identity.id}`
    }, refreshSocialSummary)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "friendships"
    }, refreshSocialSummary)
    .subscribe();

  // Fallback for reconnect gaps; Realtime is the primary path.
  socialSummaryTimer = window.setInterval(refreshSocialSummary, 60000);
}

async function maybeOpenProfile() {
  if (!identity) return;

  try {
    const profile = await loadMyProfile(getClient());
    profileNickname = profile?.nickname || "";
    profileRole = profile?.role || "user";
    updateButtons();
    startSocialSummaryPolling();

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
    profileRole = "user";
    stopSocialSummaryWatch();
    updateButtons();
  } catch (error) {
    console.error("Shared sign-out failed", error);
  }
}

async function handlePasswordResetRequest() {
  const email = document.getElementById("authEmail")?.value.trim() || "";

  if (!email) {
    setMessage(shellT("authEnterEmailFirst"));
    document.getElementById("authEmail")?.focus();
    return;
  }

  setMessage(shellT("authResetSending"));

  try {
    await requestPasswordReset(getClient(), {
      email,
      redirectTo: new URL("/?auth=password-reset", window.location.origin).href
    });

    setMessage(
      shellT("authResetSent")
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
      setMessage(shellT("authEnterPasswordTwice"));
      return;
    }

    if (password !== repeatPassword) {
      setMessage(shellT("authPasswordsMismatch"));
      return;
    }

    if (password.length < 8) {
      setMessage(shellT("authPasswordMin8"));
      return;
    }

    setMessage(shellT("authSavingPassword"));

    try {
      identity = await updatePassword(getClient(), { password });
      recoveryRequested = false;
      updateButtons();
      setMessage(shellT("authPasswordChanged"));
      clearPasswordRecoveryLocation();
      window.setTimeout(closeAuthModal, 650);
    } catch (error) {
      console.error("Password update failed", error);
      setMessage(localizeAuthError(error));
    }
    return;
  }

  if (!email || !password) {
    setMessage(shellT("authEnterEmailPassword"));
    return;
  }

  if (mode === "register") {
    if (password !== repeatPassword) {
      setMessage(shellT("authPasswordsMismatch"));
      return;
    }

    if (password.length < 8) {
      setMessage(shellT("authPasswordMin8"));
      return;
    }
  }

  setMessage(shellT("authWorking"));

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
        showAuthToast(shellT("authRegistrationSent"));
        return;
      }

      identity = result.user;
      updateButtons();
      setMessage(shellT("authRegistrationSuccess"));
      closeAuthModal();
      await maybeOpenProfile();
      return;
    }

    identity = await signIn(client, { email, password });
    updateButtons();
    setMessage(shellT("authLoginSuccess"));
    window.setTimeout(closeAuthModal, 350);
    await maybeOpenProfile();
  } catch (error) {
    console.error("Shared auth action failed", error);

    if (mode === "register" && /already|registered|exists/i.test(error?.message || "")) {
      setMessage(shellT("authAccountExistsHelp"));
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
    profileRole = "user";
    updateButtons();
    startSocialSummaryPolling();

    if (event === "PASSWORD_RECOVERY") {
      recoveryRequested = true;
      openAuthModal("reset");
      setMessage(shellT("authSetNewPassword"));
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
    setMessage(shellT("authSetNewPassword"));
  } else if (identity) {
    await maybeOpenProfile();
  }

  return () => {
    unsubscribeAuth?.();
    unsubscribeAuth = null;
    stopSocialSummaryWatch();
  };
}


window.addEventListener("idesuss:home-language-applied", () => {
  updateButtons();
});
