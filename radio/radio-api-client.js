function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol !== "https:") return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getConfiguredRadioApiBase() {
  return normalizeApiBase(window.__IDESUSS_RADIO_API_BASE__);
}

export async function loadSharedRadioCatalog(locale, apiBase = getConfiguredRadioApiBase()) {
  if (!apiBase) return null;

  const url = new URL("/v1/radio/catalog", apiBase);
  if (locale) url.searchParams.set("locale", locale);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`RADIO_API_HTTP_${response.status}`);

  const payload = await response.json();
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload?.stations)) {
    throw new Error("RADIO_API_INVALID_CATALOG");
  }

  return payload.stations.map((station) => {
    const playbackPath = String(station?.playbackPath || "").trim();
    const playbackUrl = playbackPath ? new URL(playbackPath, apiBase).toString() : "";

    return {
      id: String(station?.id || "").trim(),
      name: String(station?.name || "").trim(),
      info: String(station?.info || "").trim(),
      artwork: String(station?.artwork || "").trim(),
      streamUrl: playbackUrl,
      streamType: "auto",
      enabled: station?.enabled !== false,
      catalogManaged: true,
      distributionStatus: "approved",
      sourceStatus: playbackUrl ? "configured" : "unconfigured",
      isLocaleFavorite: Boolean(station?.preferred)
    };
  }).filter((station) => station.id && station.name && station.enabled);
}
