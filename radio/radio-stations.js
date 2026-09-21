export const RADIO_STATIONS = Object.freeze([]);

export const RADIO_FAVORITES_BY_LOCALE = Object.freeze({
  hu: Object.freeze({ id: "fav-hu-retro", name: "Retro Rádió", directoryName: "Retro Rádió", countryCode: "HU" }),
  en: Object.freeze({ id: "fav-en-bbc-radio-2", name: "BBC Radio 2", directoryName: "BBC Radio 2", countryCode: "GB" }),
  nl: Object.freeze({ id: "fav-nl-npo-radio-2", name: "NPO Radio 2", directoryName: "NPO Radio 2", countryCode: "NL" }),
  ro: Object.freeze({ id: "fav-ro-kiss-fm", name: "Kiss FM", directoryName: "Kiss FM", countryCode: "RO" }),
  pl: Object.freeze({ id: "fav-pl-rmf-fm", name: "RMF FM", directoryName: "RMF FM", countryCode: "PL" }),
  hr: Object.freeze({ id: "fav-hr-bravo", name: "bravo!", directoryName: "bravo!", countryCode: "HR" }),
  be: Object.freeze({ id: "fav-be-radio-roks", name: "Радио РОКС", directoryName: "Радио РОКС", countryCode: "BY" })
});

const RADIO_DIRECTORY_ENDPOINTS = Object.freeze([
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
]);

function normalizedLocale(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "";
  return value.split(/[-_]/)[0];
}

export function detectRadioLocale() {
  const candidates = [
    window.localStorage?.getItem("idesuss_lang"),
    window.localStorage?.getItem("idesuss_home_lang"),
    window.localStorage?.getItem("ides_lang"),
    document.documentElement?.lang,
    window.navigator?.language
  ];
  for (const candidate of candidates) {
    const locale = normalizedLocale(candidate);
    if (RADIO_FAVORITES_BY_LOCALE[locale]) return locale;
  }
  return "hu";
}

export function getLocaleFavoriteStationSeed(locale = detectRadioLocale()) {
  const config = RADIO_FAVORITES_BY_LOCALE[normalizedLocale(locale)] || RADIO_FAVORITES_BY_LOCALE.hu;
  return normalizeRadioStation({
    id: config.id,
    name: config.name,
    info: "Ajánlott kezdőállomás",
    streamUrl: "",
    streamType: "auto",
    enabled: true,
    catalogManaged: true,
    distributionStatus: "approved",
    sourceStatus: "resolving",
    directoryName: config.directoryName,
    countryCode: config.countryCode,
    preferredLocale: normalizedLocale(locale) || "hu",
    isLocaleFavorite: true
  });
}

function inferStreamType(row) {
  if (Number(row?.hls) === 1) return "hls";
  const codec = String(row?.codec || "").trim().toLowerCase();
  if (codec.includes("aac")) return "aac";
  if (codec.includes("mp3") || codec.includes("mpeg")) return "mp3";
  if (codec.includes("wav")) return "wav";
  return "auto";
}

function normalizeNameForMatch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function pickBestDirectoryMatch(rows, seed) {
  const wanted = normalizeNameForMatch(seed.directoryName || seed.name);
  const candidates = (rows || []).filter((row) => {
    const resolved = String(row?.url_resolved || row?.url || "").trim();
    if (!resolved) return false;
    try {
      return new URL(resolved).protocol === "https:";
    } catch {
      return false;
    }
  });
  if (!candidates.length) return null;
  const exact = candidates.find((row) => normalizeNameForMatch(row?.name) === wanted);
  return exact || candidates[0];
}

export async function resolveFavoriteStation(seed) {
  if (!seed?.directoryName || !seed?.countryCode) return null;
  const params = new URLSearchParams({
    name: seed.directoryName,
    countrycode: seed.countryCode,
    hidebroken: "true",
    is_https: "true",
    order: "clickcount",
    reverse: "true",
    limit: "10"
  });

  let lastError = null;
  for (const endpoint of RADIO_DIRECTORY_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}/json/stations/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`DIRECTORY_HTTP_${response.status}`);
      const rows = await response.json();
      const match = pickBestDirectoryMatch(rows, seed);
      if (!match) continue;

      return normalizeRadioStation({
        ...seed,
        name: String(match.name || seed.name).trim() || seed.name,
        info: seed.info || "Ajánlott kezdőállomás",
        streamUrl: String(match.url_resolved || match.url || "").trim(),
        streamType: inferStreamType(match),
        artwork: String(match.favicon || "").trim(),
        homepage: String(match.homepage || "").trim(),
        sourceStatus: "configured",
        directoryStationUuid: String(match.stationuuid || "").trim()
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function normalizeRadioStation(station) {
  if (!station || typeof station !== "object") return null;
  const id = String(station.id || "").trim();
  const name = String(station.name || "").trim();
  if (!id || !name) return null;

  const streamUrl = String(station.streamUrl || "").trim();
  const catalogManaged = Boolean(station.catalogManaged);
  const distributionStatus = String(station.distributionStatus || (catalogManaged ? "unreviewed" : "user_managed")).trim();
  const sourceApproved = !catalogManaged || distributionStatus === "approved";

  return {
    id, name,
    info: String(station.info || "").trim(),
    streamUrl: sourceApproved ? streamUrl : "",
    streamType: String(station.streamType || "auto").trim().toLowerCase(),
    enabled: station.enabled !== false,
    catalogManaged,
    distributionStatus,
    sourceStatus: sourceApproved
      ? String(station.sourceStatus || (streamUrl ? "configured" : "unconfigured")).trim()
      : "blocked_unapproved_source",
    artwork: station.artwork ? String(station.artwork).trim() : "",
    homepage: station.homepage ? String(station.homepage).trim() : "",
    directoryName: station.directoryName ? String(station.directoryName).trim() : "",
    countryCode: station.countryCode ? String(station.countryCode).trim().toUpperCase() : "",
    preferredLocale: station.preferredLocale ? String(station.preferredLocale).trim().toLowerCase() : "",
    isLocaleFavorite: Boolean(station.isLocaleFavorite),
    directoryStationUuid: station.directoryStationUuid ? String(station.directoryStationUuid).trim() : ""
  };
}

export function getEnabledRadioStations() {
  return RADIO_STATIONS.map(normalizeRadioStation).filter((station) => station?.enabled && station.sourceStatus !== "blocked_unapproved_source");
}

export function findRadioStationById(id) {
  const wanted = String(id || "").trim();
  return getEnabledRadioStations().find((station) => station.id === wanted) || null;
}


function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

export function buildDevelopmentToneWav({
  durationSeconds = 4,
  sampleRate = 22050,
  frequencyHz = 440,
  amplitude = 0.18
} = {}) {
  const safeDuration = Math.max(1, Math.min(10, Number(durationSeconds) || 4));
  const safeSampleRate = Math.max(8000, Math.min(48000, Number(sampleRate) || 22050));
  const safeFrequency = Math.max(100, Math.min(2000, Number(frequencyHz) || 440));
  const safeAmplitude = Math.max(0.01, Math.min(0.5, Number(amplitude) || 0.18));
  const sampleCount = Math.floor(safeDuration * safeSampleRate);
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, safeSampleRate, true);
  view.setUint32(28, safeSampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / safeSampleRate;
    const gate = Math.floor(t * 4) % 2 === 0 ? 1 : 0.45;
    const envelope = Math.min(1, index / 300, (sampleCount - index) / 300);
    const sample = Math.sin(2 * Math.PI * safeFrequency * t) * safeAmplitude * gate * Math.max(0, envelope);
    view.setInt16(44 + index * bytesPerSample, Math.round(sample * 32767), true);
  }

  return buffer;
}

export function createDevelopmentToneStation() {
  const wavBuffer = buildDevelopmentToneWav();
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  const streamUrl = URL.createObjectURL(blob);

  return {
    station: normalizeRadioStation({
      id: "idesuss-dev-tone",
      name: "Idesüss Audio Test",
      info: "Helyben generált fejlesztői WAV teszthang",
      streamUrl,
      streamType: "wav",
      enabled: true,
      catalogManaged: false,
      distributionStatus: "development_generated",
      sourceStatus: "configured"
    }),
    revoke() {
      URL.revokeObjectURL(streamUrl);
    }
  };
}


export function createDevelopmentExternalStation(rawUrl, streamType = "auto") {
  const input = String(rawUrl || "").trim();
  if (!input) return null;

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const normalizedType = ["auto", "hls", "mp3", "aac", "wav"].includes(String(streamType || "auto").toLowerCase())
    ? String(streamType || "auto").toLowerCase()
    : "auto";

  return normalizeRadioStation({
    id: "idesuss-dev-external",
    name: "Idesüss External Stream Test",
    info: "Fejlesztői, nem perzisztált külső stream-probe",
    streamUrl: parsed.toString(),
    streamType: normalizedType,
    enabled: true,
    catalogManaged: false,
    distributionStatus: "development_external",
    sourceStatus: "configured"
  });
}
