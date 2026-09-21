import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ECB_ENDPOINT = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const NBRB_ENDPOINT = "https://api.nbrb.by/exrates/rates?periodicity=0";
const SUPPORTED_QUOTES = new Set(["HUF", "EUR", "USD", "GBP", "CHF", "RON", "PLN", "BYN"]);
const DISPLAY_CANDIDATES = ["EUR", "USD", "GBP", "CHF", "HUF"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function parseEcbRates(xml: string) {
  const sourceDate = xml.match(/<Cube\s+time=["']([^"']+)["']/i)?.[1] ?? null;
  const perEuro: Record<string, number> = { EUR: 1 };
  const rateRe = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([^"']+)["']\s*\/?\s*>/gi;
  for (const match of xml.matchAll(rateRe)) {
    const code = String(match[1] || "").toUpperCase();
    const rate = Number(match[2]);
    if (code && Number.isFinite(rate) && rate > 0) perEuro[code] = rate;
  }
  return { sourceDate, perEuro };
}

function parseNbrbRates(rows: unknown) {
  const bynPerUnit: Record<string, number> = { BYN: 1 };
  let sourceDate: string | null = null;
  if (!Array.isArray(rows)) return { sourceDate, bynPerUnit };

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const code = String(item.Cur_Abbreviation || "").toUpperCase();
    const scale = Number(item.Cur_Scale || 1);
    const officialRate = Number(item.Cur_OfficialRate);
    const date = typeof item.Date === "string" ? item.Date.slice(0, 10) : null;
    if (!sourceDate && date) sourceDate = date;
    if (code && Number.isFinite(scale) && scale > 0 && Number.isFinite(officialRate) && officialRate > 0) {
      bynPerUnit[code] = officialRate / scale;
    }
  }
  return { sourceDate, bynPerUnit };
}

async function requestedQuote(req: Request) {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      return String(body?.quote || "EUR").toUpperCase();
    } catch {
      return "EUR";
    }
  }
  return String(new URL(req.url).searchParams.get("quote") || "EUR").toUpperCase();
}

async function fetchEcb() {
  const response = await fetch(ECB_ENDPOINT, {
    headers: {
      "Accept": "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Idesuss-FX/1.0",
    },
  });
  if (!response.ok) throw new Error(`ECB upstream HTTP ${response.status}`);
  return parseEcbRates(await response.text());
}

async function fetchNbrb() {
  const response = await fetch(NBRB_ENDPOINT, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Idesuss-FX/1.0",
    },
  });
  if (!response.ok) throw new Error(`NBRB upstream HTTP ${response.status}`);
  return parseNbrbRates(await response.json());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requested = await requestedQuote(req);
  const quote = SUPPORTED_QUOTES.has(requested) ? requested : "EUR";

  try {
    const ecb = await fetchEcb();
    const targets = DISPLAY_CANDIDATES.filter((code) => code !== quote).slice(0, 4);
    const rates: Record<string, number> = {};
    let sourceDate = ecb.sourceDate;
    let provider = "ECB";
    let providerLabel = "European Central Bank";

    if (quote === "BYN") {
      const nbrb = await fetchNbrb();
      provider = "ECB+NBRB";
      providerLabel = "European Central Bank + National Bank of the Republic of Belarus";
      sourceDate = nbrb.sourceDate || ecb.sourceDate;

      const bynPerEuro = nbrb.bynPerUnit.EUR;
      if (!bynPerEuro) throw new Error("Missing NBRB EUR/BYN reference rate.");

      for (const code of targets) {
        const direct = nbrb.bynPerUnit[code];
        if (direct) {
          rates[code] = direct;
        } else {
          const targetPerEuro = ecb.perEuro[code];
          if (!targetPerEuro) throw new Error(`Missing ECB rate for BYN cross: ${code}`);
          rates[code] = bynPerEuro / targetPerEuro;
        }
      }
    } else {
      const quotePerEuro = ecb.perEuro[quote];
      if (!quotePerEuro) throw new Error(`Missing ECB quote currency: ${quote}`);
      for (const code of targets) {
        const targetPerEuro = ecb.perEuro[code];
        if (!targetPerEuro) throw new Error(`Missing ECB rate: ${code}`);
        rates[code] = quotePerEuro / targetPerEuro;
      }
    }

    return new Response(JSON.stringify({
      quote,
      targets,
      provider,
      providerLabel,
      dataKind: "reference-daily",
      sourceDate,
      fetchedAt: new Date().toISOString(),
      refreshPolicySeconds: 300,
      rates,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("fx-rates failed", error);
    return new Response(JSON.stringify({
      error: "FX_UPSTREAM_FAILED",
      message: error instanceof Error ? error.message : "Unknown FX error",
      fetchedAt: new Date().toISOString(),
    }), {
      status: 502,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
});