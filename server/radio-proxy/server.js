import http from "node:http";
import dns from "node:dns/promises";
import net from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import { createSpyTrap } from "../security/spy-trap.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_REDIRECTS = 4;
const CONNECT_TIMEOUT_MS = 10_000;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HLS_SECRET = process.env.IDESUSS_RADIO_HLS_SECRET || "";
const spyTrap = createSpyTrap({
  service: "radio_proxy",
  trustProxy: process.env.IDESUSS_TRUST_PROXY === "1"
});

function spyTrapResponse(res, level) {
  const response = spyTrap.response(level);
  return json(res, response.status, response.body);
}

function loadStations() {
  let parsed;

  const override = process.env.IDESUSS_RADIO_STATIONS_JSON;
  if (override) {
    try {
      const legacy = JSON.parse(override);
      parsed = {
        schemaVersion: 1,
        stations: Object.entries(legacy).map(([id, value]) => ({
          id,
          name: typeof value === "object" ? String(value?.name || id) : id,
          sourceUrl: typeof value === "string" ? value : value?.sourceUrl,
          preferredLocale:
            typeof value === "object" && Array.isArray(value?.locales)
              ? String(value.locales[0] || "")
              : "",
          enabled: true
        }))
      };
    } catch {
      throw new Error("IDESUSS_RADIO_STATIONS_JSON is not valid JSON");
    }
  } else {
    parsed = JSON.parse(
      fs.readFileSync(new URL("./common-radio-catalog.json", import.meta.url), "utf8")
    );
  }

  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed?.stations)) {
    throw new Error("Canonical radio catalog is invalid");
  }

  const map = new Map();
  for (const value of parsed.stations) {
    const id = String(value?.id || "").trim();
    if (!ID_RE.test(id)) throw new Error(`Invalid station id: ${id}`);

    const sourceUrl = String(value?.sourceUrl || "").trim();
    const name = String(value?.name || id).trim() || id;
    const preferredLocale = String(value?.preferredLocale || "").trim().toLowerCase();
    const locales = preferredLocale ? [preferredLocale] : [];

    map.set(id, {
      id,
      name,
      sourceUrl,
      locales,
      info: String(value?.info || "").trim(),
      artwork: String(value?.artwork || "").trim(),
      homepage: String(value?.homepage || "").trim(),
      countryCode: String(value?.countryCode || "").trim().toUpperCase(),
      recommendedSlot: Number(value?.recommendedSlot) || 0,
      enabled: value?.enabled !== false
    });
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
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("UNSAFE_SOURCE_URL");
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

function corsHeaders() {
  return { "Access-Control-Allow-Origin": process.env.IDESUSS_RADIO_CORS_ORIGIN || "https://idesuss.net" };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    ...corsHeaders()
  });
  res.end(JSON.stringify(payload));
}

function isHls(upstream) {
  const type = String(upstream.headers.get("content-type") || "").toLowerCase();
  return type.includes("mpegurl") || type.includes("m3u8") || new URL(upstream.url).pathname.toLowerCase().endsWith(".m3u8");
}

function signHlsTarget(stationId, target) {
  if (!HLS_SECRET) throw new Error("HLS_SECRET_REQUIRED");
  return crypto.createHmac("sha256", HLS_SECRET).update(`${stationId}\n${target}`).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hlsProxyPath(stationId, target) {
  const u = Buffer.from(target).toString("base64url");
  const s = signHlsTarget(stationId, target);
  return `/v1/radio/hls/${stationId}?u=${encodeURIComponent(u)}&s=${encodeURIComponent(s)}`;
}

function resolveHlsTarget(stationId, encoded, signature) {
  if (!HLS_SECRET) throw new Error("HLS_SECRET_REQUIRED");
  const target = Buffer.from(String(encoded || ""), "base64url").toString("utf8");
  if (!target || !safeEqual(signature, signHlsTarget(stationId, target))) throw new Error("INVALID_HLS_TOKEN");
  return target;
}

function rewriteHlsManifest(text, stationId, baseUrl) {
  const rewrite = (raw) => {
    const value = String(raw || "").trim();
    if (!value || value.startsWith("data:")) return value;
    return hlsProxyPath(stationId, new URL(value, baseUrl).toString());
  };

  return String(text || "")
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      if (!line.startsWith("#")) return rewrite(line);
      return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${rewrite(uri)}"`);
    })
    .join("\n");
}

async function relayUpstream(req, res, stationId, upstream) {
  if (!upstream.ok || !upstream.body) return json(res,503,{error:"upstream_unavailable"});

  if (isHls(upstream)) {
    if (!HLS_SECRET) return json(res,503,{error:"hls_proxy_not_configured"});
    const manifest = rewriteHlsManifest(await upstream.text(), stationId, upstream.url);
    res.writeHead(200, {
      "Content-Type":"application/vnd.apple.mpegurl; charset=utf-8",
      "Cache-Control":"no-store, no-transform",
      "X-Content-Type-Options":"nosniff",
      ...corsHeaders()
    });
    if (req.method === "HEAD") return res.end();
    return res.end(manifest);
  }

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control":"no-store, no-transform",
    "X-Content-Type-Options":"nosniff",
    ...corsHeaders()
  });
  if (req.method === "HEAD") return res.end();

  const reader = upstream.body.getReader();
  req.on("close", () => reader.cancel().catch(()=>{}));
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    if (!res.write(value)) await new Promise(resolve => res.once("drain",resolve));
  }
  res.end();
}

function catalog(locale) {
  return [...stations.values()]
    .filter(s => s.enabled && (!locale || !s.locales.length || s.locales.includes(locale)))
    .map(s => ({
      id: s.id,
      name: s.name,
      info: s.info,
      artwork: s.artwork,
      homepage: s.homepage,
      countryCode: s.countryCode,
      recommendedSlot: s.recommendedSlot,
      playbackPath: `/v1/radio/stream/${s.id}`,
      enabled: true,
      preferred: Boolean(locale && s.locales[0] === locale && s.recommendedSlot === 1)
    }));
}

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method !== "GET" && req.method !== "HEAD") return json(res,405,{error:"method_not_allowed"});

    const trapLevel = spyTrap.inspectPath(req, url.pathname);
    if (trapLevel) return spyTrapResponse(res, trapLevel);

    if (url.pathname === "/healthz") return json(res,200,{ok:true,stations:stations.size});
    if (url.pathname === "/v1/radio/catalog") return json(res,200,{schemaVersion:1,stations:catalog(url.searchParams.get("locale") || "")});

    const streamMatch = /^\/v1\/radio\/stream\/([a-z0-9][a-z0-9-]{0,63})$/.exec(url.pathname);
    if (streamMatch) {
      const station = stations.get(streamMatch[1]);
      if (!station) return json(res,404,{error:"unknown_station"});
      const upstream = await fetchStream(station.sourceUrl);
      return relayUpstream(req, res, station.id, upstream);
    }

    const hlsMatch = /^\/v1\/radio\/hls\/([a-z0-9][a-z0-9-]{0,63})$/.exec(url.pathname);
    if (hlsMatch) {
      const station = stations.get(hlsMatch[1]);
      if (!station) return json(res,404,{error:"unknown_station"});
      const target = resolveHlsTarget(station.id, url.searchParams.get("u"), url.searchParams.get("s"));
      const upstream = await fetchStream(target);
      return relayUpstream(req, res, station.id, upstream);
    }

    return json(res,404,{error:"not_found"});
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res,503,{error:"stream_proxy_error"});
    else res.destroy();
  }
});

server.requestTimeout = 0;
server.headersTimeout = 15_000;
server.listen(PORT, HOST, () => console.log(`Idesuss radio proxy listening on http://${HOST}:${PORT}`));
