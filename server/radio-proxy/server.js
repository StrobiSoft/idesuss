import http from "node:http";
import dns from "node:dns/promises";
import net from "node:net";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_REDIRECTS = 4;
const CONNECT_TIMEOUT_MS = 10_000;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SPY_TRAP_WINDOW_MS = 15 * 60 * 1000;
const SPY_TRAP_ESCALATE_MS = 60 * 60 * 1000;
const spyTrapEvents = new Map();

const SPY_TRAP_PATHS = [
  /^\/(?:\.env|\.git(?:\/|$)|wp-admin(?:\/|$)|phpmyadmin(?:\/|$)|admin(?:\/|$)|server-status$)/i,
  /(?:\.bak|\.sql|\.pem|id_rsa|passwd)$/i
];

function clientAddress(req) {
  if (process.env.IDESUSS_TRUST_PROXY === "1") {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

function spyTrapState(req, pathname) {
  if (!SPY_TRAP_PATHS.some((pattern) => pattern.test(pathname))) return null;
  const now = Date.now();
  const key = clientAddress(req);
  const previous = spyTrapEvents.get(key) || [];
  const recent = previous.filter((time) => now - time < SPY_TRAP_ESCALATE_MS);
  recent.push(now);
  spyTrapEvents.set(key, recent);

  const withinWindow = recent.filter((time) => now - time < SPY_TRAP_WINDOW_MS).length;
  const level = withinWindow >= 4 || recent.length >= 8 ? 3 : withinWindow >= 2 ? 2 : 1;

  console.warn(JSON.stringify({
    event: "spy_trap",
    level,
    at: new Date(now).toISOString(),
    client: key,
    method: req.method,
    path: pathname,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 240)
  }));

  return level;
}

function spyTrapResponse(res, level) {
  if (level === 1) {
    return json(res, 404, {
      error: "not_found",
      notice: "Unusual access attempt detected. Thank you for your interest."
    });
  }
  if (level === 2) {
    return json(res, 403, {
      error: "access_denied",
      notice: "Repeated abnormal access attempts have been detected and are being recorded as a security event. Stop this activity."
    });
  }
  return json(res, 403, {
    error: "security_escalation",
    notice: "Continued abnormal access attempts are being preserved for security review and possible escalation to the relevant service provider or authorities."
  });
}

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

    const trapLevel = spyTrapState(req, url.pathname);
    if (trapLevel) return spyTrapResponse(res, trapLevel);

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
