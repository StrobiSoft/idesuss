function getModal() {
  return document.getElementById("idesussAuthModal");
}

function ensureAuthStyles() {
  if (document.getElementById("idesussAuthStyles")) return;

  const style = document.createElement("style");
  style.id = "idesussAuthStyles";
  style.textContent = `
    .idesuss-auth-card {
      width: min(420px, calc(100% - 32px));
      border-radius: 28px;
      background: linear-gradient(180deg, #f8fbff, #e8f2ff);
      box-shadow: 0 30px 80px rgba(20, 80, 160, .35);
      padding: 24px;
      color: #142b4a;
      font-family: inherit;
    }

    #authModalClose {
      position: relative;
      display: grid !important;
      place-items: center !important;
      flex: 0 0 44px;
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      min-height: 44px !important;
      padding: 0 !important;
      border: 1px solid rgba(20, 43, 74, .12) !important;
      border-radius: 50% !important;
      background: #fff !important;
      color: #17324d !important;
      box-shadow: 0 8px 18px rgba(20, 43, 74, .18) !important;
      cursor: pointer;
      line-height: 1 !important;
      transform: none !important;
    }

    #authModalClose::before {
      display: none !important;
      content: none !important;
    }

    #authModalClose:hover,
    #authModalClose:active {
      transform: none !important;
      background: #f5f8fc !important;
    }

    #authModalClose svg {
      display: block;
      width: 22px;
      height: 22px;
      stroke: currentColor;
      stroke-width: 2.6;
      stroke-linecap: round;
      pointer-events: none;
    }

    .auth-secondary-action {
      appearance: none;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: #0d5bd7 !important;
      padding: 8px 4px !important;
      margin: 6px auto 0;
      display: block;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }

    .auth-secondary-action::before {
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
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(10, 20, 40, 0.55);
    backdrop-filter: blur(8px);
  `;

  modal.innerHTML = `
    <div class="idesuss-auth-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;">
        <h2 id="authModalTitle" style="margin:0;font-size:24px;">Bejelentkezés</h2>
        <button id="authModalClose" type="button" aria-label="Bezárás">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        </button>
      </div>

      <input id="authEmail" type="email" autocomplete="email" placeholder="E-mail cím" style="
        width:100%;box-sizing:border-box;margin-bottom:12px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(40,90,150,.25);font-size:16px;
      ">

      <input id="authPassword" type="password" autocomplete="current-password" placeholder="Jelszó" style="
        width:100%;box-sizing:border-box;margin-bottom:14px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(40,90,150,.25);font-size:16px;
      ">

      <input id="authPasswordRepeat" type="password" autocomplete="new-password" placeholder="Jelszó újra" style="
        width:100%;box-sizing:border-box;margin-bottom:14px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(40,90,150,.25);font-size:16px;display:none;
      ">

      <button id="authSubmitBtn" type="button" style="
        width:100%;border:0;border-radius:18px;padding:15px 18px;
        background:linear-gradient(135deg,#0f6fff,#4aa3ff);color:white;
        font-weight:800;font-size:16px;cursor:pointer;
        box-shadow:0 12px 28px rgba(20,100,220,.35);
      ">Bejelentkezés</button>

      <button id="authForgotPassword" type="button" class="auth-secondary-action">
        Elfelejtetted a jelszavad?
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
  document.getElementById("authModalClose")?.addEventListener("click", closeAuthModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeAuthModal();
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
  const password = document.getElementById("authPassword");
  const email = document.getElementById("authEmail");
  const forgot = document.getElementById("authForgotPassword");
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

  if (repeat) {
    repeat.style.display = register || reset ? "block" : "none";
    repeat.value = "";
  }

  if (password) {
    password.value = "";
    password.autocomplete = register || reset ? "new-password" : "current-password";
    password.placeholder = reset ? "Új jelszó" : "Jelszó";
  }

  if (forgot) {
    forgot.style.display = mode === "login" ? "block" : "none";
  }

  if (resetHelp) {
    resetHelp.hidden = !reset;
  }

  if (message) message.textContent = "";
  modal.style.display = "flex";
}

export function closeAuthModal() {
  const modal = getModal();
  if (modal) modal.style.display = "none";
}
