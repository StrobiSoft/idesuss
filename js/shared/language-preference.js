export const IDESUSS_LANGUAGE_KEY = "idesuss_lang";
export const IDESUSS_SUPPORTED_LANGUAGES = Object.freeze(["hu", "en", "nl", "ro", "pl", "hr", "be"]);

const LEGACY_KEYS = Object.freeze(["idesuss_home_lang", "ides_lang"]);

export function normalizeIdesussLanguage(value, fallback = "en") {
  const code = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return IDESUSS_SUPPORTED_LANGUAGES.includes(code) ? code : fallback;
}

export function getIdesussLanguage() {
  const primary = window.localStorage.getItem(IDESUSS_LANGUAGE_KEY);
  if (IDESUSS_SUPPORTED_LANGUAGES.includes(primary)) return primary;

  for (const key of LEGACY_KEYS) {
    const legacy = window.localStorage.getItem(key);
    if (IDESUSS_SUPPORTED_LANGUAGES.includes(legacy)) {
      setIdesussLanguage(legacy, { notify: false });
      return legacy;
    }
  }

  return "en";
}

export function setIdesussLanguage(language, { notify = true } = {}) {
  const safeLanguage = normalizeIdesussLanguage(language);
  window.localStorage.setItem(IDESUSS_LANGUAGE_KEY, safeLanguage);

  // Keep old readers alive during the migration window.
  for (const key of LEGACY_KEYS) {
    window.localStorage.setItem(key, safeLanguage);
  }

  document.documentElement.lang = safeLanguage;

  if (notify) {
    window.dispatchEvent(new CustomEvent("idesuss:languagechange", {
      detail: { language: safeLanguage }
    }));
  }

  return safeLanguage;
}

export function subscribeIdesussLanguage(callback) {
  if (typeof callback !== "function") return () => {};

  const onCustom = (event) => callback(normalizeIdesussLanguage(event.detail?.language));
  const onStorage = (event) => {
    if (event.key === IDESUSS_LANGUAGE_KEY && event.newValue) {
      callback(normalizeIdesussLanguage(event.newValue));
    }
  };

  window.addEventListener("idesuss:languagechange", onCustom);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("idesuss:languagechange", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
