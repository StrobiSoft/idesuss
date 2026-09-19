import { IdesussRadioEngine } from "./radio-engine.js";
import { loadRadioCapabilities, loadSavedRadioChannels, saveRadioChannel } from "./radio-entitlements.js";
import { getEnabledRadioStations, normalizeRadioStation, createDevelopmentToneStation, createDevelopmentExternalStation } from "./radio-stations.js";

const VOLUME_STORAGE_KEY = "idesuss.radio.volume.v1";
const SKIN_STORAGE_KEY = "idesuss.radio.skin.v1";
const AVAILABLE_SKINS = new Set(["default", "night-drive", "classic-black"]);
const DEV_PARAMS = new URLSearchParams(window.location.search);
const DEV_AUDIO_MODE = DEV_PARAMS.get("dev") === "1";
const developmentTone = DEV_AUDIO_MODE ? createDevelopmentToneStation() : null;
const developmentExternalStation = DEV_AUDIO_MODE
  ? createDevelopmentExternalStation(DEV_PARAMS.get("stream"), DEV_PARAMS.get("type") || "auto")
  : null;
const STATIONS = [
  ...getEnabledRadioStations(),
  ...(developmentTone?.station ? [developmentTone.station] : []),
  ...(developmentExternalStation ? [developmentExternalStation] : [])
];
const PRESET_RULES = Array.from({ length: 8 }, (_unused, index) => ({
  slot: index + 1,
  freeStation: index < 2 ? (STATIONS[index] || null) : null
}));
const STREAM_STATE_TEXT = {
  loading:"Streamforrás betöltése…", ready:"A stream készen áll a lejátszásra.",
  buffering:"Pufferelés…", stalled:"A stream nem küld adatot; várakozás az újracsatlakozásra…",
  playing:"Élő adás lejátszása folyamatban.", paused:"Lejátszás szüneteltetve.",
  stopped:"Lejátszás leállítva.", ended:"A stream véget ért.",
  unconfigured:"Az állomáshoz még nincs streamforrás bekötve."
};

const storedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
const initialVolume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.7;
const engine = new IdesussRadioEngine({ initialVolume });
let capabilities = { tier:"signed_out", label:"Vendég", canSaveRadioChannels:false, maxRadioPresets:0, canUseCustomSkins:false, canUsePremiumPlusFeatures:false };
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
  return "Vendég";
}
function requiredTierForSlot(slot) {
  if (slot<=2) return "Free";
  if (slot<=6) return "Premium";
  return "Premium Plus";
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
    name:row?.channel_name||"Mentett állomás",
    info:row?.metadata?.info||"Mentett rádióállomás",
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
    const match=/^preset_(\d+)$/.exec(row.channel_key||"");
    if (!match) continue;
    const station=savedRowToStation(row);
    if (station) savedPresets[Number(match[1])]=station;
  }
}
async function selectStation(station,message=null) {
  const normalized=normalizeRadioStation(station);
  if (!normalized) { setStatus("Érvénytelen rádióállomás-adat."); return; }
  selectedStation=normalized;
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
  const saveHint=$("#saveHint");
  if (saveHint) saveHint.textContent=radioUser
    ? `A csomagodban ${capabilities.maxRadioPresets} menthető rádiópreset érhető el.`
    : "A presetek mentéséhez bejelentkezés szükséges.";
  const skin=$("#skinSelect");
  if (skin) Array.from(skin.options).forEach((option)=>{ if (option.value!=="default") option.disabled=!capabilities.canUseCustomSkins; });
  const preferredSkin=localStorage.getItem(SKIN_STORAGE_KEY)||"default";
  const activeSkin=applySkin(preferredSkin,{persist:false});
  if (activeSkin!==preferredSkin) localStorage.setItem(SKIN_STORAGE_KEY,activeSkin);
}
function renderStations() {
  const host=$("#stationList"); if (!host) return; host.replaceChildren();
  if (!STATIONS.length) {
    const empty=document.createElement("div"); empty.className="note";
    empty.textContent="Jóváhagyott élő rádióforrás még nincs a katalógusban. A lejátszómotor a Hangteszt gombbal kipróbálható.";
    host.appendChild(empty); return;
  }
  STATIONS.forEach((station)=>{
    const button=document.createElement("button"); button.type="button"; button.className="station";
    appendTextElement(button,"strong",station.name);
    appendTextElement(button,"span",station.info||"Rádióállomás");
    button.addEventListener("click",()=>selectStation(station));
    host.appendChild(button);
  });
}
function renderPresets() {
  const host=$("#presetGrid"); if (!host) return; host.replaceChildren();
  PRESET_RULES.forEach((rule)=>{
    const unlocked=Boolean(radioUser)&&rule.slot<=capabilities.maxRadioPresets;
    const stored=savedPresets[rule.slot]||null;
    const fallback=rule.freeStation||null;
    const stationForButton=stored||fallback;
    const button=document.createElement("button"); button.type="button";
    button.className=`preset${unlocked?"":" locked"}${stored?" saved":""}`;
    button.disabled=!unlocked;
    appendTextElement(button,"b",rule.slot);
    appendTextElement(button,"small",stationForButton?.name||(unlocked?"üres":requiredTierForSlot(rule.slot)));
    button.title=unlocked
      ? (stationForButton?`${stationForButton.name} betöltése`:"Üres preset — a kiválasztott állomás mentése")
      : `${requiredTierForSlot(rule.slot)} csomag szükséges`;
    button.addEventListener("click",async()=>{
      if (stationForButton) {
        await selectStation(stationForButton,stored?"Mentett preset kiválasztva; stream ellenőrzése…":"Beépített Free preset kiválasztva.");
        return;
      }
      if (!capabilities.canSaveRadioChannels) { setStatus("A szerveroldali preset-mentési jogosultság még nem aktív ehhez a csomaghoz."); return; }
      if (!selectedStation) { setStatus("Mentéshez előbb válassz állomást."); return; }
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
      if (error.message==="NO_STATION") setStatus("Előbb válassz állomást.");
      else if (error.message==="STREAM_NOT_CONFIGURED") setStatus("Ehhez az állomáshoz még nincs streamforrás bekötve.");
      else setStatus(`Lejátszási hiba: ${error.message}`);
    }
  });
  $("#stopBtn")?.addEventListener("click",()=>engine.stop());
  $("#audioTestBtn")?.addEventListener("click",async()=>{
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
    if (button) button.textContent=state==="playing"?"⏸ Szünet":"▶ Lejátszás";
    if (STREAM_STATE_TEXT[state]) setStatus(STREAM_STATE_TEXT[state]);
  });
  engine.addEventListener("volume",(event)=>{
    const slider=$("#volumeSlider");
    if (slider) slider.value=String(Math.round((event.detail?.volume||0)*100));
  });
  engine.addEventListener("error",(event)=>setStatus(event.detail?.message||"Rádióhiba történt."));
}
async function init() {
  renderStations(); bindControls(); bindEngineEvents();
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
  renderTier(); renderPresets();
}
window.addEventListener("beforeunload",()=>{
  developmentTone?.revoke?.();
  audioTestTone?.revoke?.();
  engine.destroy();
});
init();
