export const RADIO_STATIONS = Object.freeze([
  Object.freeze({
    id: "idesuss-1", name: "Idesüss Radio 1", info: "Első beépített csatornahely",
    streamUrl: "", streamType: "auto", enabled: true, catalogManaged: true,
    distributionStatus: "placeholder", sourceStatus: "unconfigured"
  }),
  Object.freeze({
    id: "idesuss-2", name: "Idesüss Radio 2", info: "Második beépített csatornahely",
    streamUrl: "", streamType: "auto", enabled: true, catalogManaged: true,
    distributionStatus: "placeholder", sourceStatus: "unconfigured"
  })
]);

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
    homepage: station.homepage ? String(station.homepage).trim() : ""
  };
}

export function getEnabledRadioStations() {
  return RADIO_STATIONS.map(normalizeRadioStation).filter((station) => station?.enabled);
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
