import {
  getIdesussLanguage,
  setIdesussLanguage,
  subscribeIdesussLanguage,
  normalizeIdesussLanguage
} from "../shared/language-preference.js";

const SUPPORTED_HOME_LANGUAGES = ["hu", "en", "nl", "ro", "pl", "hr", "be"];
const HOME_LANGUAGE_ASSET_VERSION = "20260921-byn1";
let languageLoadRevision = 0;

function getSafeHomeLanguage(langCode) {
  const normalized = normalizeIdesussLanguage(langCode);
  return SUPPORTED_HOME_LANGUAGES.includes(normalized) ? normalized : "hu";
}

function getTranslationValue(section, key) {
  return key.split(".").reduce(function (current, part) {
    if (!current || typeof current !== "object") return undefined;
    return current[part];
  }, section);
}

function applyHomeTranslations(section) {
  document.querySelectorAll("[data-i18n]").forEach(function (element) {
    const key = element.dataset.i18n;
    const value = getTranslationValue(section, key);
    if (typeof value === "string") {
      const count = element.dataset.count;
      element.textContent = count != null ? value.replace("{count}", count) : value;
    }
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(function (element) {
    const key = element.dataset.i18nAriaLabel;
    const value = getTranslationValue(section, key);
    if (typeof value === "string") element.setAttribute("aria-label", value);
  });
}

export async function loadHomeLanguage(langCode, { persist = true } = {}) {
  const safeLanguage = getSafeHomeLanguage(langCode);
  const revision = ++languageLoadRevision;

  const [languageModule, fallbackModule] = await Promise.all([
    import("./modules/Home/lang/" + safeLanguage + ".js?v=" + HOME_LANGUAGE_ASSET_VERSION),
    safeLanguage === "hu"
      ? Promise.resolve(null)
      : import("./modules/Home/lang/hu.js?v=" + HOME_LANGUAGE_ASSET_VERSION)
  ]);

  if (revision !== languageLoadRevision) return;

  const selectedTranslations = languageModule.default.home || {};
  const fallbackTranslations = fallbackModule?.default?.home || {};
  const homeTranslations = {
    ...fallbackTranslations,
    ...selectedTranslations
  };

  window.idesussHomeTranslations = homeTranslations;
  document.documentElement.lang = safeLanguage;
  if (persist) setIdesussLanguage(safeLanguage);

  const languageSelect = document.getElementById("langSelect");
  if (languageSelect) languageSelect.value = safeLanguage;

  applyHomeTranslations(homeTranslations);
  window.dispatchEvent(new CustomEvent("idesuss:home-language-applied", {
    detail: { language: safeLanguage, translations: homeTranslations }
  }));
}

export async function initHomeLanguage() {
  const languageSelect = document.getElementById("langSelect");
  const initialLanguage = getSafeHomeLanguage(getIdesussLanguage());

  if (languageSelect) {
    languageSelect.value = initialLanguage;
    languageSelect.addEventListener("change", function (event) {
      loadHomeLanguage(event.target.value).catch(function (error) {
        console.error("Home language switch failed", error);
        loadHomeLanguage("hu");
      });
    });
  }

  subscribeIdesussLanguage((language) => {
    const safeLanguage = getSafeHomeLanguage(language);
    if (safeLanguage === document.documentElement.lang) return;
    loadHomeLanguage(safeLanguage, { persist: false }).catch(console.error);
  });

  await loadHomeLanguage(initialLanguage, { persist: false });
}
