import {
  getIdesussLanguage,
  setIdesussLanguage,
  subscribeIdesussLanguage,
  IDESUSS_SUPPORTED_LANGUAGES
} from "../shared/language-preference.js";

const THEME_KEY = "idesuss_theme";
const BRIGHTNESS_KEY = "idesuss_brightness";
const THEMES = new Set(["auto","light","dark"]);
const MIN_BRIGHTNESS = 60;
const MAX_BRIGHTNESS = 100;

let mediaQuery = null;
let mediaListener = null;
let unsubscribeLanguage = null;

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 6L18 18M18 6L6 18"></path>
  </svg>
`;

function homeText(key, fallback) {
  const value = window.idesussHomeTranslations?.[key];
  return typeof value === "string" && value ? value : fallback;
}

function getStoredTheme() {
  const value = localStorage.getItem(THEME_KEY);
  return THEMES.has(value) ? value : "auto";
}

function resolveTheme(theme = getStoredTheme()) {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function getStoredBrightness() {
  const stored = localStorage.getItem(BRIGHTNESS_KEY);
  if (stored === null || stored === "") return 100;

  const raw = Number(stored);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, Math.round(raw)));
}

function applyBrightness(value = getStoredBrightness()) {
  const safe = Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, Number(value) || 100));
  document.documentElement.style.setProperty("--idesuss-dim-opacity", String((100 - safe) / 100));
  return safe;
}

export function applySettingsPreferences() {
  const theme = getStoredTheme();
  document.documentElement.dataset.idesussTheme = resolveTheme(theme);
  document.documentElement.dataset.idesussThemePreference = theme;
  applyBrightness();

  if (!mediaQuery && window.matchMedia) {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaListener = () => {
      if (getStoredTheme() === "auto") {
        document.documentElement.dataset.idesussTheme = resolveTheme("auto");
      }
    };
    mediaQuery.addEventListener?.("change", mediaListener);
  }
}

function setThemePreference(theme) {
  const safe = THEMES.has(theme) ? theme : "auto";
  localStorage.setItem(THEME_KEY, safe);
  document.documentElement.dataset.idesussThemePreference = safe;
  document.documentElement.dataset.idesussTheme = resolveTheme(safe);
}

function setBrightnessPreference(value) {
  const safe = applyBrightness(value);
  localStorage.setItem(BRIGHTNESS_KEY, String(safe));
  return safe;
}

function closeSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  panel?.classList.remove("show");
  panel?.setAttribute("aria-hidden","true");
}

function renderSettingsPanel(panel) {
  const language = getIdesussLanguage();
  const theme = getStoredTheme();
  const brightness = getStoredBrightness();
  const signedIn = !document.getElementById("logoutBtnMenu")?.hidden;

  panel.innerHTML = `
    <div class="settings-panel-card" role="dialog" aria-modal="true" aria-labelledby="settingsPanelTitle">
      <button id="closeSettingsPanel" class="settings-panel-close icon-close-btn" type="button"
        aria-label="${homeText("settingsClose","Close")}" title="${homeText("settingsClose","Close")}">
        ${CLOSE_ICON}
      </button>

      <h2 id="settingsPanelTitle">${homeText("settingsTitle","Settings")}</h2>
      <p class="settings-panel-intro">${homeText("settingsIntro","Personalize the Idesüss web experience on this device.")}</p>

      <label class="settings-field">
        <span>${homeText("settingsLanguage","Language")}</span>
        <select id="settingsLanguage"></select>
      </label>

      <fieldset class="settings-field settings-theme-field">
        <legend>${homeText("settingsAppearance","Appearance")}</legend>
        <label><input type="radio" name="idesussTheme" value="auto" ${theme === "auto" ? "checked" : ""}> ${homeText("settingsThemeAuto","Automatic")}</label>
        <label><input type="radio" name="idesussTheme" value="light" ${theme === "light" ? "checked" : ""}> ${homeText("settingsThemeLight","Light")}</label>
        <label><input type="radio" name="idesussTheme" value="dark" ${theme === "dark" ? "checked" : ""}> ${homeText("settingsThemeDark","Dark")}</label>
      </fieldset>

      <label class="settings-field">
        <span>${homeText("settingsBrightness","Brightness")}: <strong id="settingsBrightnessValue">${brightness}%</strong></span>
        <input id="settingsBrightness" type="range" min="${MIN_BRIGHTNESS}" max="${MAX_BRIGHTNESS}" step="5" value="${brightness}">
      </label>

      <div class="settings-actions">
        <button id="settingsShare" class="menu-profile-btn" type="button">${homeText("settingsShare","Share Idesüss")}</button>
        ${signedIn ? `<button id="settingsLogout" class="menu-profile-btn settings-danger" type="button">${homeText("settingsLogout","Log out")}</button>` : ""}
      </div>

      <p id="settingsStatus" class="settings-status" aria-live="polite"></p>
    </div>
  `;

  panel.querySelector("#closeSettingsPanel")?.addEventListener("click", closeSettingsPanel);
  panel.addEventListener("click", (event) => {
    if (event.target === panel) closeSettingsPanel();
  }, { once: true });

  const languageSelect = panel.querySelector("#settingsLanguage");
  for (const code of IDESUSS_SUPPORTED_LANGUAGES) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code.toUpperCase();
    option.selected = code === language;
    languageSelect?.append(option);
  }

  languageSelect?.addEventListener("change", () => {
    setIdesussLanguage(languageSelect.value);
    renderSettingsPanel(panel);
  });

  panel.querySelectorAll('input[name="idesussTheme"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) setThemePreference(input.value);
    });
  });

  const brightnessInput = panel.querySelector("#settingsBrightness");
  brightnessInput?.addEventListener("input", () => {
    const safe = setBrightnessPreference(brightnessInput.value);
    const value = panel.querySelector("#settingsBrightnessValue");
    if (value) value.textContent = `${safe}%`;
  });

  panel.querySelector("#settingsShare")?.addEventListener("click", async () => {
    const status = panel.querySelector("#settingsStatus");
    const shareData = {
      title: "Idesüss",
      text: homeText("settingsShareText","Idesüss — simple access to supported public video links."),
      url: window.location.origin + "/"
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        if (status) status.textContent = homeText("settingsShareDone","Shared.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        if (status) status.textContent = homeText("settingsLinkCopied","Link copied.");
      }
    } catch (error) {
      if (error?.name !== "AbortError" && status) {
        status.textContent = homeText("settingsShareError","Sharing is not available right now.");
      }
    }
  });

  panel.querySelector("#settingsLogout")?.addEventListener("click", async () => {
    const logout = document.getElementById("logoutBtnMenu");
    if (!logout) return;
    closeSettingsPanel();
    logout.click();
  });
}

export function openSettingsPanel() {
  let panel = document.getElementById("settingsPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "settingsPanel";
    panel.className = "settings-panel";
    panel.setAttribute("aria-hidden","true");
    document.body.appendChild(panel);
  }

  renderSettingsPanel(panel);
  panel.classList.add("show");
  panel.setAttribute("aria-hidden","false");
}

export function initSettingsPreferences() {
  applySettingsPreferences();

  unsubscribeLanguage?.();
  unsubscribeLanguage = subscribeIdesussLanguage(() => {
    const panel = document.getElementById("settingsPanel");
    if (panel?.classList.contains("show")) renderSettingsPanel(panel);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettingsPanel();
  });

  return () => {
    unsubscribeLanguage?.();
    unsubscribeLanguage = null;
    mediaQuery?.removeEventListener?.("change", mediaListener);
    mediaQuery = null;
    mediaListener = null;
  };
}
