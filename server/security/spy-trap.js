const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_ESCALATE_MS = 60 * 60 * 1000;

export const DEFAULT_PROBE_PATHS = Object.freeze([
  /^\/(?:\.env|\.git(?:\/|$)|wp-admin(?:\/|$)|phpmyadmin(?:\/|$)|admin(?:\/|$)|server-status$)/i,
  /(?:\.bak|\.sql|\.pem|id_rsa|passwd)$/i
]);

function sanitizeText(value, max = 240) {
  return String(value || "").replace(/[\r\n\u0000-\u001f\u007f]/g, " ").slice(0, max);
}

export function clientAddress(req, { trustProxy = false } = {}) {
  if (trustProxy) {
    const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return sanitizeText(forwarded, 96);
  }
  return sanitizeText(req.socket?.remoteAddress || "unknown", 96);
}

export function spyTrapPayload(level) {
  if (level === 1) {
    return {
      status: 404,
      body: {
        error: "not_found",
        notice: "Unusual access attempt detected. Thank you for your interest."
      }
    };
  }

  if (level === 2) {
    return {
      status: 403,
      body: {
        error: "access_denied",
        notice: "Repeated abnormal access attempts have been detected and are being recorded as a security event. Stop this activity."
      }
    };
  }

  return {
    status: 403,
    body: {
      error: "security_escalation",
      notice: "Continued abnormal access attempts are being preserved for security review and possible escalation to the relevant service provider or authorities."
    }
  };
}

export function createSpyTrap({
  service,
  trustProxy = false,
  windowMs = DEFAULT_WINDOW_MS,
  escalateMs = DEFAULT_ESCALATE_MS,
  probePaths = DEFAULT_PROBE_PATHS,
  logger = (entry) => console.warn(JSON.stringify(entry))
} = {}) {
  if (!service) throw new Error("Spy Trap service name is required.");

  const events = new Map();

  function prune(now) {
    for (const [key, values] of events) {
      const recent = values.filter((time) => now - time < escalateMs);
      if (recent.length) events.set(key, recent);
      else events.delete(key);
    }
  }

  function record(req, {
    reason = "abnormal_request",
    path = "",
    method = req.method || "",
    requestSize,
    detail
  } = {}) {
    const now = Date.now();
    prune(now);

    const key = clientAddress(req, { trustProxy });
    const previous = events.get(key) || [];
    const recent = previous.filter((time) => now - time < escalateMs);
    recent.push(now);
    events.set(key, recent);

    const withinWindow = recent.filter((time) => now - time < windowMs).length;
    const level = withinWindow >= 4 || recent.length >= 8 ? 3 : withinWindow >= 2 ? 2 : 1;

    const event = {
      event: "spy_trap",
      service,
      level,
      at: new Date(now).toISOString(),
      client: key,
      method: sanitizeText(method, 16),
      path: sanitizeText(path, 240),
      reason: sanitizeText(reason, 80),
      userAgent: sanitizeText(req.headers?.["user-agent"] || "", 240)
    };

    if (Number.isFinite(requestSize)) event.requestSize = Number(requestSize);
    if (detail) event.detail = sanitizeText(detail, 160);

    logger(event);
    return level;
  }

  function inspectPath(req, pathname) {
    if (!probePaths.some((pattern) => pattern.test(pathname))) return null;
    return record(req, { reason: "probe_path", path: pathname });
  }

  return Object.freeze({
    inspectPath,
    record,
    response(level) {
      return spyTrapPayload(level);
    }
  });
}
