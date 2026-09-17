import { initRootAuthController } from "./auth-controller.js";
import { openProfilePanel } from "./profile.js";

const SETTINGS_STORAGE_KEY = "idesuss.home.settings.v1";

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeSettings(next) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
}

function ensureSettingsRuntimeStyle() {
  if (document.getElementById("homepageSettingsRuntimeStyle")) return;
  const style = document.createElement("style");
  style.id = "homepageSettingsRuntimeStyle";
  style.textContent = `
    html[data-idesuss-display="dark"] body {
      color-scheme: dark;
      background: linear-gradient(180deg, #0f172a 0%, #111827 100%) !important;
      color: #e5edf7 !important;
    }
    html[data-idesuss-display="dark"] .site-header,
    html[data-idesuss-display="dark"] .header-chip,
    html[data-idesuss-display="dark"] .card,
    html[data-idesuss-display="dark"] .feature-card,
    html[data-idesuss-display="dark"] .step-card,
    html[data-idesuss-display="dark"] .legal-card,
    html[data-idesuss-display="dark"] footer {
      background-color: #162033 !important;
      color: #e5edf7 !important;
      border-color: #334155 !important;
    }
    html[data-idesuss-display="dark"] .brand-title,
    html[data-idesuss-display="dark"] .section-title,
    html[data-idesuss-display="dark"] h1,
    html[data-idesuss-display="dark"] h2,
    html[data-idesuss-display="dark"] h3,
    html[data-idesuss-display="dark"] p,
    html[data-idesuss-display="dark"] .brand-subtitle,
    html[data-idesuss-display="dark"] .header-clock-inline {
      color: inherit;
    }
    #homepageSettingsPanel .settings-row {
      display: grid;
      gap: 8px;
      margin-top: 16px;
    }
    #homepageSettingsPanel .settings-label {
      font-weight: 800;
    }
    #homepageSettingsPanel .settings-hint {
      margin: 0;
      color: #5e748d;
      font-size: 12px;
      line-height: 1.4;
    }
    #homepageSettingsPanel .settings-choice-group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    #homepageSettingsPanel .settings-choice-group label,
    #homepageSettingsPanel .settings-switch-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 9px 10px;
      border: 1px solid #d7e0ea;
      border-radius: 12px;
      background: #f8fbff;
      font-size: 13px;
      font-weight: 700;
    }
    #homepageSettingsPanel input[type="range"] {
      width: 100%;
      accent-color: #0d5bd7;
    }
    #homepageSettingsPanel input[type="checkbox"],
    #homepageSettingsPanel input[type="radio"] {
      accent-color: #0d5bd7;
    }
    #homepageSettingsPanel .settings-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 18px;
    }
    #homepageSettingsPanel .settings-action-btn {
      min-height: 44px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 800;
      color: #17324d;
      background: #eef4fb;
      border: 1px solid #d7e0ea;
      box-shadow: none;
    }
    #homepageSettingsPanel .settings-action-btn::before {
      display: none !important;
      content: none !important;
    }
    #homepageSettingsPanel .settings-action-btn.settings-danger {
      color: #9b1c1c;
      background: #fff1f1;
      border-color: #f4c7c7;
    }
    @media (max-width: 520px) {
      #homepageSettingsPanel .settings-choice-group,
      #homepageSettingsPanel .settings-actions {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function resolveAutomaticDisplayMode() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyDisplayMode(mode) {
  ensureSettingsRuntimeStyle();
  const resolved = mode === "auto" ? resolveAutomaticDisplayMode() : mode;
  document.documentElement.dataset.idesussDisplay = resolved;
}

function applyBrightness(value) {
  const numeric = Math.min(130, Math.max(60, Number(value) || 100));
  document.documentElement.style.setProperty("--idesuss-user-brightness", String(numeric));
  document.body.style.filter = `brightness(${numeric / 100})`;
}

function restoreHomepageSettings() {
  const settings = readSettings();
  applyBrightness(settings.brightness ?? 100);
  applyDisplayMode(settings.displayMode || "auto");
}

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

function syncSettingsControls(panel) {
  const settings = readSettings();
  const brightness = panel.querySelector("#homepageSettingsBrightness");
  const brightnessValue = panel.querySelector("#homepageSettingsBrightnessValue");
  const mode = settings.displayMode || "auto";
  const alwaysOnTop = panel.querySelector("#homepageSettingsAlwaysOnTop");

  if (brightness) brightness.value = String(settings.brightness ?? 100);
  if (brightnessValue) brightnessValue.textContent = `${settings.brightness ?? 100}%`;
  panel.querySelector(`input[name="homepageDisplayMode"][value="${mode}"]`)?.click();
  if (alwaysOnTop) alwaysOnTop.checked = Boolean(settings.alwaysOnTop);
}

function ensureSettingsPanel() {
  let panel = document.getElementById("homepageSettingsPanel");
  if (panel) return panel;

  ensureSettingsCloseStyle();
  ensureSettingsRuntimeStyle();

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
    <div style="width:min(460px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:24px;padding:22px;box-shadow:0 24px 70px rgba(10,35,75,.28);color:#17324d;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;">
        <h2 id="homepageSettingsTitle" style="margin:0;font-size:22px;">Beállítások</h2>
        <button id="homepageSettingsClose" type="button" aria-label="Bezárás">×</button>
      </div>

      <div class="settings-row" style="margin-top:0;">
        <label class="settings-label" for="homepageSettingsLanguage">Nyelv</label>
        <select id="homepageSettingsLanguage" style="width:100%;min-height:46px;padding:10px 12px;border:1px solid #d7e0ea;border-radius:14px;background:#fff;color:#17324d;font:inherit;"></select>
      </div>

      <div class="settings-row">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
          <label class="settings-label" for="homepageSettingsBrightness">Kijelző fényereje</label>
          <span id="homepageSettingsBrightnessValue" style="font-weight:800;">100%</span>
        </div>
        <input id="homepageSettingsBrightness" type="range" min="60" max="130" step="5" value="100" />
      </div>

      <fieldset class="settings-row" style="border:0;padding:0;margin-inline:0;">
        <legend class="settings-label" style="padding:0;margin-bottom:8px;">Megjelenítési mód</legend>
        <div class="settings-choice-group">
          <label><input type="radio" name="homepageDisplayMode" value="light" /> Nappali</label>
          <label><input type="radio" name="homepageDisplayMode" value="dark" /> Éjszakai</label>
          <label><input type="radio" name="homepageDisplayMode" value="auto" /> Automatikus</label>
        </div>
      </fieldset>

      <div class="settings-row">
        <label class="settings-switch-row" for="homepageSettingsAlwaysOnTop">
          <input id="homepageSettingsAlwaysOnTop" type="checkbox" />
          <span>Always on top</span>
        </label>
        <p class="settings-hint">A beállítás eltárolható, de böngészőben az ablak tényleges rögzítését az operációs rendszer korlátozhatja.</p>
      </div>

      <div class="settings-actions">
        <button id="homepageSettingsShare" class="settings-action-btn" type="button">Megosztás</button>
        <button id="homepageSettingsLogout" class="settings-action-btn settings-danger" type="button">Kijelentkezés</button>
      </div>
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

  const brightness = panel.querySelector("#homepageSettingsBrightness");
  const brightnessValue = panel.querySelector("#homepageSettingsBrightnessValue");
  brightness?.addEventListener("input", () => {
    const value = Number(brightness.value);
    if (brightnessValue) brightnessValue.textContent = `${value}%`;
    const settings = { ...readSettings(), brightness: value };
    writeSettings(settings);
    applyBrightness(value);
  });

  panel.querySelectorAll('input[name="homepageDisplayMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const settings = { ...readSettings(), displayMode: input.value };
      writeSettings(settings);
      applyDisplayMode(input.value);
    });
  });

  panel.querySelector("#homepageSettingsAlwaysOnTop")?.addEventListener("change", (event) => {
    writeSettings({ ...readSettings(), alwaysOnTop: event.currentTarget.checked });
  });

  panel.querySelector("#homepageSettingsShare")?.addEventListener("click", async () => {
    const shareData = {
      title: "Idesüss",
      text: "Idesüss — nyilvános videólinkek egyszerűbb megnyitása",
      url: window.location.origin + window.location.pathname,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        window.alert("A linket a vágólapra másoltuk.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Share failed", error);
    }
  });

  panel.querySelector("#homepageSettingsLogout")?.addEventListener("click", () => {
    document.getElementById("logoutBtnMenu")?.click();
  });

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

  syncSettingsControls(panel);
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
    syncSettingsControls(panel);
    panel.hidden = false;
    panel.style.display = "flex";
    panel.querySelector("#homepageSettingsClose")?.focus();
  });

  document.getElementById("openWebappBtn")?.addEventListener("click", () => {
    window.location.assign(new URL("app/", window.location.href).href);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  restoreHomepageSettings();
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

window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", () => {
  if ((readSettings().displayMode || "auto") === "auto") applyDisplayMode("auto");
});

window.addEventListener("hashchange", handleRequestedPanel);
