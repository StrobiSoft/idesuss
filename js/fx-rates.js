import { getIdesussLanguage } from "./shared/language-preference.js";

const LOCALES = {
  hu: "hu-HU",
  en: "en-GB",
  nl: "nl-NL",
  ro: "ro-RO",
  pl: "pl-PL",
  hr: "hr-HR",
  be: "be-BY"
};

const QUOTE_BY_LANGUAGE = {
  hu: "HUF",
  nl: "EUR",
  ro: "RON",
  pl: "PLN",
  hr: "EUR",
  be: "EUR"
};

let lastRequestKey = "";

function getLanguage() {
  return String(getIdesussLanguage?.() || document.documentElement.lang || "hu")
    .toLowerCase()
    .split(/[-_]/)[0];
}

function getLocale() {
  return LOCALES[getLanguage()] || LOCALES.hu;
}

function getEnglishQuote() {
  const locale = String(navigator.language || "").toUpperCase();
  if (locale.endsWith("-GB")) return "GBP";
  if (locale.endsWith("-US")) return "USD";
  if (locale.endsWith("-CH")) return "CHF";
  return "EUR";
}

function getQuoteCurrency() {
  const language = getLanguage();
  return language === "en" ? getEnglishQuote() : (QUOTE_BY_LANGUAGE[language] || "HUF");
}

function getFxTranslations() {
  return window.idesussHomeTranslations?.fx || {};
}

function t(key, fallback) {
  const value = getFxTranslations()[key];
  return typeof value === "string" && value ? value : fallback;
}

function formatRate(value) {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

function formatSourceDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function renderRates(payload) {
  const quote = payload?.quote || getQuoteCurrency();
  const targets = Array.isArray(payload?.targets) ? payload.targets : Object.keys(payload?.rates || {});
  const rows = Array.from(document.querySelectorAll(".fx-grid .fx-item"));

  rows.forEach((row, index) => {
    const code = targets[index];
    const labelEl = row.querySelector(".fx-code");
    const valueEl = row.querySelector(".fx-value");

    if (!code || payload?.rates?.[code] == null) {
      if (labelEl) labelEl.textContent = "—";
      if (valueEl) valueEl.textContent = "—";
      return;
    }

    if (labelEl) {
      labelEl.textContent = `${code}/${quote}`;
      labelEl.dataset.fxLabel = code;
    }
    if (valueEl) {
      valueEl.textContent = `${formatRate(payload.rates[code])} ${quote}`;
      valueEl.dataset.fxValue = code;
    }
  });

  const status = document.getElementById("fxStatus");
  const sourceDate = document.getElementById("fxSourceDate");

  if (sourceDate) {
    sourceDate.textContent = payload?.sourceDate
      ? t("sourceDate", "ECB rate date: {date}").replace("{date}", formatSourceDate(payload.sourceDate))
      : t("source", "ECB daily reference rate");
  }

  if (status) {
    status.dataset.state = "ok";
    status.textContent = t("updated", "updated");
  }
}

function renderError() {
  const status = document.getElementById("fxStatus");
  if (status) {
    status.dataset.state = "error";
    status.textContent = t("unavailable", "temporarily unavailable");
  }
}

function renderLoading() {
  const status = document.getElementById("fxStatus");
  if (status) {
    status.dataset.state = "loading";
    status.textContent = t("loading", "loading…");
  }
}

async function loadFxRates({ force = false } = {}) {
  renderLoading();

  try {
    const client = window.supabaseClient;
    if (!client?.functions?.invoke) {
      throw new Error("Supabase functions client is not available.");
    }

    const quote = getQuoteCurrency();
    const requestKey = `${getLanguage()}:${quote}`;
    if (!force && requestKey === lastRequestKey) return;

    const { data, error } = await client.functions.invoke("fx-rates", {
      method: "POST",
      body: { quote }
    });

    if (error) {
      console.error("FX Edge Function error", { error, data });
      throw error;
    }
    if (!data?.rates || !Object.keys(data.rates).length) {
      throw new Error("FX Edge Function returned no rates.");
    }
    lastRequestKey = requestKey;
    renderRates(data);
  } catch (error) {
    console.error("FX rates load failed", error);
    renderError();
  }
}

document.addEventListener("DOMContentLoaded", () => loadFxRates({ force: true }));
window.addEventListener("idesuss:home-language-applied", () => loadFxRates({ force: true }));
