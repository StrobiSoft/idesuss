import { applyHomepageSettingsLanguage } from "./home-settings-i18n.js";

const SUPPORTED_HOME_LANGUAGES = ["hu", "en", "nl", "ro", "pl", "be"];
const HOME_LANG_STORAGE_KEY = "idesuss_home_lang";

const HOME_LANGUAGE_LABELS = {
  hu: "HU Magyar",
  en: "GB English",
  nl: "NL Nederlands",
  ro: "RO Română",
  pl: "PL Polski",
  be: "BY Беларуская"
};

function syncHomeLanguageOptions(languageSelect) {
  if (!languageSelect) return;

  Array.from(languageSelect.options).forEach(function (option) {
    if (!SUPPORTED_HOME_LANGUAGES.includes(option.value)) {
      option.remove();
    }
  });

  SUPPORTED_HOME_LANGUAGES.forEach(function (code) {
    let option = languageSelect.querySelector(`option[value="${code}"]`);
    if (!option) {
      option = document.createElement("option");
      option.value = code;
      languageSelect.appendChild(option);
    }
    option.textContent = HOME_LANGUAGE_LABELS[code];
  });
}

function getSafeHomeLanguage(langCode) {
  return SUPPORTED_HOME_LANGUAGES.includes(langCode) ? langCode : "hu";
}

function getInitialHomeLanguage() {
  const saved = window.localStorage.getItem(HOME_LANG_STORAGE_KEY);
  if (SUPPORTED_HOME_LANGUAGES.includes(saved)) return saved;

  const browserLanguage = (window.navigator.language || "hu").slice(0, 2).toLowerCase();
  return getSafeHomeLanguage(browserLanguage);
}

function getTranslationValue(section, key) {
  return key.split(".").reduce(function (current, part) {
    if (!current || typeof current !== "object") return undefined;
    return current[part];
  }, section);
}

function applyHomeTranslations(section) {
  document.querySelectorAll("[data-i18n]").forEach(function (element) {
    const value = getTranslationValue(section, element.dataset.i18n);
    if (typeof value === "string") element.textContent = value;
  });
}

async function loadHomeLanguage(langCode) {
  const safeLanguage = getSafeHomeLanguage(langCode);
  const languageModule = await import("./modules/Home/lang/" + safeLanguage + ".js");
  const homeTranslations = languageModule.default.home || {};

  document.documentElement.lang = safeLanguage;
  window.localStorage.setItem(HOME_LANG_STORAGE_KEY, safeLanguage);

  const languageSelect = document.getElementById("langSelect");
  if (languageSelect) {
    syncHomeLanguageOptions(languageSelect);
    languageSelect.value = safeLanguage;
  }

  applyHomeTranslations(homeTranslations);
  applyHomepageSettingsLanguage(safeLanguage);
}

export async function initHomeLanguage() {
  const languageSelect = document.getElementById("langSelect");
  const initialLanguage = getInitialHomeLanguage();

  if (languageSelect) {
    syncHomeLanguageOptions(languageSelect);
    languageSelect.value = initialLanguage;
    languageSelect.addEventListener("change", function (event) {
      loadHomeLanguage(event.target.value).catch(function () {
        loadHomeLanguage("hu");
      });
    });
  }

  await loadHomeLanguage(initialLanguage);
}
