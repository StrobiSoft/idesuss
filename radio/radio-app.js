import { IdesussRadioEngine } from "./radio-engine.js";
import { loadRadioCapabilities, canAccessTier } from "./radio-entitlements.js";

const PRESET_STORAGE_KEY = "idesuss.radio.presets.v1";
const VOLUME_STORAGE_KEY = "idesuss.radio.volume.v1";

const DEFAULT_STATIONS = [
  { id: "idesuss-1", name: "Idesüss Radio 1", info: "Nincs még streamforrás bekötve", streamUrl: "" },
  { id: "idesuss-2", name: "Idesüss Radio 2", info: "Nincs még streamforrás bekötve", streamUrl: "" }
];

const PRESET_RULES = [
  { slot: 1, requiredTier: "registered" },
  { slot: 2, requiredTier: "registered" },
  { slot: 3, requiredTier: "premium" },
  { slot: 4, requiredTier: "premium" },
  { slot: 5, requiredTier: "premium" },
  { slot: 6, requiredTier: "premium" },
  { slot: 7, requiredTier: "premium_plus" },
  { slot: 8, requiredTier: "premium_plus" }
];

const initialVolume = Math.min(1, Math.max(0, Number(localStorage.getItem(VOLUME_STORAGE_KEY)) || 0.7));
const engine = new IdesussRadioEngine({ initialVolume });
let capabilities = { tier: "signed_out", label: "Vendég", canSaveRadioChannels: false, canUseCustomSkins: false, canUsePremiumPlusFeatures: false };
let selectedStation = null;

function $(selector) {
  return document.querySelector(selector);
}

function setStatus(text) {
  const target = $("#radioStatus");
  if (target) target.textContent = text;
}

function loadPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePresets(presets) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function tierLabel(tier) {
  if (tier === "premium_plus") return "Premium Plus";
  if (tier === "premium") return "Premium";
  if (tier === "registered") return "Free";
  return "Vendég";
}

function renderTier() {
  const badge = $("#tierBadge");
  if (badge) badge.textContent = capabilities.label || tierLabel(capabilities.tier);

  const saveHint = $("#saveHint");
  if (saveHint) {
    saveHint.textContent = capabilities.canSaveRadioChannels
      ? "Kedvenc állomások mentése engedélyezve."
      : "Kedvenc állomások mentése Premium szinttől érhető el.";
  }

  const skin = $("#skinSelect");
  if (skin) {
    Array.from(skin.options).forEach((option) => {
      if (option.value !== "default") option.disabled = !capabilities.canUseCustomSkins;
    });
    if (!capabilities.canUseCustomSkins) skin.value = "default";
  }
}

function renderStations() {
  const host = $("#stationList");
  if (!host) return;
  host.innerHTML = "";

  DEFAULT_STATIONS.forEach((station) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station";
    button.innerHTML = `<strong>${station.name}</strong><span>${station.info}</span>`;
    button.addEventListener("click", async () => {
      selectedStation = station;
      try {
        await engine.selectStation(station);
        $("#nowPlaying").textContent = station.name;
        setStatus(station.streamUrl ? "Állomás készen áll." : "Az állomáshoz még nincs streamforrás bekötve.");
        renderPresets();
      } catch (error) {
        setStatus(`Állomásválasztási hiba: ${error.message}`);
      }
    });
    host.appendChild(button);
  });
}

function renderPresets() {
  const host = $("#presetGrid");
  if (!host) return;
  const presets = loadPresets();
  host.innerHTML = "";

  PRESET_RULES.forEach((rule) => {
    const unlocked = canAccessTier(capabilities.tier, rule.requiredTier);
    const stored = presets[String(rule.slot)] || null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset${unlocked ? "" : " locked"}${stored ? " saved" : ""}`;
    button.disabled = !unlocked;
    button.innerHTML = `<b>${rule.slot}</b><small>${stored?.name || (unlocked ? "üres" : rule.requiredTier.replace("_", " "))}</small>`;
    button.title = unlocked ? (stored ? `${stored.name} betöltése` : "Üres preset") : `${tierLabel(rule.requiredTier)} szükséges`;

    button.addEventListener("click", async () => {
      if (stored) {
        selectedStation = stored;
        await engine.selectStation(stored);
        $("#nowPlaying").textContent = stored.name;
        setStatus(stored.streamUrl ? "Preset betöltve." : "A mentett állomáshoz nincs streamforrás.");
        return;
      }

      if (!capabilities.canSaveRadioChannels) {
        setStatus("A saját kedvencek mentése Premium szinttől érhető el.");
        return;
      }

      if (!selectedStation) {
        setStatus("Előbb válassz állomást, utána mentsd a preset gombra.");
        return;
      }

      presets[String(rule.slot)] = selectedStation;
      savePresets(presets);
      setStatus(`${selectedStation.name} elmentve a(z) ${rule.slot}. presetre.`);
      renderPresets();
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
    if (event.target.value !== "default" && !capabilities.canUseCustomSkins) {
      event.target.value = "default";
      setStatus("Egyedi skinek Premium szinttől érhetők el.");
      return;
    }
    document.documentElement.dataset.radioSkin = event.target.value;
    setStatus(event.target.value === "default" ? "Idesüss alap skin aktív." : "Skin kiválasztva.");
  });
}

function bindEngineEvents() {
  engine.addEventListener("state", (event) => {
    const state = event.detail?.state;
    const button = $("#playPauseBtn");
    if (button) button.textContent = state === "playing" ? "⏸ Szünet" : "▶ Lejátszás";
    if (state === "buffering") setStatus("Pufferelés…");
    if (state === "stopped") setStatus("Lejátszás leállítva.");
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
  } catch (error) {
    console.error("Radio entitlement load failed", error);
    setStatus("A jogosultsági állapot nem tölthető be; biztonsági okból vendég módban működünk.");
  }

  renderTier();
  renderPresets();
}

window.addEventListener("beforeunload", () => engine.destroy());
init();
