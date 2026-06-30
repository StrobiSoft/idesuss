const SUPPORTED_HOME_LANGUAGES = ["hu", "en"];
const HOME_LANG_STORAGE_KEY = "idesuss_home_lang";

function getSafeHomeLanguage(langCode) {
  if (SUPPORTED_HOME_LANGUAGES.includes(langCode)) {
    return langCode;
  }
  return "hu";
}

function getInitialHomeLanguage() {
  const saved = window.localStorage.getItem(HOME_LANG_STORAGE_KEY);
  if (SUPPORTED_HOME_LANGUAGES.includes(saved)) {
    return saved;
  }

  const browserLanguage = (window.navigator.language || "hu").slice(0, 2).toLowerCase();
  return getSafeHomeLanguage(browserLanguage);
}

function getTranslationValue(section, key) {
  return key.split(".").reduce(function (current, part) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return current[part];
  }, section);
}

function applyHomeTranslations(section) {
  document.querySelectorAll("[data-i18n]").forEach(function (element) {
    const key = element.dataset.i18n;
    const value = getTranslationValue(section, key);

    if (typeof value === "string") {
      element.textContent = value;
    }
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
    languageSelect.value = safeLanguage;
  }

  applyHomeTranslations(homeTranslations);
}

export async function initHomeLanguage() {
  const languageSelect = document.getElementById("langSelect");
  const initialLanguage = getInitialHomeLanguage();

  if (languageSelect) {
    languageSelect.value = initialLanguage;
    languageSelect.addEventListener("change", function (event) {
      loadHomeLanguage(event.target.value).catch(function () {
        loadHomeLanguage("hu");
      });
    });
  }

  await loadHomeLanguage(initialLanguage);
}
