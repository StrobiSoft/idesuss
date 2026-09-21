import http from "node:http";
import dns from "node:dns/promises";
import net from "node:net";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_REDIRECTS = 4;
const CONNECT_TIMEOUT_MS = 10_000;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function loadStations() {
  const raw = process.env.IDESUSS_RADIO_STATIONS_JSON || "{}";
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("IDESUSS_RADIO_STATIONS_JSON is not valid JSON"); }
  const map = new Map();
  for (const [id, value] of Object.entries(parsed)) {
    if (!ID_RE.test(id)) throw new Error(`Invalid station id: ${id}`);
    const sourceUrl = typeof value === "string" ? value : value?.sourceUrl;
    const name = typeof value === "object" ? String(value?.name || id) : id;
    const locales = typeof value === "object" && Array.isArray(value?.locales) ? value.locales.map(String) : [];
    map.set(id, { id, name, sourceUrl: String(sourceUrl || ""), locales });
  }
  return map;
}

const stations = loadStations();

function isForbiddenIp(address) {
  if (!net.isIP(address)) return true;
  if (address === "::1" || address === "::" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe8") || address.startsWith("fe9") || address.startsWith("fea") || address.startsWith("feb")) return true;
  if (net.isIPv4(address)) {
    const [a,b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return false;
}

async function validatePublicHttpsUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("UNSAFE_SOURCE_URL");
  const answers = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!answers.length || answers.some(({address}) => isForbiddenIp(address))) throw new Error("UNSAFE_SOURCE_HOST");
  return url;
}

async function fetchStream(url, redirects = 0) {
  const safe = await validatePublicHttpsUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    const upstream = await fetch(safe, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "audio/aac,audio/mpeg,application/vnd.apple.mpegurl,audio/*;q=0.9,*/*;q=0.1",
        "User-Agent": "Idesuss-Radio-Proxy/0.1"
      }
    });
    if ([301,302,303,307,308].includes(upstream.status)) {
      if (redirects >= MAX_REDIRECTS) throw new Error("TOO_MANY_REDIRECTS");
      const location = upstream.headers.get("location");
      if (!location) throw new Error("INVALID_REDIRECT");
      return fetchStream(new URL(location, safe).toString(), redirects + 1);
    }
    return upstream;
  } finally { clearTimeout(timeout); }
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" });
  res.end(JSON.stringify(payload));
}

function catalog(locale) {
  return [...stations.values()]
    .filter(s => !locale || !s.locales.length || s.locales.includes(locale))
    .map(s => ({ id:s.id, name:s.name, playbackPath:`/v1/radio/stream/${s.id}`, enabled:true, preferred:Boolean(locale && s.locales[0] === locale) }));
}

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method !== "GET" && req.method !== "HEAD") return json(res,405,{error:"method_not_allowed"});
    if (url.pathname === "/healthz") return json(res,200,{ok:true,stations:stations.size});
    if (url.pathname === "/v1/radio/catalog") return json(res,200,{schemaVersion:1,stations:catalog(url.searchParams.get("locale") || "")});

    const match = /^\/v1\/radio\/stream\/([a-z0-9][a-z0-9-]{0,63})$/.exec(url.pathname);
    if (!match) return json(res,404,{error:"not_found"});
    const station = stations.get(match[1]);
    if (!station) return json(res,404,{error:"unknown_station"});

    const upstream = await fetchStream(station.sourceUrl);
    if (!upstream.ok || !upstream.body) return json(res,503,{error:"upstream_unavailable"});

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control":"no-store, no-transform",
      "X-Content-Type-Options":"nosniff",
      "Access-Control-Allow-Origin": process.env.IDESUSS_RADIO_CORS_ORIGIN || "https://idesuss.net"
    });
    if (req.method === "HEAD") { res.end(); return; }
    const reader = upstream.body.getReader();
    req.on("close", () => reader.cancel().catch(()=>{}));
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      if (!res.write(value)) await new Promise(resolve => res.once("drain",resolve));
    }
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res,503,{error:"stream_proxy_error"});
    else res.destroy();
  }
});

server.requestTimeout = 0;
server.headersTimeout = 15_000;
server.listen(PORT, HOST, () => console.log(`Idesuss radio proxy listening on http://${HOST}:${PORT}`));
