function getModal() {
  return document.getElementById("idesussAuthModal");
}

export function ensureAuthModal() {
  let modal = getModal();
  if (modal) return modal;

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
    <div style="
      width: min(420px, calc(100% - 32px));
      border-radius: 28px;
      background: linear-gradient(180deg, #f8fbff, #e8f2ff);
      box-shadow: 0 30px 80px rgba(20, 80, 160, .35);
      padding: 24px;
      color: #142b4a;
      font-family: inherit;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;">
        <h2 id="authModalTitle" style="margin:0;font-size:24px;">Bejelentkezés</h2>
        <button id="authModalClose" type="button" aria-label="Bezárás" style="
          border:0;
          background:#ffffff;
          border-radius:999px;
          width:38px;
          height:38px;
          cursor:pointer;
          font-size:20px;
        ">×</button>
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
  const title = document.getElementById("authModalTitle");
  const submit = document.getElementById("authSubmitBtn");
  const repeat = document.getElementById("authPasswordRepeat");
  const password = document.getElementById("authPassword");
  const message = document.getElementById("authMessage");

  modal.dataset.mode = register ? "register" : "login";
  if (title) title.textContent = register ? "Regisztráció" : "Bejelentkezés";
  if (submit) submit.textContent = register ? "Regisztráció" : "Bejelentkezés";
  if (repeat) {
    repeat.style.display = register ? "block" : "none";
    repeat.value = "";
  }
  if (password) password.autocomplete = register ? "new-password" : "current-password";
  if (message) message.textContent = "";
  modal.style.display = "flex";
}

export function closeAuthModal() {
  const modal = getModal();
  if (modal) modal.style.display = "none";
}
