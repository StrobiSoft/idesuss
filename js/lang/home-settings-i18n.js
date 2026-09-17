const SETTINGS_TRANSLATIONS = {
  hu: {
    title: "Beállítások",
    close: "Bezárás",
    language: "Nyelv",
    brightness: "Kijelző fényereje",
    displayMode: "Megjelenítési mód",
    light: "Nappali",
    dark: "Éjszakai",
    auto: "Automatikus",
    alwaysOnTop: "Always on top",
    alwaysOnTopHint: "A beállítás eltárolható, de böngészőben az ablak tényleges rögzítését az operációs rendszer korlátozhatja.",
    share: "Megosztás",
    logout: "Kijelentkezés"
  },
  en: {
    title: "Settings",
    close: "Close",
    language: "Language",
    brightness: "Display brightness",
    displayMode: "Display mode",
    light: "Light",
    dark: "Dark",
    auto: "Automatic",
    alwaysOnTop: "Always on top",
    alwaysOnTopHint: "The preference can be saved, but browsers may be unable to keep the window on top because of operating-system restrictions.",
    share: "Share",
    logout: "Log out"
  },
  nl: {
    title: "Instellingen",
    close: "Sluiten",
    language: "Taal",
    brightness: "Schermhelderheid",
    displayMode: "Weergavemodus",
    light: "Licht",
    dark: "Donker",
    auto: "Automatisch",
    alwaysOnTop: "Altijd op voorgrond",
    alwaysOnTopHint: "De voorkeur kan worden opgeslagen, maar browsers kunnen het venster door beperkingen van het besturingssysteem mogelijk niet echt op de voorgrond houden.",
    share: "Delen",
    logout: "Uitloggen"
  },
  ro: {
    title: "Setări",
    close: "Închide",
    language: "Limbă",
    brightness: "Luminozitatea ecranului",
    displayMode: "Mod de afișare",
    light: "Luminos",
    dark: "Întunecat",
    auto: "Automat",
    alwaysOnTop: "Mereu deasupra",
    alwaysOnTopHint: "Preferința poate fi salvată, dar browserul poate să nu poată menține efectiv fereastra deasupra din cauza limitărilor sistemului de operare.",
    share: "Distribuie",
    logout: "Deconectare"
  },
  pl: {
    title: "Ustawienia",
    close: "Zamknij",
    language: "Język",
    brightness: "Jasność ekranu",
    displayMode: "Tryb wyświetlania",
    light: "Jasny",
    dark: "Ciemny",
    auto: "Automatyczny",
    alwaysOnTop: "Zawsze na wierzchu",
    alwaysOnTopHint: "Preferencję można zapisać, ale przeglądarka może nie być w stanie faktycznie utrzymywać okna na wierzchu z powodu ograniczeń systemu operacyjnego.",
    share: "Udostępnij",
    logout: "Wyloguj"
  },
  be: {
    title: "Налады",
    close: "Закрыць",
    language: "Мова",
    brightness: "Яркасць экрана",
    displayMode: "Рэжым адлюстравання",
    light: "Светлы",
    dark: "Цёмны",
    auto: "Аўтаматычны",
    alwaysOnTop: "Заўсёды зверху",
    alwaysOnTopHint: "Наладу можна захаваць, але браўзер можа не мець магчымасці фактычна трымаць акно зверху з-за абмежаванняў аперацыйнай сістэмы.",
    share: "Падзяліцца",
    logout: "Выйсці"
  }
};

let activeLanguage = "hu";
let observer = null;

function setText(selector, value) {
  if (!value) return;
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setChoiceText(value, text) {
  if (!text) return;
  const input = document.querySelector(`input[name="homepageDisplayMode"][value="${value}"]`);
  const label = input?.closest("label");
  if (!label) return;

  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = ` ${text}`;
  else label.append(document.createTextNode(` ${text}`));
}

function renderSettingsLanguage() {
  const panel = document.getElementById("homepageSettingsPanel");
  if (!panel) return;

  const t = SETTINGS_TRANSLATIONS[activeLanguage] || SETTINGS_TRANSLATIONS.hu;
  setText("#homepageSettingsTitle", t.title);
  setText('label[for="homepageSettingsLanguage"]', t.language);
  setText('label[for="homepageSettingsBrightness"]', t.brightness);
  setText("#homepageSettingsPanel legend.settings-label", t.displayMode);
  setChoiceText("light", t.light);
  setChoiceText("dark", t.dark);
  setChoiceText("auto", t.auto);
  setText("#homepageSettingsPanel .settings-switch-row span", t.alwaysOnTop);
  setText("#homepageSettingsPanel .settings-hint", t.alwaysOnTopHint);
  setText("#homepageSettingsShare", t.share);
  setText("#homepageSettingsLogout", t.logout);

  const closeButton = document.getElementById("homepageSettingsClose");
  if (closeButton) closeButton.setAttribute("aria-label", t.close);
}

function ensureObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver((mutations) => {
    const settingsAdded = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.id === "homepageSettingsPanel" || node.querySelector?.("#homepageSettingsPanel"))
      )
    );
    if (settingsAdded) renderSettingsLanguage();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function applyHomepageSettingsLanguage(languageCode) {
  activeLanguage = SETTINGS_TRANSLATIONS[languageCode] ? languageCode : "hu";
  ensureObserver();
  renderSettingsLanguage();
}
