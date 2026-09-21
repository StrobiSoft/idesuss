export const RADIO_STATIONS = Object.freeze([
  ["hu-radio-1","Rádió 1","https://icast.connectmedia.hu/5201/live.mp3","mp3","HU","hu",1,"https://radio1.hu/"],
  ["hu-slager-fm","Sláger FM","https://slagerfm.netregator.hu:7813/slagerfm128.mp3","mp3","HU","hu",2,"https://slagerfm.hu/"],
  ["nl-slam","SLAM!","https://stream.slam.nl/slam_mp3","mp3","NL","nl",1,"https://www.slam.nl/"],
  ["nl-npo-radio-2","NPO Radio 2","https://icecast.omroep.nl/radio2-bb-aac","aac","NL","nl",2,"https://www.nporadio2.nl/"],
  ["ro-kiss-fm","Kiss FM","https://live.kissfm.ro/kissfm.aacp","aac","RO","ro",1,"https://www.kissfm.ro/"],
  ["ro-radio-zu","Radio ZU","https://ivm.antenaplay.ro/liveaudio/radiozu/playlist.m3u8","hls","RO","ro",2,"https://radiozu.ro/"],
  ["pl-radio-eska","Radio ESKA","https://radio.stream.smcdn.pl/icradio-p/2380-1.aac/playlist.m3u8","hls","PL","pl",1,"https://www.eska.pl/"],
  ["pl-rmf-fm","RMF FM","https://rs102-krk-cyfronet.rmfstream.pl/rmf_fm","mp3","PL","pl",2,"https://www.rmf.fm/"],
  ["hr-bravo","bravo!","https://relay1.social3.hr/radio/8310/radio.mp3","mp3","HR","hr",1,"https://bravo.hr/"],
  ["hr-otvoreni","Otvoreni Radio","https://stream.otvoreni.hr/otvoreni","mp3","HR","hr",2,"https://www.otvoreni.hr/"],
  ["be-novoe-radio","Novoe Radio","https://live.novoeradio.by:444/live/novoeradio_aac128/icecast.audio","aac","BY","be",1,"https://novoeradio.by/"],
  ["be-radius-fm","Radius FM","https://stream2.datacenter.by/radiusfm_main","aac","BY","be",2,"https://radiusfm.by/"],
  ["en-bbc-radio-2","BBC Radio 2","https://as-hls-ww.live.cf.md.bbci.co.uk/pool_904/live/ww/bbc_radio_two/bbc_radio_two.isml/bbc_radio_two-audio%3d96000.norewind.m3u8","hls","GB","en",1,"https://www.bbc.co.uk/sounds/play/live:bbc_radio_two"],
  ["en-capital-fm","Capital FM","https://media-ssl.musicradio.com/CapitalUK","mp3","GB","en",2,"https://www.capitalfm.com/"]
].map(([id,name,streamUrl,streamType,countryCode,preferredLocale,recommendedSlot,homepage]) => Object.freeze({
  id,name,streamUrl,streamType,countryCode,preferredLocale,recommendedSlot,homepage,
  info: "Idesüss ajánlott élő rádió",
  enabled: true,
  catalogManaged: true,
  distributionStatus: "approved",
  sourceStatus: "configured",
  isLocaleFavorite: recommendedSlot === 1
})));

export const RADIO_FAVORITES_BY_LOCALE = Object.freeze({
  hu: Object.freeze({ id: "hu-radio-1", name: "Rádió 1", directoryName: "Rádió 1", countryCode: "HU" }),
  en: Object.freeze({ id: "en-bbc-radio-2", name: "BBC Radio 2", directoryName: "BBC Radio 2", countryCode: "GB" }),
  nl: Object.freeze({ id: "nl-slam", name: "SLAM!", directoryName: "SLAM!", countryCode: "NL" }),
  ro: Object.freeze({ id: "ro-kiss-fm", name: "Kiss FM", directoryName: "Kiss FM", countryCode: "RO" }),
  pl: Object.freeze({ id: "pl-radio-eska", name: "Radio ESKA", directoryName: "Radio ESKA", countryCode: "PL" }),
  hr: Object.freeze({ id: "hr-bravo", name: "bravo!", directoryName: "bravo!", countryCode: "HR" }),
  be: Object.freeze({ id: "be-novoe-radio", name: "Novoe Radio", directoryName: "Novoe Radio", countryCode: "BY" })
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
    distributionStatus: "unreviewed",
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
        catalogManaged: false,
        distributionStatus: "directory_resolved",
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
  const serverManagedPlayback = Boolean(station.serverManagedPlayback);
  const sourceApproved = !catalogManaged || distributionStatus === "approved" || serverManagedPlayback;

  return {
    id, name,
    info: String(station.info || "").trim(),
    streamUrl: sourceApproved ? streamUrl : "",
    streamType: String(station.streamType || "auto").trim().toLowerCase(),
    enabled: station.enabled !== false,
    catalogManaged,
    distributionStatus,
    serverManagedPlayback,
    sourceStatus: sourceApproved
      ? String(station.sourceStatus || (streamUrl ? "configured" : "unconfigured")).trim()
      : "blocked_unapproved_source",
    artwork: station.artwork ? String(station.artwork).trim() : "",
    homepage: station.homepage ? String(station.homepage).trim() : "",
    directoryName: station.directoryName ? String(station.directoryName).trim() : "",
    countryCode: station.countryCode ? String(station.countryCode).trim().toUpperCase() : "",
    preferredLocale: station.preferredLocale ? String(station.preferredLocale).trim().toLowerCase() : "",
    isLocaleFavorite: Boolean(station.isLocaleFavorite),
    recommendedSlot: Number(station.recommendedSlot) || 0,
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
