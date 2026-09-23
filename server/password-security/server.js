import http from "node:http";
import crypto from "node:crypto";
import { createSpyTrap } from "../security/spy-trap.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8790);
const ALLOWED_ORIGIN = process.env.IDESUSS_PASSWORD_ALLOWED_ORIGIN || "https://idesuss.net";
const TRUST_PROXY = process.env.IDESUSS_TRUST_PROXY === "1";
const MAX_BODY_BYTES = Number(process.env.IDESUSS_PASSWORD_MAX_BODY_BYTES || 16 * 1024);
const MIN_PASSWORD_LENGTH = Number(process.env.IDESUSS_PASSWORD_MIN_LENGTH || 8);
const MAX_PASSWORD_LENGTH = Number(process.env.IDESUSS_PASSWORD_MAX_LENGTH || 1024);
const RATE_WINDOW_MS = Number(process.env.IDESUSS_PASSWORD_RATE_WINDOW_MS || 5 * 60 * 1000);
const RATE_MAX = Number(process.env.IDESUSS_PASSWORD_RATE_MAX || 20);
const HIBP_TIMEOUT_MS = Number(process.env.IDESUSS_HIBP_TIMEOUT_MS || 5000);

const PROD_HIBP_BASE = "https://api.pwnedpasswords.com";
const HIBP_BASE = process.env.NODE_ENV === "test" && process.env.IDESUSS_HIBP_BASE_URL
  ? process.env.IDESUSS_HIBP_BASE_URL.replace(/\/$/, "")
  : PROD_HIBP_BASE;

const rateEvents = new Map();
const spyTrap = createSpyTrap({
  service: "password_security_gateway",
  trustProxy: TRUST_PROXY
});

function safeLog(event, fields = {}) {
  const safe = {
    event,
    service: "password_security_gateway",
    at: new Date().toISOString()
  };

  for (const [key, value] of Object.entries(fields)) {
    if (["password","newPassword","repeatPassword","body","hash","sha1","suffix"].includes(key)) continue;
    safe[key] = value;
  }

  console.log(JSON.stringify(safe));
}

function clientKey(req) {
  if (TRUST_PROXY) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded.slice(0, 96);
  }
  return String(req.socket.remoteAddress || "unknown").slice(0, 96);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || "");
  const allowed = !origin || origin === ALLOWED_ORIGIN;
  return {
    allowed,
    headers: {
      ...(origin === ALLOWED_ORIGIN ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } : {}),
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "interest-cohort=()"
    }
  };
}

function json(req, res, status, payload, extraHeaders = {}) {
  const cors = corsHeaders(req);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...cors.headers,
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function spyResponse(req, res, level) {
  const response = spyTrap.response(level);
  return json(req, res, response.status, response.body);
}

function consumeRate(req) {
  const now = Date.now();
  const key = clientKey(req);
  const current = (rateEvents.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  current.push(now);
  rateEvents.set(key, current);

  if (current.length <= RATE_MAX) return true;

  spyTrap.record(req, {
    reason: "rate_anomaly",
    path: "/v1/security/password/check",
    requestSize: Number(req.headers["content-length"] || 0)
  });
  return false;
}

async function readJson(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("PAYLOAD_TOO_LARGE");
      error.code = "PAYLOAD_TOO_LARGE";
      error.size = size;
      throw error;
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    const error = new Error("EMPTY_BODY");
    error.code = "EMPTY_BODY";
    throw error;
  }

  try {
    return { value: JSON.parse(text), size };
  } catch {
    const error = new Error("INVALID_JSON");
    error.code = "INVALID_JSON";
    error.size = size;
    throw error;
  }
}

function validatePasswordPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok:false, reason:"invalid_schema" };
  }

  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== "password") {
    return { ok:false, reason:"unexpected_fields", detail:String(Math.max(0, keys.length - (keys.includes("password") ? 1 : 0))) };
  }

  if (typeof payload.password !== "string") {
    return { ok:false, reason:"invalid_password_type" };
  }

  const length = [...payload.password].length;
  if (length < MIN_PASSWORD_LENGTH) {
    return { ok:false, reason:"password_too_short" };
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return { ok:false, reason:"password_too_long" };
  }

  return { ok:true };
}

function parseHibpRange(body, suffix) {
  for (const rawLine of String(body || "").split(/\r?\n/)) {
    const [candidate, count] = rawLine.trim().split(":");
    if (!candidate) continue;
    if (candidate.toUpperCase() === suffix) {
      return Number.parseInt(count || "0", 10) || 1;
    }
  }
  return 0;
}

export async function checkCompromisedPassword(password, { fetchImpl = fetch } = {}) {
  const digest = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${HIBP_BASE}/range/${prefix}`, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "User-Agent": "Idesuss-Password-Security-Gateway/1.0",
        "Add-Padding": "true",
        "Accept": "text/plain"
      }
    });

    if (!response.ok) throw new Error(`HIBP_HTTP_${response.status}`);
    const count = parseHibpRange(await response.text(), suffix);
    return { compromised: count > 0 };
  } finally {
    clearTimeout(timeout);
  }
}

async function handlePasswordCheck(req, res) {
  const cors = corsHeaders(req);
  if (!cors.allowed) {
    const level = spyTrap.record(req, {
      reason: "origin_mismatch",
      path: "/v1/security/password/check"
    });
    return spyResponse(req, res, level >= 2 ? level : 2);
  }

  if (!consumeRate(req)) {
    return json(req, res, 429, {
      error: "rate_limited",
      retryAfterSeconds: Math.ceil(RATE_WINDOW_MS / 1000)
    }, {
      "Retry-After": String(Math.ceil(RATE_WINDOW_MS / 1000))
    });
  }

  let parsed;
  try {
    parsed = await readJson(req);
  } catch (error) {
    const reason = error?.code || "invalid_request";
    const level = spyTrap.record(req, {
      reason,
      path: "/v1/security/password/check",
      requestSize: Number(error?.size || req.headers["content-length"] || 0)
    });

    if (reason === "PAYLOAD_TOO_LARGE") return json(req, res, 413, { error:"payload_too_large" });
    if (level >= 2) return spyResponse(req, res, level);
    return json(req, res, 400, { error:"invalid_request" });
  }

  const validation = validatePasswordPayload(parsed.value);
  if (!validation.ok) {
    const suspicious = ["unexpected_fields","invalid_password_type"].includes(validation.reason);
    if (suspicious) {
      const level = spyTrap.record(req, {
        reason: validation.reason,
        path: "/v1/security/password/check",
        requestSize: parsed.size,
        detail: validation.detail
      });
      if (level >= 2) return spyResponse(req, res, level);
    }

    const status = validation.reason === "password_too_long" ? 413 : 400;
    return json(req, res, status, { error:validation.reason });
  }

  try {
    const result = await checkCompromisedPassword(parsed.value.password);
    safeLog("password_check", { result: result.compromised ? "rejected" : "passed" });

    if (result.compromised) {
      return json(req, res, 200, {
        ok:false,
        compromised:true,
        reason:"known_compromised_password"
      });
    }

    return json(req, res, 200, {
      ok:true,
      compromised:false
    });
  } catch (error) {
    safeLog("password_check_upstream_failed", {
      result:"unavailable",
      errorCode:String(error?.name || "Error").slice(0, 80)
    });
    return json(req, res, 503, {
      ok:false,
      error:"password_security_unavailable"
    });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");

    const trapLevel = spyTrap.inspectPath(req, url.pathname);
    if (trapLevel) return spyResponse(req, res, trapLevel);

    if (req.method === "OPTIONS") {
      const cors = corsHeaders(req);
      if (!cors.allowed) {
        const level = spyTrap.record(req, { reason:"origin_mismatch", path:url.pathname });
        return spyResponse(req, res, level >= 2 ? level : 2);
      }
      res.writeHead(204, cors.headers);
      return res.end();
    }

    if (url.pathname === "/healthz") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const level = spyTrap.record(req, { reason:"method_anomaly", path:url.pathname });
        if (level >= 2) return spyResponse(req, res, level);
        return json(req, res, 405, { error:"method_not_allowed" }, { "Allow":"GET, HEAD" });
      }
      return json(req, res, 200, { ok:true, service:"password-security" });
    }

    if (url.pathname === "/v1/security/password/check") {
      if (req.method !== "POST") {
        const level = spyTrap.record(req, { reason:"method_anomaly", path:url.pathname });
        if (level >= 2) return spyResponse(req, res, level);
        return json(req, res, 405, { error:"method_not_allowed" }, { "Allow":"POST, OPTIONS" });
      }
      return await handlePasswordCheck(req, res);
    }

    return json(req, res, 404, { error:"not_found" });
  } catch (error) {
    safeLog("gateway_error", { errorCode:String(error?.name || "Error").slice(0, 80) });
    if (!res.headersSent) return json(req, res, 500, { error:"internal_error" });
    res.destroy();
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

if (process.env.NODE_ENV !== "test-import") {
  server.listen(PORT, HOST, () => {
    safeLog("service_started", { host:HOST, port:PORT });
  });
}
