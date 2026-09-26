import { radioT } from "./radio-language.js";
import { RADIO_CLIENT_POLICY } from "./radio-policy.js";

const DIRECTORY_POLICY = RADIO_CLIENT_POLICY.directory;
const DIRECTORY_ENDPOINTS = Object.freeze([...DIRECTORY_POLICY.endpoints]);
const LOCALE_DEFAULTS = Object.freeze({ ...DIRECTORY_POLICY.localeDefaults });

function inferStreamType(row) {
  if (Number(row?.hls) === 1) return "hls";
  const codec = String(row?.codec || "").trim().toLowerCase();
  if (codec.includes("aac")) return "aac";
  if (codec.includes("mp3") || codec.includes("mpeg")) return "mp3";
  return "auto";
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function normalizeDirectoryStation(row) {
  const streamUrl = safeHttpsUrl(row?.url_resolved || row?.url);
  const name = String(row?.name || "").trim();
  const id = String(row?.stationuuid || "").trim();
  if (!streamUrl || !name || !id) return null;

  return {
    id: `directory-${id}`,
    name,
    info: [row?.country, row?.language, row?.tags].filter(Boolean).join(" · "),
    streamUrl,
    streamType: inferStreamType(row),
    enabled: true,
    catalogManaged: false,
    distributionStatus: "directory_resolved",
    sourceStatus: "configured",
    artwork: safeHttpsUrl(row?.favicon),
    homepage: safeHttpsUrl(row?.homepage),
    countryCode: String(row?.countrycode || "").trim().toUpperCase(),
    preferredLocale: "",
    recommendedSlot: 0,
    directoryStationUuid: id
  };
}

async function directoryFetch(path, params = {}) {
  let lastError = null;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const text = String(value ?? "").trim();
    if (text) search.set(key, text);
  });

  for (const endpoint of DIRECTORY_ENDPOINTS) {
    try {
      const url = `${endpoint}${path}${search.size ? `?${search.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`DIRECTORY_HTTP_${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("DIRECTORY_UNAVAILABLE");
}

export async function loadDirectoryFilters() {
  const [countries, languages] = await Promise.all([
    directoryFetch(DIRECTORY_POLICY.countriesPath, {
      hidebroken: String(DIRECTORY_POLICY.hideBroken),
      order: "name"
    }),
    directoryFetch(DIRECTORY_POLICY.languagesPath, {
      hidebroken: String(DIRECTORY_POLICY.hideBroken),
      order: "name"
    })
  ]);

  return {
    countries: (countries || [])
      .filter((item) => item?.name && item?.iso_3166_1)
      .map((item) => ({
        name: String(item.name).trim(),
        code: String(item.iso_3166_1).trim().toUpperCase(),
        count: Number(item.stationcount) || 0
      })),
    languages: (languages || [])
      .filter((item) => item?.name)
      .map((item) => ({
        name: String(item.name).trim(),
        count: Number(item.stationcount) || 0
      }))
  };
}

export async function searchDirectoryStations({
  name = "",
  countryCode = "",
  language = "",
  tag = "",
  limit = DIRECTORY_POLICY.defaultLimit
} = {}) {
  const rows = await directoryFetch(DIRECTORY_POLICY.searchPath, {
    name,
    countrycode: countryCode,
    language,
    tag,
    hidebroken: String(DIRECTORY_POLICY.hideBroken),
    is_https: String(DIRECTORY_POLICY.httpsOnly),
    order: DIRECTORY_POLICY.order,
    reverse: String(DIRECTORY_POLICY.reverse),
    limit: String(Math.max(
      1,
      Math.min(
        DIRECTORY_POLICY.maximumLimit,
        Number(limit) || DIRECTORY_POLICY.defaultLimit
      )
    ))
  });

  const seen = new Set();
  return (rows || [])
    .map(normalizeDirectoryStation)
    .filter((station) => {
      if (!station || seen.has(station.id)) return false;
      seen.add(station.id);
      return true;
    });
}

function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function createField(labelText, control) {
  const label = document.createElement("label");
  label.className = "radio-directory-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function createButton(text, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

function createDirectoryPanel() {
  let panel = document.getElementById("radioDirectoryPanel");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.id = "radioDirectoryPanel";
  panel.className = "radio-directory-panel";
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "radio-directory-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "radioDirectoryTitle");

  const head = document.createElement("div");
  head.className = "radio-directory-head";

  const title = document.createElement("h2");
  title.id = "radioDirectoryTitle";

  const close = createButton("×", "radio-directory-close");
  close.id = "radioDirectoryClose";
  close.setAttribute("aria-label", radioT("directoryClose"));

  head.append(title, close);

  const filters = document.createElement("div");
  filters.className = "radio-directory-filters";

  const search = document.createElement("input");
  search.id = "radioDirectoryName";
  search.type = "search";
  search.autocomplete = "off";

  const country = document.createElement("select");
  country.id = "radioDirectoryCountry";

  const language = document.createElement("select");
  language.id = "radioDirectoryLanguage";

  const genre = document.createElement("input");
  genre.id = "radioDirectoryGenre";
  genre.type = "search";
  genre.autocomplete = "off";

  filters.append(
    createField(radioT("directorySearch"), search),
    createField(radioT("directoryCountry"), country),
    createField(radioT("directoryLanguage"), language),
    createField(radioT("directoryGenre"), genre)
  );

  const actions = document.createElement("div");
  actions.className = "radio-directory-actions";
  const searchButton = createButton(radioT("directorySearchButton"), "radio-directory-search primary");
  searchButton.id = "radioDirectorySearchButton";
  actions.append(searchButton);

  const message = document.createElement("div");
  message.id = "radioDirectoryMessage";
  message.className = "radio-directory-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");

  const results = document.createElement("div");
  results.id = "radioDirectoryResults";
  results.className = "radio-directory-results";

  card.append(head, filters, actions, message, results);
  panel.append(card);
  document.body.append(panel);

  close.addEventListener("click", () => closeRadioDirectory());
  panel.addEventListener("click", (event) => {
    if (event.target === panel) closeRadioDirectory();
  });

  return panel;
}

let activeContext = null;
let filterCache = null;

function setMessage(text) {
  const node = document.getElementById("radioDirectoryMessage");
  if (node) node.textContent = text || "";
}

function fillSelect(select, items, selectedValue, allText, valueKey, labelKey) {
  select.replaceChildren(option("", allText));
  items.forEach((item) => {
    const value = item[valueKey];
    const label = item[labelKey];
    if (!value || !label) return;
    const node = option(value, item.count ? `${label} (${item.count})` : label);
    select.append(node);
  });
  select.value = selectedValue || "";
}

async function ensureFilters(locale) {
  if (!filterCache) {
    filterCache = await loadDirectoryFilters();
  }

  const country = document.getElementById("radioDirectoryCountry");
  const language = document.getElementById("radioDirectoryLanguage");
  fillSelect(
    country,
    filterCache.countries,
    LOCALE_DEFAULTS[locale]?.countryCode || "",
    radioT("directoryAllCountries"),
    "code",
    "name"
  );
  fillSelect(
    language,
    filterCache.languages,
    LOCALE_DEFAULTS[locale]?.language || "",
    radioT("directoryAllLanguages"),
    "name",
    "name"
  );
}

function stationMeta(station) {
  return String(station.info || "")
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
}

function renderResults(stations) {
  const results = document.getElementById("radioDirectoryResults");
  if (!results) return;
  results.replaceChildren();

  if (!stations.length) {
    setMessage(radioT("directoryNoResults"));
    return;
  }

  setMessage(radioT("directoryResultCount", { count: stations.length }));

  stations.forEach((station) => {
    const row = document.createElement("article");
    row.className = "radio-directory-result";

    const body = document.createElement("div");
    body.className = "radio-directory-result-copy";

    const name = document.createElement("strong");
    name.textContent = station.name;

    const meta = document.createElement("span");
    meta.textContent = stationMeta(station);

    body.append(name, meta);

    const controls = document.createElement("div");
    controls.className = "radio-directory-result-actions";

    const preview = createButton(radioT("directoryPreview"), "radio-directory-preview");
    preview.addEventListener("click", async () => {
      preview.disabled = true;
      try {
        await activeContext?.onPreview?.(station);
      } finally {
        preview.disabled = false;
      }
    });

    const save = createButton(radioT("directorySave"), "radio-directory-save primary");
    const canSave = Boolean(activeContext?.canSave);
    save.disabled = !canSave;
    save.title = canSave ? "" : radioT("directorySignInSave");
    save.addEventListener("click", async () => {
      if (!activeContext?.canSave) {
        setMessage(radioT("directorySignInSave"));
        return;
      }
      save.disabled = true;
      try {
        const ok = await activeContext?.onSave?.(station);
        if (ok !== false) {
          setMessage(radioT("directorySaved", {
            station: station.name,
            slot: activeContext.slot
          }));
        }
      } catch (error) {
        console.error("Radio directory preset save failed", error);
        setMessage(radioT("directorySaveError"));
      } finally {
        save.disabled = false;
      }
    });

    controls.append(preview, save);
    row.append(body, controls);
    results.append(row);
  });
}

async function runSearch() {
  const searchButton = document.getElementById("radioDirectorySearchButton");
  if (searchButton) searchButton.disabled = true;
  setMessage(radioT("directoryLoading"));

  try {
    const stations = await searchDirectoryStations({
      name: document.getElementById("radioDirectoryName")?.value || "",
      countryCode: document.getElementById("radioDirectoryCountry")?.value || "",
      language: document.getElementById("radioDirectoryLanguage")?.value || "",
      tag: document.getElementById("radioDirectoryGenre")?.value || ""
    });
    renderResults(stations);
  } catch (error) {
    console.error("Radio directory search failed", error);
    setMessage(radioT("directoryLoadError"));
  } finally {
    if (searchButton) searchButton.disabled = false;
  }
}

export async function openRadioDirectory({
  slot,
  locale,
  canSave = false,
  onPreview,
  onSave
}) {
  const panel = createDirectoryPanel();
  activeContext = { slot, locale, canSave, onPreview, onSave };

  document.getElementById("radioDirectoryTitle").textContent =
    radioT("directoryTitle", { slot });
  document.getElementById("radioDirectoryName").placeholder =
    radioT("directorySearchPlaceholder");
  document.getElementById("radioDirectoryGenre").placeholder =
    radioT("directoryGenrePlaceholder");
  document.getElementById("radioDirectorySearchButton").textContent =
    radioT("directorySearchButton");
  document.getElementById("radioDirectoryClose").setAttribute(
    "aria-label",
    radioT("directoryClose")
  );

  panel.hidden = false;
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("radio-directory-open");

  try {
    await ensureFilters(locale);
  } catch (error) {
    console.error("Radio directory filters failed", error);
    setMessage(radioT("directoryLoadError"));
  }

  const searchButton = document.getElementById("radioDirectorySearchButton");
  searchButton.onclick = runSearch;

  const nameInput = document.getElementById("radioDirectoryName");
  const genreInput = document.getElementById("radioDirectoryGenre");
  const keyHandler = (event) => {
    if (event.key === "Enter") runSearch();
  };
  nameInput.onkeydown = keyHandler;
  genreInput.onkeydown = keyHandler;

  await runSearch();
}

export function closeRadioDirectory() {
  const panel = document.getElementById("radioDirectoryPanel");
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("radio-directory-open");
  activeContext = null;
}
