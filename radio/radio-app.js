import { IdesussRadioEngine } from "./radio-engine.js";
import { loadRadioCapabilities, loadSavedRadioChannels, saveRadioChannel } from "./radio-entitlements.js";
import { getEnabledRadioStations, normalizeRadioStation, createDevelopmentToneStation, createDevelopmentExternalStation, getLocaleFavoriteStationSeed, resolveFavoriteStation, detectRadioLocale } from "./radio-stations.js";
import { loadSharedRadioCatalog } from "./radio-api-client.js";
import { initRadioLanguage, radioT, getRadioLanguage } from "./radio-language.js";
import { openRadioDirectory } from "./radio-directory.js";
import { RADIO_CLIENT_POLICY } from "./radio-policy.js";

const VOLUME_STORAGE_KEY = "idesuss.radio.volume.v1";
const SKIN_STORAGE_KEY = "idesuss.radio.skin.v1";
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
let capabilities = { tier:"signed_out", label:"Vendég", canSaveRadioChannels:false, maxRadioPresets:0, canUseCustomSkins:false, canUsePremiumPlusFeatures:false, canUseRadioDiagnostics:false };
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
function tierLabel(tier) {
  if (tier==="premium_plus") return "Premium Plus";
  if (tier==="premium") return "Premium";
  if (tier==="registered") return "Free";
  return radioT("guest");
}
function requiredTierForSlot(slot) {
  const tier = PRESET_POLICY.minimumTierBySlot[String(slot)] || "premium_plus";
  if (tier === "signed_out") return radioT("guest");
  if (tier === "registered") return radioT("registeredOnly");
  if (tier === "premium") return "Premium";
  return "Premium Plus";
}
function canUsePresetSlot(slot) {
  if (slot === 1) return true;
  if (!radioUser) return false;
  return slot <= capabilities.maxRadioPresets;
}
function canPlayStation(station) {
  if (!station) return false;
  if (station.recommendedSlot === 1) return true;
  if (station.recommendedSlot === 2) return Boolean(radioUser);
  return Boolean(radioUser);
}
function applySkin(requestedSkin,{persist=true}={}) {
  const wanted=AVAILABLE_SKINS.has(requestedSkin)?requestedSkin:"default";
  const active=(wanted==="default"||capabilities.canUseCustomSkins)?wanted:"default";
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
  if (!canPlayStation(normalized)) { setStatus(radioT("registeredOnly")); return; }
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
  if (badge) badge.textContent=capabilities.label||tierLabel(capabilities.tier);
  const userBtn=$("#radioUserBtn");
  if (userBtn) {
    userBtn.textContent = radioUser ? radioT("profile") : radioT("login");
    userBtn.href = radioUser ? "/#profile" : "/#login";
  }
  const saveHint=$("#saveHint");
  if (saveHint) saveHint.textContent=radioUser
    ? radioT("saveCount",{count:capabilities.maxRadioPresets})
    : radioT("saveLogin");
  const skin=$("#skinSelect");
  if (skin) Array.from(skin.options).forEach((option)=>{ if (option.value!=="default") option.disabled=!capabilities.canUseCustomSkins; });
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
          canSave:Boolean(radioUser && capabilities.canSaveRadioChannels),
          onPreview:async(station)=>{
            await selectStation(station,radioT("directoryPreviewing",{station:station.name}));
            await engine.play();
          },
          onSave:async(station)=>{
            if (!radioUser || !capabilities.canSaveRadioChannels) return false;
            await saveRadioChannel(radioClient,radioUser.id,rule.slot,station);
            savedPresets[rule.slot]={...station};
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

      if (!capabilities.canSaveRadioChannels) {
        if (fallback) {
          await selectStation(fallback,radioT("recommendedSelected"));
          await engine.play();
          return;
        }
        setStatus("A szerveroldali preset-mentési jogosultság még nem aktív ehhez a csomaghoz.");
        return;
      }
      if (!selectedStation) { setStatus(radioT("selectFirst")); return; }
      try {
        await saveRadioChannel(radioClient,radioUser?.id,rule.slot,selectedStation);
        savedPresets[rule.slot]={...selectedStation};
        setStatus(`${selectedStation.name} elmentve a(z) ${rule.slot}. presetre.`);
        renderPresets();
      } catch (error) {
        console.error("Radio preset save failed",error);
        setStatus("A preset mentése nem sikerült. Ellenőrizd a jogosultságot és a kapcsolatot.");
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
    if (active!==requested) { setStatus("Egyedi skinek Premium szinttől érhetők el."); return; }
    setStatus(active==="default"?"Idesüss alap skin aktív.":"Premium skin aktív és elmentve.");
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
    capabilities=result.capabilities; radioClient=result.client; radioUser=result.user;
    if (radioUser) {
      const rows=await loadSavedRadioChannels(radioClient,radioUser.id);
      indexSavedPresets(rows);
    }
  } catch (error) {
    console.error("Radio entitlement or preset load failed",error);
    setStatus("A jogosultsági állapot nem tölthető be; biztonsági okból vendég módban működünk.");
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
