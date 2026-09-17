import { IdesussRadioEngine } from "./radio-engine.js";
import {
  loadRadioCapabilities,
  loadSavedRadioChannels,
  saveRadioChannel,
  canAccessTier
} from "./radio-entitlements.js";
import {
  getEnabledRadioStations,
  normalizeRadioStation
} from "./radio-stations.js";

const VOLUME_STORAGE_KEY = "idesuss.radio.volume.v1";
const SKIN_STORAGE_KEY = "idesuss.radio.skin.v1";
const AVAILABLE_SKINS = new Set(["default", "night-drive", "classic-black"]);
const STATIONS = getEnabledRadioStations();

const PRESET_RULES = [
  { slot: 1, requiredTier: "registered", freeStation: STATIONS[0] || null },
  { slot: 2, requiredTier: "registered", freeStation: STATIONS[1] || null },
  { slot: 3, requiredTier: "premium" },
  { slot: 4, requiredTier: "premium" },
  { slot: 5, requiredTier: "premium" },
  { slot: 6, requiredTier: "premium" },
  { slot: 7, requiredTier: "premium_plus" },
  { slot: 8, requiredTier: "premium_plus" }
];

const STREAM_STATE_TEXT = {
  loading: "Streamforrás betöltése…",
  ready: "A stream készen áll a lejátszásra.",
  buffering: "Pufferelés…",
  stalled: "A stream nem küld adatot; várakozás az újracsatlakozásra…",
  playing: "Élő adás lejátszása folyamatban.",
  paused: "Lejátszás szüneteltetve.",
  stopped: "Lejátszás leállítva.",
  ended: "A stream véget ért.",
  unconfigured: "Az állomáshoz még nincs streamforrás bekötve."
};

const storedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
const initialVolume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.7;
const engine = new IdesussRadioEngine({ initialVolume });
let capabilities = { tier: "signed_out", label: "Vendég", canSaveRadioChannels: false, canUseCustomSkins: false, canUsePremiumPlusFeatures: false };
let selectedStation = null;
let radioClient = null;
let radioUser = null;
let savedPresets = {};

function $(selector) {
  return document.querySelector(selector);
}

function setStatus(text) {
  const target = $("#radioStatus");
  if (target) target.textContent = text;
}

function tierLabel(tier) {
  if (tier === "premium_plus") return "Premium Plus";
  if (tier === "premium") return "Premium";
  if (tier === "registered") return "Free";
  return "Vendég";
}

function applySkin(requestedSkin, { persist = true } = {}) {
  const wanted = AVAILABLE_SKINS.has(requestedSkin) ? requestedSkin : "default";
  const allowed = wanted === "default" || capabilities.canUseCustomSkins;
  const active = allowed ? wanted : "default";

  document.documentElement.dataset.radioSkin = active;
  const skin = $("#skinSelect");
  if (skin && skin.value !== active) skin.value = active;

  if (persist) localStorage.setItem(SKIN_STORAGE_KEY, active);
  return active;
}

function savedRowToStation(row) {
  return normalizeRadioStation({
    id: row?.metadata?.station_id || row?.channel_key || "saved-station",
    name: row?.channel_name || "Mentett állomás",
    info: row?.metadata?.info || "Mentett rádióállomás",
    streamUrl: row?.stream_url || "",
    streamType: row?.metadata?.stream_type || "auto",
    artwork: row?.metadata?.artwork || "",
    homepage: row?.metadata?.homepage || "",
    enabled: true,
    sourceStatus: row?.stream_url ? "configured" : "unconfigured"
  });
}

function indexSavedPresets(rows) {
  savedPresets = {};
  for (const row of rows || []) {
    const match = /^preset_(\d+)$/.exec(row.channel_key || "");
    if (!match) continue;
    const station = savedRowToStation(row);
    if (station) savedPresets[Number(match[1])] = station;
  }
}

async function selectStation(station, message = null) {
  const normalized = normalizeRadioStation(station);
  if (!normalized) {
    setStatus("Érvénytelen rádióállomás-adat.");
    return;
  }

  selectedStation = normalized;
  try {
    $("#nowPlaying").textContent = normalized.name;
    if (message) setStatus(message);
    await engine.selectStation(normalized);
    renderPresets();
  } catch (error) {
    setStatus(`Állomásválasztási hiba: ${error.message}`);
  }
}

function renderTier() {
  const badge = $("#tierBadge");
  if (badge) badge.textContent = capabilities.label || tierLabel(capabilities.tier);

  const saveHint = $("#saveHint");
  if (saveHint) {
    saveHint.textContent = capabilities.canSaveRadioChannels
      ? "Kedvenc állomások szerveroldali mentése engedélyezve. Az üres, jogosult preset gombra koppintva mentheted az éppen kiválasztott állomást."
      : "A Free szint a beépített csatornákat használhatja; saját állomás mentése Premium szinttől érhető el.";
  }

  const skin = $("#skinSelect");
  if (skin) {
    Array.from(skin.options).forEach((option) => {
      if (option.value !== "default") option.disabled = !capabilities.canUseCustomSkins;
    });
  }

  const preferredSkin = localStorage.getItem(SKIN_STORAGE_KEY) || "default";
  const activeSkin = applySkin(preferredSkin, { persist: false });
  if (activeSkin !== preferredSkin) localStorage.setItem(SKIN_STORAGE_KEY, activeSkin);
}

function renderStations() {
  const host = $("#stationList");
  if (!host) return;
  host.innerHTML = "";

  if (!STATIONS.length) {
    const empty = document.createElement("div");
    empty.className = "note";
    empty.textContent = "Nincs engedélyezett rádióállomás a katalógusban.";
    host.appendChild(empty);
    return;
  }

  STATIONS.forEach((station) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station";
    button.innerHTML = `<strong>${station.name}</strong><span>${station.info || "Rádióállomás"}</span>`;
    button.addEventListener("click", () => selectStation(station));
    host.appendChild(button);
  });
}

function renderPresets() {
  const host = $("#presetGrid");
  if (!host) return;
  host.innerHTML = "";

  PRESET_RULES.forEach((rule) => {
    const unlocked = canAccessTier(capabilities.tier, rule.requiredTier);
    const stored = savedPresets[rule.slot] || null;
    const fallback = rule.freeStation || null;
    const stationForButton = stored || fallback;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset${unlocked ? "" : " locked"}${stored ? " saved" : ""}`;
    button.disabled = !unlocked;
    button.innerHTML = `<b>${rule.slot}</b><small>${stationForButton?.name || (unlocked ? "üres" : tierLabel(rule.requiredTier))}</small>`;
    button.title = unlocked
      ? (stationForButton ? `${stationForButton.name} betöltése` : "Üres preset — a kiválasztott állomás mentése")
      : `${tierLabel(rule.requiredTier)} szükséges`;

    button.addEventListener("click", async () => {
      if (stationForButton) {
        await selectStation(
          stationForButton,
          stored ? "Mentett preset kiválasztva; stream ellenőrzése…" : "Beépített Free preset kiválasztva."
        );
        return;
      }

      if (!capabilities.canSaveRadioChannels) {
        setStatus("Saját preset mentése Premium szinttől érhető el.");
        return;
      }

      if (!selectedStation) {
        setStatus("Mentéshez előbb válassz állomást.");
        return;
      }

      try {
        await saveRadioChannel(radioClient, radioUser?.id, rule.slot, selectedStation);
        savedPresets[rule.slot] = { ...selectedStation };
        setStatus(`${selectedStation.name} elmentve a(z) ${rule.slot}. presetre.`);
        renderPresets();
      } catch (error) {
        console.error("Radio preset save failed", error);
        setStatus("A preset mentése nem sikerült. Ellenőrizd a jogosultságot és a kapcsolatot.");
      }
    });

    host.appendChild(button);
  });
}

function bindControls() {
  $("#playPauseBtn")?.addEventListener("click", async () => {
    try {
      await engine.toggle();
    } catch (error) {
      if (error.message === "NO_STATION") setStatus("Előbb válassz állomást.");
      else if (error.message === "STREAM_NOT_CONFIGURED") setStatus("Ehhez az állomáshoz még nincs streamforrás bekötve.");
      else setStatus(`Lejátszási hiba: ${error.message}`);
    }
  });

  $("#stopBtn")?.addEventListener("click", () => engine.stop());

  const volume = $("#volumeSlider");
  if (volume) {
    volume.value = String(Math.round(initialVolume * 100));
    volume.addEventListener("input", () => {
      const next = engine.setVolume(Number(volume.value) / 100);
      localStorage.setItem(VOLUME_STORAGE_KEY, String(next));
    });
  }

  $("#skinSelect")?.addEventListener("change", (event) => {
    const requested = event.target.value;
    const active = applySkin(requested);
    if (active !== requested) {
      setStatus("Egyedi skinek Premium szinttől érhetők el.");
      return;
    }
    setStatus(active === "default" ? "Idesüss alap skin aktív." : "Premium skin aktív és elmentve.");
  });
}

function bindEngineEvents() {
  engine.addEventListener("state", (event) => {
    const state = event.detail?.state;
    const button = $("#playPauseBtn");
    if (button) button.textContent = state === "playing" ? "⏸ Szünet" : "▶ Lejátszás";
    if (STREAM_STATE_TEXT[state]) setStatus(STREAM_STATE_TEXT[state]);
  });

  engine.addEventListener("volume", (event) => {
    const slider = $("#volumeSlider");
    if (slider) slider.value = String(Math.round((event.detail?.volume || 0) * 100));
  });

  engine.addEventListener("error", (event) => {
    setStatus(event.detail?.message || "Rádióhiba történt.");
  });
}

async function init() {
  renderStations();
  bindControls();
  bindEngineEvents();

  try {
    const result = await loadRadioCapabilities();
    capabilities = result.capabilities;
    radioClient = result.client;
    radioUser = result.user;

    if (radioUser) {
      const rows = await loadSavedRadioChannels(radioClient, radioUser.id);
      indexSavedPresets(rows);
    }
  } catch (error) {
    console.error("Radio entitlement or preset load failed", error);
    setStatus("A jogosultsági állapot nem tölthető be; biztonsági okból vendég módban működünk.");
  }

  renderTier();
  renderPresets();
}

window.addEventListener("beforeunload", () => engine.destroy());
init();
