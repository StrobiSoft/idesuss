import fs from "node:fs";

const index = fs.readFileSync("index.html","utf8");
const menuCore = fs.readFileSync("js/menu/menu-core.js","utf8");
const settings = fs.readFileSync("js/menu/settings.js","utf8");
const polish = fs.readFileSync("visual-polish.css","utf8");
const serviceWorker = fs.readFileSync("service-worker.js","utf8");

function assert(condition,message){ if(!condition) throw new Error(message); }

assert(index.includes('id="openSettingsBtn"'),"homepage settings menu button missing");
assert(index.includes('ONLINE_TAB_PREFIX') && index.includes('sessionStorage.getItem("idesuss_online_tab_id")'),"multi-tab online presence coordination missing");
assert(index.includes('isOnlineLeader()') && index.includes('localStorage.removeItem(tabStorageKey)'),"online presence leader/offline coordination missing");
assert(menuCore.includes('openSettingsPanel') && menuCore.includes('initSettingsPreferences'),"settings panel not wired into menu core");
assert(settings.includes('setIdesussLanguage') && settings.includes('getIdesussLanguage'),"settings language must use shared language preference");
assert(settings.includes('idesuss_theme') && settings.includes('idesuss_brightness'),"device-local appearance preferences missing");
assert(!settings.toLowerCase().includes("always on top"),"unsupported always-on-top setting must not be exposed");
assert(polish.includes('data-idesuss-theme="dark"'),"dark appearance CSS missing");
assert(polish.includes('--idesuss-dim-opacity'),"brightness/dimming CSS missing");
assert(serviceWorker.includes('idesuss-root-v7'),"service worker cache version must be bumped");
assert(serviceWorker.includes('/js/menu/settings.js?v=20260923-finalweb1'),"settings module missing from static cache");

const requiredSettingsKeys = [
  "menuSettings","settingsClose","settingsTitle","settingsIntro","settingsLanguage",
  "settingsAppearance","settingsThemeAuto","settingsThemeLight","settingsThemeDark",
  "settingsBrightness","settingsShare","settingsLogout","settingsShareText",
  "settingsShareDone","settingsLinkCopied","settingsShareError"
];

for (const code of ["hu","en","nl","ro","pl","hr","be"]) {
  const home = fs.readFileSync(`js/lang/modules/Home/lang/${code}.js`,"utf8");
  for (const key of requiredSettingsKeys) {
    assert(home.includes(`${key}:`),`missing ${code} home settings key: ${key}`);
  }

  const webapp = JSON.parse(fs.readFileSync(`app/${code}.json.txt`,"utf8"));
  assert(typeof webapp.langSubnote === "string" && webapp.langSubnote.length > 10,`missing ${code} langSubnote`);
  assert(!/Hungarian browser|Magyar böngésző|Browser maghiar|Węgierska przeglądarka|Hongaarse browser|Беларуская мова браўзера/i.test(webapp.langSubnote),
    `${code} langSubnote still describes obsolete browser-language behavior`);
}

console.log("Final web shell validation: OK");
