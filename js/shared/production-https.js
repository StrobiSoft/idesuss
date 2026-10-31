const PRODUCTION_HOSTS = new Set(["idesuss.net", "www.idesuss.net"]);

export function productionHttpsTarget(location) {
  const hostname = String(location?.hostname || "").toLowerCase();
  if (!PRODUCTION_HOSTS.has(hostname)) return null;
  if (location.protocol === "https:" && hostname === "idesuss.net") return null;

  const target = new URL("https://idesuss.net/");
  target.pathname = location.pathname || "/";
  target.search = location.search || "";
  target.hash = location.hash || "";
  return target.href;
}

export function ensureSecureProductionOrigin(location = globalThis.location) {
  const target = productionHttpsTarget(location);
  if (!target) return true;
  location.replace(target);
  return false;
}

if (typeof window !== "undefined" && window.location) {
  ensureSecureProductionOrigin(window.location);
}
