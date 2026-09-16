import { initRootAuthController } from "./auth-controller.js";
import { openProfilePanel } from "./profile.js";

function handleRequestedPanel() {
  const hash = window.location.hash.toLowerCase();

  if (hash === "#profile") {
    openProfilePanel();
    return;
  }

  if (hash === "#login") {
    window.setTimeout(() => {
      document.getElementById("loginBtn")?.click();
    }, 0);
  }
}

function makeHomepageBrandStatic() {
  const brandLink = document.querySelector('header a.brand-wrap[href="#top"]');
  if (!brandLink) return;

  const brand = document.createElement("div");
  brand.className = brandLink.className;
  brand.setAttribute("aria-label", brandLink.getAttribute("aria-label") || "Idesüss");
  while (brandLink.firstChild) brand.appendChild(brandLink.firstChild);
  brandLink.replaceWith(brand);
}

function ensureOpenButtonDepth() {
  if (document.getElementById("idesussOpenButtonDepthStyle")) return;

  const style = document.createElement("style");
  style.id = "idesussOpenButtonDepthStyle";
  style.textContent = `
    #openBtn.btn-primary {
      box-shadow:
        inset 0 2px 0 rgba(255,255,255,.42),
        inset 0 -4px 7px rgba(0,0,0,.22),
        0 12px 24px rgba(8,52,138,.36),
        0 5px 9px rgba(0,0,0,.24) !important;
      transform: translateY(0);
    }
    #openBtn.btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow:
        inset 0 2px 0 rgba(255,255,255,.48),
        inset 0 -4px 8px rgba(0,0,0,.24),
        0 16px 30px rgba(8,52,138,.42),
        0 7px 12px rgba(0,0,0,.28) !important;
    }
    #openBtn.btn-primary:active:not(:disabled) {
      transform: translateY(1px);
      box-shadow:
        inset 0 4px 8px rgba(0,0,0,.26),
        inset 0 -2px 4px rgba(255,255,255,.30),
        0 4px 9px rgba(0,0,0,.25) !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureSettingsCloseStyle() {
  if (document.getElementById("homepageSettingsCloseStyle")) return;

  const style = document.createElement("style");
  style.id = "homepageSettingsCloseStyle";
  style.textContent = `
    #homepageSettingsClose {
      position: relative;
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      padding: 0 !important;
      border: 1px solid #d7e0ea !important;
      border-radius: 999px !important;
      background: #eef4fb !important;
      color: #17324d !important;
      font-size: 25px !important;
      font-weight: 800 !important;
      line-height: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: none !important;
      transform: none !important;
    }
    #homepageSettingsClose::before {
      display: none !important;
      content: none !important;
    }
    #homepageSettingsClose:hover,
    #homepageSettingsClose:active {
      box-shadow: none !important;
      transform: none !important;
      background: #e6eef8 !important;
    }
  `;
  document.head.appendChild(style);
}

function syncSettingsLanguageSelect(panel) {
  const settingsSelect = panel?.querySelector("#homepageSettingsLanguage");
  const sourceSelect = document.getElementById("langSelect");
  if (!settingsSelect || !sourceSelect) return;

  settingsSelect.innerHTML = sourceSelect.innerHTML;
  settingsSelect.value = sourceSelect.value;
}

function ensureSettingsPanel() {
  let panel = document.getElementById("homepageSettingsPanel");
  if (panel) return panel;

  ensureSettingsCloseStyle();

  panel = document.createElement("div");
  panel.id = "homepageSettingsPanel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "homepageSettingsTitle");
  panel.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 5000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(10, 20, 40, .52);
    backdrop-filter: blur(8px);
  `;

  panel.innerHTML = `
    <div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:22px;box-shadow:0 24px 70px rgba(10,35,75,.28);color:#17324d;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;">
        <h2 id="homepageSettingsTitle" style="margin:0;font-size:22px;">Beállítások</h2>
        <button id="homepageSettingsClose" type="button" aria-label="Bezárás">×</button>
      </div>
      <label for="homepageSettingsLanguage" style="display:block;font-weight:800;margin-bottom:8px;">Nyelv</label>
      <select id="homepageSettingsLanguage" style="width:100%;min-height:46px;padding:10px 12px;border:1px solid #d7e0ea;border-radius:14px;background:#fff;color:#17324d;font:inherit;"></select>
      <p style="margin:14px 0 0;color:#5e748d;font-size:13px;">A további beállítások később bővíthetők.</p>
    </div>
  `;

  document.body.appendChild(panel);

  const settingsSelect = panel.querySelector("#homepageSettingsLanguage");
  const sourceSelect = document.getElementById("langSelect");
  if (settingsSelect && sourceSelect) {
    syncSettingsLanguageSelect(panel);
    settingsSelect.addEventListener("change", () => {
      sourceSelect.value = settingsSelect.value;
      sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    sourceSelect.addEventListener("change", () => {
      syncSettingsLanguageSelect(panel);
    });
  }

  const close = () => {
    panel.hidden = true;
    panel.style.display = "none";
  };
  panel.querySelector("#homepageSettingsClose")?.addEventListener("click", close);
  panel.addEventListener("click", (event) => {
    if (event.target === panel) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
  });

  return panel;
}

function wireHomepageMenu() {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("idesussMenu");
  if (!toggle || !menu) return;

  toggle.setAttribute("aria-haspopup", "menu");
  toggle.setAttribute("aria-controls", "idesussMenu");
  toggle.setAttribute("aria-expanded", "false");

  const setOpen = (open) => {
    menu.style.display = open ? "flex" : "none";
    toggle.setAttribute("aria-expanded", String(open));
  };

  setOpen(false);
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && event.target !== toggle) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  let settingsBtn = document.getElementById("openSettingsBtn");
  if (!settingsBtn) {
    settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.id = "openSettingsBtn";
    settingsBtn.className = "idesussMenuBtn";
    settingsBtn.textContent = "⚙️ Beállítások";
    const logout = document.getElementById("logoutBtnMenu");
    menu.insertBefore(settingsBtn, logout || null);
  }

  settingsBtn.addEventListener("click", () => {
    setOpen(false);
    const panel = ensureSettingsPanel();
    syncSettingsLanguageSelect(panel);
    panel.hidden = false;
    panel.style.display = "flex";
    panel.querySelector("#homepageSettingsClose")?.focus();
  });

  document.getElementById("openWebappBtn")?.addEventListener("click", () => {
    window.location.assign(new URL("app/", window.location.href).href);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  makeHomepageBrandStatic();
  ensureOpenButtonDepth();
  wireHomepageMenu();

  const profileBtn = document.getElementById("openProfileBtn");
  profileBtn?.addEventListener("click", () => {
    openProfilePanel();
  });

  try {
    await initRootAuthController();
  } catch (error) {
    console.error("Shared root auth controller init failed", error);
  }

  handleRequestedPanel();
});

window.addEventListener("hashchange", handleRequestedPanel);
