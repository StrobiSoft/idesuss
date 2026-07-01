const HOME_LANGUAGE_STORAGE_KEY = "idesuss_home_language";

const SUPPORTED_HOME_LANGUAGES = [
  "hu",
  "en"

  ];

  function getSafeHomeLanguage(language) {
    if (SUPPORTED_HOME_LANGUAGES.includes(language)) {
        return language;
    }

    return "hu";
}


function getInitialHomeLanguage() {
    const storedLanguage = localStorage.getItem(HOME_LANGUAGE_STORAGE_KEY);

    if (storedLanguage) {
        return getSafeHomeLanguage(storedLanguage);
    }

    const browserLanguage = navigator.language
        .toLowerCase()
        .split("-")[0];

    return getSafeHomeLanguage(browserLanguage);
}


async function loadHomeLanguage(language) {
    const safeLanguage = getSafeHomeLanguage(language);

    const languageModule = await import(
        `./modules/Home/lang/${safeLanguage}.js`
    );

    return languageModule.default;
}


function applyHomeTranslations(section) {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        const value = section[key];

        if (typeof value === "string") {
            element.textContent = value;
        }
    });
}


export async function initHomeLanguage() {
    const language = getInitialHomeLanguage();
    const homeLanguage = await loadHomeLanguage(language);

    applyHomeTranslations(homeLanguage.home);

    localStorage.setItem(
        HOME_LANGUAGE_STORAGE_KEY,
        language
    );

    return homeLanguage;
}
