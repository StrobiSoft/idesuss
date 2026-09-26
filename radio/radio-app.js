import { IdesussRadioEngine } from "./radio-engine.js";
import { loadRadioCapabilities, loadSavedRadioChannels, saveRadioChannel } from "./radio-entitlements.js";
import { getEnabledRadioStations, normalizeRadioStation, createDevelopmentToneStation, createDevelopmentExternalStation, getLocaleFavoriteStationSeed, resolveFavoriteStation, detectRadioLocale } from "./radio-stations.js";
import { loadSharedRadioCatalog } from "./radio-api-client.js";
import { initRadioLanguage, radioT, getRadioLanguage } from "./radio-language.js";
import { openRadioDirectory } from "./radio-directory.js";
import { RADIO_CLIENT_POLICY } from "./radio-policy.js";

const VOLUME_STORAGE_KEY = "idesuss.radio.volume.v1";
const SKIN_STORAGE_KEY = "idesuss.radio.skin.v1";
const LOCAL_PRESETS_STORAGE_KEY = "idesuss.radio.presets.v1";
const AVAILABLE_SKINS = new Set(["default", "night-drive", "classic-black"]);
const DEV_PARAMS = new URLSearchParams(window.location.search);
const DEV_AUDIO_MODE = DEV_PARAMS.get("dev") === "1";
const developmentTone = DEV_AUDIO_MODE ? createDevelopmentToneStation() : null;
const developmentExternalStation = DEV_AUDIO_MODE
  ? createDevelopmentExternalStation(DEV_PARAMS.get("stream"), DEV_PARAMS.get("type") || "auto")
  : null;
let STATIONS = [];
const PRESET_POLICY = RADIO_CLIENT_POLICY.preset;
let PRESET_RULES = [];

async function prepareStations() {
  const locale = detectRadioLocale();
  let localeFavorite = null;
  let sharedStations = null;

  try {
    sharedStations = await loadSharedRadioCatalog(locale);
  } catch (error) {
    console.warn("Shared radio catalog could not be loaded", error);
  }

  if (sharedStations?.length) {
    const normalizedShared = sharedStations.map(normalizeRadioStation).filter(Boolean);
    localeFavorite = normalizedShared.find((station) => station.isLocaleFavorite) || normalizedShared[0] || null;
    STATIONS = normalizedShared;
  } else {
    const builtInStations = getEnabledRadioStations();
    const localeRecommendations = builtInStations
      .filter((station) => station.preferredLocale === locale && station.recommendedSlot)
      .sort((a, b) => a.recommendedSlot - b.recommendedSlot);
    localeFavorite = localeRecommendations[0] || builtInStations.find(
      (station) => station.isLocaleFavorite && station.preferredLocale === locale
    ) || null;

    if (!localeFavorite) {
      const localeFavoriteSeed = getLocaleFavoriteStationSeed(locale);
      try {
        localeFavorite = await resolveFavoriteStation(localeFavoriteSeed);
      } catch (error) {
        console.warn("Locale radio favorite could not be resolved", error);
      }
    }

    STATIONS = [
      ...(localeFavorite ? [localeFavorite] : []),
      ...builtInStations.filter((station) => !localeFavorite || station.id !== localeFavorite.id)
    ];
  }

  STATIONS = [
    ...STATIONS,
    ...(developmentTone?.station ? [developmentTone.station] : []),
    ...(developmentExternalStation ? [developmentExternalStation] : [])
  ];

  const localeRecommendations = STATIONS
    .filter((station) => station.preferredLocale === locale && station.recommendedSlot)
    .sort((a, b) => a.recommendedSlot - b.recommendedSlot);

  PRESET_RULES = Array.from({ length: PRESET_POLICY.slotCount }, (_unused, index) => ({
    slot: index + 1,
    freeStation: index < 2 ? (localeRecommendations[index] || (index === 0 ? localeFavorite : null)) : null
  }));

  return localeFavorite;
}
function streamStateText(state) {
  const key = {
    loading:"loading", ready:"ready", buffering:"buffering", stalled:"stalled",
    playing:"playing", paused:"paused", stopped:"stopped", ended:"ended",
    unconfigured:"streamMissing"
  }[state];
  return key ? radioT(key) : "";
}

const storedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
const initialVolume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.7;
const engine = new IdesussRadioEngine({ initialVolume });
let capabilities = { tier:"signed_out", label:"", canSaveRadioChannels:true, maxRadioPresets:PRESET_POLICY.slotCount, canUseCustomSkins:true, canUsePremiumPlusFeatures:false, canUseRadioDiagnostics:false };
let selectedStation = null;
let radioClient = null;
let radioUser = null;
let savedPresets = {};
let audioTestTone = null;

const $ = (selector) => document.querySelector(selector);
function appendTextElement(parent, tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = String(text ?? "");
  parent.appendChild(element);
  return element;
}
function setStatus(text) { const target=$("#radioStatus"); if (target) target.textContent=text; }
function tierLabel() { return ""; }
function requiredTierForSlot() { return ""; }
function canUsePresetSlot(slot) {
  return Number.isInteger(Number(slot)) && Number(slot) >= 1 && Number(slot) <= PRESET_POLICY.slotCount;
}
function canPlayStation(station) {
  return Boolean(station?.streamUrl);
}
function loadLocalPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_PRESETS_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [slot, station] of Object.entries(parsed)) {
      const normalized = normalizeRadioStation(station);
      if (normalized) out[Number(slot)] = normalized;
    }
    return out;
  } catch {
    return {};
  }
}
function saveLocalPreset(slot, station) {
  savedPresets[slot] = { ...station };
  const serializable = {};
  for (const [key, value] of Object.entries(savedPresets)) serializable[key] = value;
  localStorage.setItem(LOCAL_PRESETS_STORAGE_KEY, JSON.stringify(serializable));
}
function applySkin(requestedSkin,{persist=true}={}) {
  const wanted=AVAILABLE_SKINS.has(requestedSkin)?requestedSkin:"default";
  const active=wanted;
  document.documentElement.dataset.radioSkin=active;
  const skin=$("#skinSelect");
  if (skin && skin.value!==active) skin.value=active;
  if (persist) localStorage.setItem(SKIN_STORAGE_KEY,active);
  return active;
}
function savedRowToStation(row) {
  return normalizeRadioStation({
    id:row?.metadata?.station_id||row?.channel_key||"saved-station",
    name:row?.channel_name||radioT("savedStation"),
    info:row?.metadata?.info||radioT("savedStation"),
    streamUrl:row?.stream_url||"",
    streamType:row?.metadata?.stream_type||"auto",
    artwork:row?.metadata?.artwork||"",
    homepage:row?.metadata?.homepage||"",
    enabled:true,
    sourceStatus:row?.stream_url?"configured":"unconfigured"
  });
}
function indexSavedPresets(rows) {
  savedPresets={};
  for (const row of rows||[]) {
    const key = String(row.channel_key || "");
    if (!key.startsWith(PRESET_POLICY.savedChannelKeyPrefix)) continue;
    const slot = Number(key.slice(PRESET_POLICY.savedChannelKeyPrefix.length));
    if (!Number.isInteger(slot) || slot < 1 || slot > PRESET_POLICY.slotCount) continue;
    const station=savedRowToStation(row);
    if (station) savedPresets[slot]=station;
  }
}
async function selectStation(station,message=null) {
  const normalized=normalizeRadioStation(station);
  if (!normalized) { setStatus(radioT("unavailable")); return; }
  if (!canPlayStation(normalized)) { setStatus(radioT("streamMissing")); return; }
  selectedStation=normalized;
  engine.audio.loop = normalized.id === "idesuss-demo-tone";
  try {
    $("#nowPlaying").textContent=normalized.name;
    if (message) setStatus(message);
    await engine.selectStation(normalized);
    renderPresets();
  } catch (error) {
    setStatus(`Állomásválasztási hiba: ${error.message}`);
  }
}
function renderTier() {
  const badge=$("#tierBadge");
  if (badge) badge.hidden = true;
  const userBtn=$("#radioUserBtn");
  if (userBtn) {
    userBtn.textContent = radioUser ? radioT("profile") : radioT("login");
    userBtn.href = radioUser ? "/#profile" : "/#login";
  }
  const saveHint=$("#saveHint");
  if (saveHint) saveHint.textContent="A presetek ezen az eszközön bejelentkezés nélkül is használhatók.";
  const skin=$("#skinSelect");
  if (skin) Array.from(skin.options).forEach((option)=>{ option.disabled=false; });
  const audioTestButton=$("#audioTestBtn");
  if (audioTestButton) {
    audioTestButton.hidden=!capabilities.canUseRadioDiagnostics;
    audioTestButton.disabled=!capabilities.canUseRadioDiagnostics;
  }
  const preferredSkin=localStorage.getItem(SKIN_STORAGE_KEY)||"default";
  const activeSkin=applySkin(preferredSkin,{persist:false});
  if (activeSkin!==preferredSkin) localStorage.setItem(SKIN_STORAGE_KEY,activeSkin);
}
function renderPresets() {
  const host=$("#presetGrid"); if (!host) return; host.replaceChildren();
  PRESET_RULES.forEach((rule)=>{
    const unlocked=canUsePresetSlot(rule.slot);
    const stored=savedPresets[rule.slot]||null;
    const fallback=rule.freeStation||null;
    const stationForButton=stored||fallback;
    const button=document.createElement("button"); button.type="button";
    button.className=`preset${unlocked?" unlocked":" locked"}${stored?" saved":""}`;
    button.disabled=!unlocked;
    const number=appendTextElement(button,"b",rule.slot);
    const lock=document.createElement("span");
    lock.className=`preset-lock ${unlocked ? "is-open" : "is-closed"}`;
    lock.setAttribute("aria-hidden","true");
    number.appendChild(lock);
    const label = !unlocked && rule.slot === 2
      ? radioT("registeredOnly")
      : (stationForButton?.name||(unlocked?radioT("empty"):requiredTierForSlot(rule.slot)));
    appendTextElement(button,"small",label);
    button.title=unlocked
      ? (stationForButton?`${stationForButton.name} betöltése`:"Üres preset — a kiválasztott állomás mentése")
      : `${requiredTierForSlot(rule.slot)} csomag szükséges`;
    let longPressTimer=null;
    let longPressTriggered=false;
    const cancelLongPress=()=>{ if (longPressTimer) window.clearTimeout(longPressTimer); longPressTimer=null; };
    button.addEventListener("pointerdown",(event)=>{
      if (!unlocked) return;
      if (event.pointerType==="mouse" && event.button!==0) return;
      longPressTriggered=false;
      cancelLongPress();
      longPressTimer=window.setTimeout(async()=>{
        longPressTriggered=true;
        if (navigator.vibrate) navigator.vibrate(25);
        await openRadioDirectory({
          slot:rule.slot,
          locale:getRadioLanguage(),
          canSave:true,
          onPreview:async(station)=>{
            await selectStation(station,radioT("directoryPreviewing",{station:station.name}));
            await engine.play();
          },
          onSave:async(station)=>{
            if (radioUser && radioClient && capabilities.canSaveRadioChannels) {
              try { await saveRadioChannel(radioClient,radioUser.id,rule.slot,station); } catch (error) { console.warn("Server preset save failed; using local preset", error); }
            }
            saveLocalPreset(rule.slot, station);
            await selectStation(station,radioT("directorySaved",{station:station.name,slot:rule.slot}));
            renderPresets();
            return true;
          }
        });
      },550);
    });
    ["pointerup","pointercancel","pointerleave"].forEach((eventName)=>{
      button.addEventListener(eventName,cancelLongPress);
    });
    button.addEventListener("contextmenu",(event)=>{
      if (unlocked) event.preventDefault();
    });
    button.addEventListener("click",async(event)=>{
      if (longPressTriggered) {
        event.preventDefault();
        longPressTriggered=false;
        return;
      }
      if (stored) {
        await selectStation(stored,"Mentett preset kiválasztva; lejátszás indul…");
        await engine.play();
        return;
      }

      if (fallback && (!selectedStation || selectedStation.id === fallback.id)) {
        await selectStation(fallback,radioT("recommendedSelected"));
        await engine.play();
        return;
      }

      if (!selectedStation) { setStatus(radioT("selectFirst")); return; }
      try {
        if (radioUser && radioClient && capabilities.canSaveRadioChannels) {
          try { await saveRadioChannel(radioClient,radioUser.id,rule.slot,selectedStation); } catch (error) { console.warn("Server preset save failed; using local preset", error); }
        }
        saveLocalPreset(rule.slot, selectedStation);
        setStatus(selectedStation.name + " elmentve a(z) " + rule.slot + ". presetre.");
        renderPresets();
      } catch (error) {
        console.error("Radio preset save failed",error);
        setStatus("A preset mentése nem sikerült.");
      }
    });
    host.appendChild(button);
  });
}
function bindControls() {
  $("#playPauseBtn")?.addEventListener("click",async()=>{
    try { await engine.toggle(); }
    catch (error) {
      if (error.message==="NO_STATION") setStatus(radioT("selectFirst"));
      else if (error.message==="STREAM_NOT_CONFIGURED") setStatus(radioT("streamMissing"));
      else setStatus(radioT("playbackError",{error:error.message}));
    }
  });
  $("#audioTestBtn")?.addEventListener("click",async()=>{
    if (!capabilities.canUseRadioDiagnostics) return;
    try {
      audioTestTone?.revoke?.();
      audioTestTone=createDevelopmentToneStation();
      await selectStation(audioTestTone.station,"Helyi hangteszt betöltve…");
      await engine.play();
      setStatus("Hangteszt fut — a rádiómotor és a hangerőszabályzás működik.");
    } catch (error) {
      console.error("Radio audio self-test failed",error);
      setStatus(`Hangteszt hiba: ${error.message}`);
    }
  });
  const volume=$("#volumeSlider");
  if (volume) {
    volume.value=String(Math.round(initialVolume*100));
    volume.addEventListener("input",()=>{
      const next=engine.setVolume(Number(volume.value)/100);
      localStorage.setItem(VOLUME_STORAGE_KEY,String(next));
    });
  }
  $("#skinSelect")?.addEventListener("change",(event)=>{
    const requested=event.target.value;
    const active=applySkin(requested);
    setStatus(active==="default"?"Idesüss alap skin aktív.":"Rádió skin aktív és elmentve.");
  });
}
function bindEngineEvents() {
  engine.addEventListener("state",(event)=>{
    const state=event.detail?.state;
    const button=$("#playPauseBtn");
    if (button) {
      const playing=state==="playing";
      button.textContent=playing?radioT("pause"):radioT("play");
      button.setAttribute("aria-pressed",playing?"true":"false");
    }
    const stateText = streamStateText(state);
    if (stateText) setStatus(stateText);
  });
  engine.addEventListener("volume",(event)=>{
    const slider=$("#volumeSlider");
    if (slider) slider.value=String(Math.round((event.detail?.volume||0)*100));
  });
  engine.addEventListener("error",(event)=>setStatus(event.detail?.message||"Rádióhiba történt."));
}
function registerRadioServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
    .catch((error) => console.error("Radio service worker registration failed", error));
}

async function init() {
  registerRadioServiceWorker();
  initRadioLanguage();
  bindControls(); bindEngineEvents();

  window.addEventListener("idesuss:radio-languagechange", async () => {
    await prepareStations();
    renderTier();
    renderPresets();
    const button = $("#playPauseBtn");
    if (button) {
      const playing=engine.audio?.paused===false;
      button.textContent=playing?radioT("pause"):radioT("play");
      button.setAttribute("aria-pressed",playing?"true":"false");
    }
  });

  const localeFavorite = await prepareStations();

  try {
    const result=await loadRadioCapabilities();
    capabilities={...result.capabilities,canSaveRadioChannels:true,maxRadioPresets:PRESET_POLICY.slotCount,canUseCustomSkins:true};
    radioClient=result.client; radioUser=result.user;
    savedPresets=loadLocalPresets();
    if (radioUser) {
      try {
        const rows=await loadSavedRadioChannels(radioClient,radioUser.id);
        const localPresets={...savedPresets};
        indexSavedPresets(rows);
        savedPresets={...localPresets,...savedPresets};
      } catch (error) {
        console.warn("Saved server presets unavailable; keeping local presets", error);
      }
    }
  } catch (error) {
    console.error("Radio entitlement or preset load failed",error);
    capabilities={...capabilities,canSaveRadioChannels:true,maxRadioPresets:PRESET_POLICY.slotCount,canUseCustomSkins:true};
    savedPresets=loadLocalPresets();
    setStatus("A szerveres profil nem érhető el; a rádió helyi módban tovább használható.");
  }

  const initialStation = savedPresets[1] || localeFavorite || STATIONS[0] || null;
  if (initialStation) {
    await selectStation(
      initialStation,
      savedPresets[1]
        ? radioT("savedPresetReady",{station:initialStation.name})
        : radioT("readyStation",{station:initialStation.name})
    );

    const autoplayRequested = new URLSearchParams(window.location.search).get("autoplay") === "1";
    if (autoplayRequested) {
      try {
        await engine.play();
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("autoplay");
        window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } catch (error) {
        console.warn("Radio autoplay was blocked by the browser", error);
        setStatus(radioT("playbackError",{error:error?.message || "AUTOPLAY_BLOCKED"}));
      }
    }
  } else {
    setStatus(radioT("unavailable"));
  }

  renderTier(); renderPresets();
}
window.addEventListener("beforeunload",()=>{
  developmentTone?.revoke?.();
  audioTestTone?.revoke?.();
  engine.destroy();
});
init();
