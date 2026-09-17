export const RADIO_STATIONS = Object.freeze([
  Object.freeze({
    id: "idesuss-1",
    name: "Idesüss Radio 1",
    info: "Első beépített csatornahely",
    streamUrl: "",
    streamType: "auto",
    enabled: true,
    sourceStatus: "unconfigured"
  }),
  Object.freeze({
    id: "idesuss-2",
    name: "Idesüss Radio 2",
    info: "Második beépített csatornahely",
    streamUrl: "",
    streamType: "auto",
    enabled: true,
    sourceStatus: "unconfigured"
  })
]);

export function normalizeRadioStation(station) {
  if (!station || typeof station !== "object") return null;

  const id = String(station.id || "").trim();
  const name = String(station.name || "").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    info: String(station.info || "").trim(),
    streamUrl: String(station.streamUrl || "").trim(),
    streamType: String(station.streamType || "auto").trim().toLowerCase(),
    enabled: station.enabled !== false,
    sourceStatus: String(station.sourceStatus || (station.streamUrl ? "configured" : "unconfigured")).trim(),
    artwork: station.artwork ? String(station.artwork).trim() : "",
    homepage: station.homepage ? String(station.homepage).trim() : ""
  };
}

export function getEnabledRadioStations() {
  return RADIO_STATIONS
    .map(normalizeRadioStation)
    .filter((station) => station?.enabled);
}

export function findRadioStationById(id) {
  const wanted = String(id || "").trim();
  return getEnabledRadioStations().find((station) => station.id === wanted) || null;
}
