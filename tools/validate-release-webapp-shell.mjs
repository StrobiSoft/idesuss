import fs from "node:fs";

function fail(message) {
  console.error("RELEASE_WEBAPP_SHELL_FAIL:", message);
  process.exitCode = 1;
}

function expect(condition, message) {
  if (!condition) fail(message);
}

const html = fs.readFileSync("app/index.html", "utf8");
const css = fs.readFileSync("app/app-release.css", "utf8");
const sw = fs.readFileSync("app/service-worker.js", "utf8");

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync("app/manifest.json", "utf8"));
} catch (error) {
  fail(`app/manifest.json is not valid JSON: ${error.message}`);
  manifest = {};
}

expect(manifest.start_url === "/app/", "manifest start_url must stay /app/");
expect(manifest.scope === "/app/", "manifest scope must stay /app/");
expect(manifest.share_target?.action === "/app/?share-target=1", "share target must enter the Webapp");
expect(manifest.theme_color === "#07111c", "manifest theme must match release canvas");

expect(html.includes('href="/design-system.css'), "Webapp must load shared design-system.css");
expect(html.includes('href="./app-release.css'), "Webapp must load app-release.css");
expect(!/<style(?:\s|>)/i.test(html), "Webapp must not re-introduce a large inline style block");

const requiredIds = [
  "langSelect","installBtn","visitCount","urlInput","goBtn","playBtnText",
  "pasteBtn","shareBtn","clearInputBtn","status","inputCard","playerCard",
  "ytFrame","backBtn","historyTitle","clearHistoryBtn","historyList",
  "appMenuToggle","appMenu","appMenuHome","appMenuRadio","appMenuRules",
  "aboutLink","aboutModal","aboutTitle","aboutText","aboutCloseBtn"
];
for (const id of requiredIds) {
  expect(new RegExp(`\\bid=["']${id}["']`).test(html), `missing critical DOM id #${id}`);
}

const jsIdRefs = [...html.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]);
const htmlIds = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]));
for (const id of new Set(jsIdRefs)) {
  expect(htmlIds.has(id), `inline Webapp runtime references missing DOM id #${id}`);
}

for (const route of ["/","/ferry/","/rola/","/radio/","/app/","/tools/"]) {
  expect(html.includes(`href="${route}`) || (route === "/radio/" && html.includes('href="/radio/?autoplay=1"')), `platform route missing from Webapp navigation: ${route}`);
}

expect(css.includes("--idesuss-canvas"), "app-release.css must consume shared release tokens");
expect(css.includes(".platform-nav"), "app-release.css must define platform navigation");
expect(css.length > 20000, "app-release.css extraction appears unexpectedly incomplete");

for (const asset of [
  '"/app/index.html"',
  '"/app/app-release.css"',
  '"/design-system.css"',
  '"/app/hu.json.txt"',
  '"/app/en.json.txt"',
  '"/app/be.json.txt"'
]) {
  expect(sw.includes(asset), `service worker precache missing ${asset}`);
}

expect(sw.includes('caches.open(CACHE_NAME)'), "service worker must populate the cache");
expect(sw.includes('event.request.mode === "navigate"'), "service worker must provide offline navigation fallback");

if (!process.exitCode) {
  console.log("RELEASE_WEBAPP_SHELL_OK");
}
