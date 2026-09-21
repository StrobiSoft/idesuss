import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ECB_ENDPOINT = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const SUPPORTED_QUOTES = new Set(["HUF", "EUR", "USD", "GBP", "CHF", "RON", "PLN"]);
const DISPLAY_CANDIDATES = ["EUR", "USD", "GBP", "CHF", "HUF"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function parseRates(xml: string) {
  const sourceDate = xml.match(/<Cube\s+time=["']([^"']+)["']/i)?.[1] ?? null;
  const perEuro: Record<string, number> = { EUR: 1 };
  const rateRe = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([^"']+)["']\s*\/?\s*>/gi;

  for (const match of xml.matchAll(rateRe)) {
    const code = String(match[1] || "").toUpperCase();
    const rate = Number(match[2]);
    if (code && Number.isFinite(rate) && rate > 0) {
      perEuro[code] = rate;
    }
  }

  return { sourceDate, perEuro };
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requested = await requestedQuote(req);
  const quote = SUPPORTED_QUOTES.has(requested) ? requested : "EUR";

  try {
    const upstream = await fetch(ECB_ENDPOINT, {
      headers: {
        "Accept": "application/xml,text/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Idesuss-FX/1.0",
      },
    });

    if (!upstream.ok) throw new Error(`ECB upstream HTTP ${upstream.status}`);

    const xml = await upstream.text();
    const parsed = parseRates(xml);
    const quotePerEuro = parsed.perEuro[quote];
    if (!quotePerEuro) throw new Error(`Missing ECB quote currency: ${quote}`);

    const targets = DISPLAY_CANDIDATES.filter((code) => code !== quote).slice(0, 4);
    const rates: Record<string, number> = {};

    for (const code of targets) {
      const targetPerEuro = parsed.perEuro[code];
      if (!targetPerEuro) throw new Error(`Missing ECB rate: ${code}`);
      rates[code] = quotePerEuro / targetPerEuro;
    }

    return new Response(JSON.stringify({
      quote,
      targets,
      provider: "ECB",
      providerLabel: "European Central Bank",
      dataKind: "reference-daily",
      sourceDate: parsed.sourceDate,
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