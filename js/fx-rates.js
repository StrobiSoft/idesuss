const SUPABASE_FUNCTION_URL =
  "https://aypymehochdhcisgkowy.supabase.co/functions/v1/fx-rates";

const PUBLISHABLE_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

const labels = {
  EUR: "EUR/HUF",
  USD: "USD/HUF",
  GBP: "GBP/HUF",
  CHF: "CHF/HUF"
};

function formatRate(value) {
  return new Intl.NumberFormat("hu-HU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

function renderRates(payload) {
  for (const [code, label] of Object.entries(labels)) {
    const valueEl = document.querySelector(`[data-fx-value="${code}"]`);
    const labelEl = document.querySelector(`[data-fx-label="${code}"]`);
    if (labelEl) labelEl.textContent = label;
    if (valueEl && payload?.rates?.[code] != null) {
      valueEl.textContent = `${formatRate(payload.rates[code])} Ft`;
    }
  }

  const status = document.getElementById("fxStatus");
  const sourceDate = document.getElementById("fxSourceDate");

  if (sourceDate) {
    sourceDate.textContent = payload?.sourceDate
      ? `MNB árfolyamnap: ${payload.sourceDate}`
      : "MNB napi hivatalos árfolyam";
  }

  if (status) {
    status.dataset.state = "ok";
    status.textContent = "frissítve";
  }
}

function renderError() {
  const status = document.getElementById("fxStatus");
  if (status) {
    status.dataset.state = "error";
    status.textContent = "átmenetileg nem elérhető";
  }
}

async function loadFxRates() {
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "GET",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`FX endpoint HTTP ${response.status}`);
    }

    const payload = await response.json();
    renderRates(payload);
  } catch (error) {
    console.error("FX rates load failed", error);
    renderError();
  }
}

document.addEventListener("DOMContentLoaded", loadFxRates);
