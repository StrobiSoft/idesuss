function getModal() {
  return document.getElementById("idesussAuthModal");
}

function setAuthShellLocked(locked) {
  document.body?.classList.toggle("idesuss-auth-open", locked);

  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("idesussMenu");

  if (locked) {
    if (menu) menu.style.display = "none";
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-hidden", "true");
  } else {
    toggle?.removeAttribute("aria-hidden");
  }
}

function ensureAuthStyles() {
  if (document.getElementById("idesussAuthStyles")) return;

  const style = document.createElement("style");
  style.id = "idesussAuthStyles";
  style.textContent = `
    body.idesuss-auth-open {
      overflow: hidden !important;
    }

    body.idesuss-auth-open #menuToggle,
    body.idesuss-auth-open #idesussMenu {
      display: none !important;
      pointer-events: none !important;
    }

    .idesuss-auth-card {
      position: relative;
      width: min(420px, calc(100% - 32px));
      border-radius: 28px;
      background: linear-gradient(180deg, #f8fbff, #e8f2ff);
      box-shadow: 0 30px 80px rgba(20, 80, 160, .35);
      padding: 28px 24px 24px;
      color: #142b4a;
      font-family: inherit;
    }

    .idesuss-auth-head {
      display: flex;
      align-items: center;
      min-height: 48px;
      margin-bottom: 16px;
      padding-right: 58px;
    }

    #authModalTitle {
      margin: 0;
      font-size: 24px;
      line-height: 1.15;
    }

    #authModalClose {
      position: absolute !important;
      top: 18px !important;
      right: 18px !important;
      inset-inline-start: auto !important;
      display: grid !important;
      place-items: center !important;
      width: 46px !important;
      height: 46px !important;
      min-width: 46px !important;
      min-height: 46px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 1px solid rgba(20, 43, 74, .14) !important;
      border-radius: 999px !important;
      background: #ffffff !important;
      color: #17324d !important;
      box-shadow: 0 8px 18px rgba(20, 43, 74, .20) !important;
      cursor: pointer;
      line-height: 0 !important;
      transform: none !important;
      overflow: hidden;
    }

    #authModalClose::before,
    #authModalClose::after {
      display: none !important;
      content: none !important;
    }

    #authModalClose:hover,
    #authModalClose:active,
    #authModalClose:focus-visible {
      transform: none !important;
      background: #f4f8fd !important;
      color: #102b4d !important;
    }

    #authModalClose svg {
      display: block !important;
      width: 23px !important;
      height: 23px !important;
      margin: 0 !important;
      padding: 0 !important;
      stroke: currentColor !important;
      fill: none !important;
      stroke-width: 2.8 !important;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .auth-password-field {
      position: relative;
      width: 100%;
      margin-bottom: 14px;
    }

    .auth-password-field input {
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      padding: 14px 52px 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(40,90,150,.25);
      font-size: 16px;
    }

    .auth-password-toggle {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      width: 38px;
      height: 38px;
      min-width: 38px;
      min-height: 38px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #5b7088;
      cursor: pointer;
      box-shadow: none;
    }

    .auth-password-toggle:hover,
    .auth-password-toggle:focus-visible {
      background: rgba(13, 91, 215, .08);
      color: #0d5bd7;
      outline: none;
    }

    .auth-password-toggle svg {
      width: 21px;
      height: 21px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .auth-secondary-action {
      appearance: none;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: #0d5bd7 !important;
      padding: 9px 6px !important;
      margin: 8px auto 0;
      display: block;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.3;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
      transform: none !important;
    }

    .auth-secondary-action::before,
    .auth-secondary-action::after {
      display: none !important;
      content: none !important;
    }

    .auth-help {
      margin: 8px 0 0;
      color: #5b7088;
      font-size: 13px;
      line-height: 1.45;
      text-align: center;
    }

    .auth-mode-switch {
      margin-top: 2px;
      text-decoration: none;
    }

    @media (max-width: 520px) {
      .idesuss-auth-card {
        width: min(100% - 24px, 420px);
        padding: 26px 20px 22px;
        border-radius: 24px;
      }

      #authModalClose {
        top: 16px !important;
        right: 16px !important;
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
      }

      .idesuss-auth-head {
        padding-right: 54px;
      }
    }
  `;

  document.head.appendChild(style);
}

export function ensureAuthModal() {
  let modal = getModal();
  if (modal) return modal;

  ensureAuthStyles();

  modal = document.createElement("div");
  modal.id = "idesussAuthModal";
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: max(16px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
    background: rgba(10, 20, 40, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  `;

  modal.innerHTML = `
    <div class="idesuss-auth-card" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
      <div class="idesuss-auth-head">
        <h2 id="authModalTitle">Bejelentkezés</h2>
        <button id="authModalClose" type="button" aria-label="Bezárás" title="Bezárás">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6L18 18M18 6L6 18"></path>
          </svg>
        </button>
      </div>

      <input id="authEmail" type="email" autocomplete="email" placeholder="E-mail cím" style="
        width:100%;box-sizing:border-box;margin-bottom:12px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(40,90,150,.25);font-size:16px;
      ">

      <div class="auth-password-field" id="authPasswordField">
        <input id="authPassword" type="password" autocomplete="current-password" placeholder="Jelszó">
        <button class="auth-password-toggle" type="button" data-password-target="authPassword" aria-label="Jelszó megjelenítése" title="Jelszó megjelenítése">
          <svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
            <circle cx="12" cy="12" r="2.5"></circle>
          </svg>
          <svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true" hidden>
            <path d="M3 3l18 18"></path>
            <path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.1 3.9"></path>
            <path d="M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3-.5"></path>
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
          </svg>
        </button>
      </div>

      <div class="auth-password-field" id="authPasswordRepeatField" style="display:none;">
        <input id="authPasswordRepeat" type="password" autocomplete="new-password" placeholder="Jelszó újra">
        <button class="auth-password-toggle" type="button" data-password-target="authPasswordRepeat" aria-label="Jelszó megjelenítése" title="Jelszó megjelenítése">
          <svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
            <circle cx="12" cy="12" r="2.5"></circle>
          </svg>
          <svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true" hidden>
            <path d="M3 3l18 18"></path>
            <path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.1 3.9"></path>
            <path d="M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3-.5"></path>
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
          </svg>
        </button>
      </div>

      <button id="authSubmitBtn" type="button" style="
        width:100%;border:0;border-radius:18px;padding:15px 18px;
        background:linear-gradient(135deg,#0f6fff,#4aa3ff);color:white;
        font-weight:800;font-size:16px;cursor:pointer;
        box-shadow:0 12px 28px rgba(20,100,220,.35);
      ">Bejelentkezés</button>

      <button id="authForgotPassword" type="button" class="auth-secondary-action">
        Elfelejtetted a jelszavad?
      </button>

      <button id="authModeSwitch" type="button" class="auth-secondary-action auth-mode-switch">
        Nincs még fiókod? Regisztráció
      </button>

      <p id="authResetHelp" class="auth-help" hidden>
        Adj meg egy új jelszót kétszer, majd mentsd el.
      </p>

      <p id="authMessage" aria-live="polite" style="
        min-height:22px;margin:14px 0 0;font-size:14px;color:#47627f;text-align:center;
      "></p>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".auth-password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordTarget || "");
      if (!input) return;

      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Jelszó elrejtése" : "Jelszó megjelenítése");
      button.setAttribute("title", reveal ? "Jelszó elrejtése" : "Jelszó megjelenítése");
      button.setAttribute("aria-pressed", String(reveal));
      button.querySelector(".eye-open")?.toggleAttribute("hidden", reveal);
      button.querySelector(".eye-closed")?.toggleAttribute("hidden", !reveal);
      input.focus({ preventScroll: true });
    });
  });

  document.getElementById("authModalClose")?.addEventListener("click", closeAuthModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeAuthModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.style.display !== "none") closeAuthModal();
  });

  return modal;
}

export function openAuthModal(mode = "login") {
  const modal = ensureAuthModal();
  const register = mode === "register";
  const reset = mode === "reset";

  const title = document.getElementById("authModalTitle");
  const submit = document.getElementById("authSubmitBtn");
  const repeat = document.getElementById("authPasswordRepeat");
  const repeatField = document.getElementById("authPasswordRepeatField");
  const password = document.getElementById("authPassword");
  const email = document.getElementById("authEmail");
  const forgot = document.getElementById("authForgotPassword");
  const modeSwitch = document.getElementById("authModeSwitch");
  const resetHelp = document.getElementById("authResetHelp");
  const message = document.getElementById("authMessage");

  modal.dataset.mode = reset ? "reset" : register ? "register" : "login";

  if (title) {
    title.textContent = reset
      ? "Új jelszó beállítása"
      : register
        ? "Regisztráció"
        : "Bejelentkezés";
  }

  if (submit) {
    submit.textContent = reset
      ? "Új jelszó mentése"
      : register
        ? "Regisztráció"
        : "Bejelentkezés";
  }

  if (email) {
    email.style.display = reset ? "none" : "block";
  }

  if (repeatField) {
    repeatField.style.display = register || reset ? "block" : "none";
  }

  if (repeat) {
    repeat.value = "";
    repeat.type = "password";
  }

  if (password) {
    password.value = "";
    password.type = "password";
    password.autocomplete = register || reset ? "new-password" : "current-password";
    password.placeholder = reset ? "Új jelszó" : "Jelszó";
  }

  modal.querySelectorAll(".auth-password-toggle").forEach((button) => {
    button.setAttribute("aria-label", "Jelszó megjelenítése");
    button.setAttribute("title", "Jelszó megjelenítése");
    button.setAttribute("aria-pressed", "false");
    button.querySelector(".eye-open")?.removeAttribute("hidden");
    button.querySelector(".eye-closed")?.setAttribute("hidden", "");
  });

  if (forgot) {
    forgot.style.display = mode === "login" ? "block" : "none";
  }

  if (modeSwitch) {
    modeSwitch.style.display = reset ? "none" : "block";
    modeSwitch.textContent = register
      ? "Már van fiókod? Bejelentkezés"
      : "Nincs még fiókod? Regisztráció";
  }

  if (resetHelp) {
    resetHelp.hidden = !reset;
  }

  if (message) message.textContent = "";
  setAuthShellLocked(true);
  modal.style.display = "flex";

  window.setTimeout(() => {
    if (reset) {
      password?.focus();
    } else {
      email?.focus();
    }
  }, 0);
}

export function closeAuthModal() {
  const modal = getModal();
  if (modal) modal.style.display = "none";
  setAuthShellLocked(false);
}
