import { getIdesussLanguage } from "./shared/language-preference.js";

const labels = {
  EUR: "EUR/HUF",
  USD: "USD/HUF",
  GBP: "GBP/HUF",
  CHF: "CHF/HUF"
};

const LOCALES = {
  hu: "hu-HU",
  en: "en-GB",
  nl: "nl-NL",
  ro: "ro-RO",
  pl: "pl-PL",
  hr: "hr-HR",
  be: "be-BY"
};

let lastPayload = null;

function getLanguage() {
  return String(getIdesussLanguage?.() || document.documentElement.lang || "hu")
    .toLowerCase()
    .split(/[-_]/)[0];
}

function getLocale() {
  return LOCALES[getLanguage()] || LOCALES.hu;
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
  lastPayload = payload;

  for (const [code, label] of Object.entries(labels)) {
    const valueEl = document.querySelector(`[data-fx-value="${code}"]`);
    const labelEl = document.querySelector(`[data-fx-label="${code}"]`);

    if (labelEl) labelEl.textContent = label;
    if (valueEl && payload?.rates?.[code] != null) {
      valueEl.textContent = `${formatRate(payload.rates[code])} HUF`;
    }
  }

  const status = document.getElementById("fxStatus");
  const sourceDate = document.getElementById("fxSourceDate");

  if (sourceDate) {
    sourceDate.textContent = payload?.sourceDate
      ? t("sourceDate", "MNB rate date: {date}").replace("{date}", formatSourceDate(payload.sourceDate))
      : t("source", "MNB official daily rate");
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

async function loadFxRates() {
  renderLoading();

  try {
    const client = window.supabaseClient;
    if (!client?.functions?.invoke) {
      throw new Error("Supabase functions client is not available.");
    }

    const { data, error } = await client.functions.invoke("fx-rates", {
      method: "GET"
    });

    if (error) throw error;
    renderRates(data);
  } catch (error) {
    console.error("FX rates load failed", error);
    renderError();
  }
}

document.addEventListener("DOMContentLoaded", loadFxRates);
window.addEventListener("idesuss:home-language-applied", () => {
  if (lastPayload) renderRates(lastPayload);
  else renderLoading();
});
