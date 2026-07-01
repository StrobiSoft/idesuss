const HOME_LANGUAGE_STORAGE_KEY = "idesuss_home_language";

const SUPPORTED_HOME_LANGUAGES = [
    "hu",
    "en",
    "nl",
    "ro",
    "pl"
];

function getSafeHomeLanguage(language) {
    if (SUPPORTED_HOME_LANGUAGES.includes(language)) {
        return language;
    }

    return "hu";
}

function getInitialHomeLanguage() {
    const storedLanguage = localStorage.getItem(
        HOME_LANGUAGE_STORAGE_KEY
    );

    if (storedLanguage) {
        return getSafeHomeLanguage(storedLanguage);
    }

    const browserLanguage = navigator.language
        .toLowerCase()
        .split("-")[0];

    return getSafeHomeLanguage(browserLanguage);
}

function getTranslationValue(section, key) {
    return key.split(".").reduce((current, part) => {
        if (!current || typeof current !== "object") {
            return undefined;
        }

        return current[part];
    }, section);
}

function applyHomeTranslations(section) {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        const value = getTranslationValue(section, key);

        if (typeof value === "string") {
            element.textContent = value;
        }
    });
}

async function loadHomeLanguage(language) {
    const safeLanguage = getSafeHomeLanguage(language);

    const languageModule = await import(
        `./modules/Home/lang/${safeLanguage}.js`
    );

    const homeLanguage = languageModule.default;

    document.documentElement.lang = safeLanguage;

    localStorage.setItem(
        HOME_LANGUAGE_STORAGE_KEY,
        safeLanguage
    );

    const languageSelect = document.getElementById("langSelect");

    if (languageSelect) {
        languageSelect.value = safeLanguage;
    }

    applyHomeTranslations(homeLanguage.home);

    return homeLanguage;
}

export async function initHomeLanguage() {
    const languageSelect = document.getElementById("langSelect");
    const initialLanguage = getInitialHomeLanguage();

    if (languageSelect) {
        languageSelect.addEventListener("change", async (event) => {
            try {
                await loadHomeLanguage(event.target.value);
            } catch {
                await loadHomeLanguage("hu");
            }
        });
    }

    return loadHomeLanguage(initialLanguage);
}