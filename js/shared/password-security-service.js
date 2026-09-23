const PASSWORD_CHECK_ENDPOINT = "https://security.idesuss.net/v1/security/password/check";

export class PasswordSecurityError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "PasswordSecurityError";
    this.code = code;
  }
}

export async function checkPasswordSecurity(password, {
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
