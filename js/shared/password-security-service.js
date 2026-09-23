const PASSWORD_CHECK_ENDPOINT = "https://security.idesuss.net/v1/security/password/check";
const HIBP_RANGE_ENDPOINT = "https://api.pwnedpasswords.com/range/";

export class PasswordSecurityError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "PasswordSecurityError";
    this.code = code;
  }
}

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function checkPasswordDirectWithHibp(password, { fetchImpl = fetch } = {}) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
    throw new PasswordSecurityError("PASSWORD_SECURITY_UNAVAILABLE");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(password)
  );
  const sha1 = hex(digest);
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  let response;
  try {
    response = await fetchImpl(`${HIBP_RANGE_ENDPOINT}${prefix}`, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: {
        "Accept": "text/plain"
      }
    });
  } catch {
    throw new PasswordSecurityError("PASSWORD_SECURITY_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new PasswordSecurityError(
      response.status === 429
        ? "PASSWORD_SECURITY_RATE_LIMITED"
        : "PASSWORD_SECURITY_UNAVAILABLE"
    );
  }

  const body = await response.text();
  const compromised = body.split(/\r?\n/).some((line) => {
    const [candidate, count] = line.trim().split(":");
    return candidate?.toUpperCase() === suffix && Number(count || 0) > 0;
  });

  if (compromised) {
    throw new PasswordSecurityError("PASSWORD_COMPROMISED");
  }

  return true;
}

async function checkPasswordViaGateway(password, {
  fetchImpl = fetch,
  endpoint = PASSWORD_CHECK_ENDPOINT
} = {}) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ password })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new PasswordSecurityError("PASSWORD_SECURITY_INVALID_RESPONSE");
  }

  if (response.status === 429) {
    throw new PasswordSecurityError("PASSWORD_SECURITY_RATE_LIMITED");
  }

  if (!response.ok) {
    throw new PasswordSecurityError("PASSWORD_SECURITY_UNAVAILABLE");
  }

  if (payload?.compromised === true || payload?.reason === "known_compromised_password") {
    throw new PasswordSecurityError("PASSWORD_COMPROMISED");
  }

  if (payload?.ok !== true || payload?.compromised !== false) {
    throw new PasswordSecurityError("PASSWORD_SECURITY_INVALID_RESPONSE");
  }

  return true;
}

export async function checkPasswordSecurity(password, {
  fetchImpl = fetch,
  endpoint = PASSWORD_CHECK_ENDPOINT,
  allowBrowserFallback = endpoint === PASSWORD_CHECK_ENDPOINT
} = {}) {
  try {
    return await checkPasswordViaGateway(password, { fetchImpl, endpoint });
  } catch (error) {
    if (error instanceof PasswordSecurityError) {
      if (error.code === "PASSWORD_COMPROMISED" || error.code === "PASSWORD_SECURITY_RATE_LIMITED") {
        throw error;
      }
      if (!allowBrowserFallback) throw error;
    } else if (!allowBrowserFallback) {
      throw error;
    }

    // Resilience path for the static GitHub Pages client until the VM101
    // public API route is online. The candidate stays local; only the
    // first 5 SHA-1 hex characters leave the browser.
    return checkPasswordDirectWithHibp(password, { fetchImpl });
  }
}
