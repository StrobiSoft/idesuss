import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MNB_ENDPOINT = "https://www.mnb.hu/arfolyamok.asmx";
const SUPPORTED_QUOTES = new Set(["HUF", "EUR", "USD", "GBP", "CHF", "RON", "PLN", "BYN"]);
const DISPLAY_CANDIDATES = ["EUR", "USD", "GBP", "CHF", "HUF"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function parseRates(xml: string) {
  const dateMatch = xml.match(/<Day\s+date="([^"]+)"/i);
  const sourceDate = dateMatch?.[1] ?? null;
  const hufPerUnit: Record<string, number> = { HUF: 1 };
  const rateRe = /<Rate\s+unit="([^"]+)"\s+curr="([^"]+)">([^<]+)<\/Rate>/gi;

  for (const match of xml.matchAll(rateRe)) {
    const unit = Number(match[1] || "1");
    const code = String(match[2] || "").toUpperCase();
    const raw = Number(String(match[3]).replace(",", "."));
    if (code && Number.isFinite(raw) && Number.isFinite(unit) && unit > 0) {
      hufPerUnit[code] = raw / unit;
    }
  }

  return { sourceDate, hufPerUnit };
}

async function requestedQuote(req: Request) {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      return String(body?.quote || "HUF").toUpperCase();
    } catch {
      return "HUF";
    }
  }
  return String(new URL(req.url).searchParams.get("quote") || "HUF").toUpperCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requested = await requestedQuote(req);
  const quote = SUPPORTED_QUOTES.has(requested) ? requested : "HUF";

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCurrentExchangeRates xmlns="http://www.mnb.hu/webservices/" />
  </soap:Body>
</soap:Envelope>`;

  try {
    const upstream = await fetch(MNB_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": '"http://www.mnb.hu/webservices/GetCurrentExchangeRates"',
      },
      body: soapEnvelope,
    });

    if (!upstream.ok) throw new Error(`MNB upstream HTTP ${upstream.status}`);

    const soap = await upstream.text();
    const escapedResult = soap.match(/<GetCurrentExchangeRatesResult>([\s\S]*?)<\/GetCurrentExchangeRatesResult>/i)?.[1] || "";
    const decoded = escapedResult
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");

    const parsed = parseRates(decoded || soap);
    const quoteHuf = parsed.hufPerUnit[quote];
    if (!quoteHuf) throw new Error(`Missing MNB quote currency: ${quote}`);

    const targets = DISPLAY_CANDIDATES.filter((code) => code !== quote).slice(0, 4);
    const rates: Record<string, number> = {};
    for (const code of targets) {
      const targetHuf = parsed.hufPerUnit[code];
      if (!targetHuf) throw new Error(`Missing MNB rate: ${code}`);
      rates[code] = targetHuf / quoteHuf;
    }

    return new Response(JSON.stringify({
      quote,
      targets,
      provider: "MNB",
      providerLabel: "Magyar Nemzeti Bank",
      dataKind: "official-daily",
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