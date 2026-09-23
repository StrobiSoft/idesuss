import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const base = "http://127.0.0.1:8790";
const allowedOrigin = "https://idesuss.net";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  let body = {};
  try { body = await response.json(); } catch {}
  return { status: response.status, body };
}

async function passwordCheck(password, origin = allowedOrigin, forwardedFor = "198.51.100.10") {
  return request("/v1/security/password/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": origin,
      "X-Forwarded-For": forwardedFor
    },
    body: JSON.stringify({ password })
  });
}

const knownCompromised = "12345678";
const safeCandidate = "Idesuss-" + crypto.randomBytes(48).toString("base64url");

const health = await request("/healthz");
assert(health.status === 200 && health.body?.ok === true, "health failed");

const compromised = await passwordCheck(knownCompromised, allowedOrigin, "198.51.100.11");
assert(compromised.status === 200, "compromised check HTTP failure");
assert(compromised.body?.compromised === true, "known compromised password not rejected");

const safe = await passwordCheck(safeCandidate, allowedOrigin, "198.51.100.12");
assert(safe.status === 200, "safe check HTTP failure");
assert(safe.body?.compromised === false, "safe candidate unexpectedly rejected");

const spyHeaders = { "X-Forwarded-For": "198.51.100.20" };
const spy1 = await request("/.env", { headers: spyHeaders });
const spy2 = await request("/.env", { headers: spyHeaders });
const spy3 = await request("/.env", { headers: spyHeaders });
const spy4 = await request("/.env", { headers: spyHeaders });
assert(spy1.status === 404, "Spy Trap first response unexpected");
assert(spy2.status === 403, "Spy Trap repeat response unexpected");
assert(spy3.status === 403 && spy4.status === 403, "Spy Trap escalation unexpected");

const wrongOrigin = await passwordCheck(safeCandidate, "https://example.invalid", "198.51.100.30");
assert(wrongOrigin.status === 403, "wrong Origin was not rejected");

const oversize = "x".repeat(17 * 1024);
const tooLarge = await passwordCheck(oversize, allowedOrigin, "198.51.100.40");
assert(tooLarge.status === 413, "oversized payload was not rejected");

const journal = execFileSync("journalctl", [
  "-u", "idesuss-password-security.service",
  "--since", "10 minutes ago",
  "--no-pager",
  "-o", "cat"
], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

assert(!journal.includes(knownCompromised), "plaintext compromised test password leaked to service log");
assert(!journal.includes(safeCandidate), "plaintext safe test password leaked to service log");

console.log(JSON.stringify({
  HEALTH: "PASS",
  HIBP_COMPROMISED: "PASS",
  HIBP_SAFE: "PASS",
  WRONG_ORIGIN: "PASS",
  OVERSIZE: "PASS",
  SPY_TRAP: "PASS",
  ZERO_PASSWORD_LOGGING: "PASS"
}));
