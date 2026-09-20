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
