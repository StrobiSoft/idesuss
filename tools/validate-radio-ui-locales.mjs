import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("radio/index.html");
const translations = read("radio/radio-language.js");
const app = read("radio/radio-app.js");
const stationsSrc = read("radio/radio-stations.js");
const apiSrc = read("radio/radio-api-client.js");

const start = translations.indexOf("const TEXT = ");
const end = translations.indexOf("\n\nlet currentLanguage", start);
assert.ok(start !== -1 && end > start, "Radio translation dictionary not found");
const TEXT = vm.runInNewContext(translations.slice(start, end) + "\nTEXT");
const locales = ["hu", "en", "nl", "ro", "pl", "hr", "be"];
const keys = Object.keys(TEXT.hu);
for (const locale of locales) {
  assert.ok(TEXT[locale], "Missing Radio locale " + locale);
  for (const key of keys) {
    assert.equal(typeof TEXT[locale][key], "string", locale + ": missing key " + key);
    assert.ok(TEXT[locale][key].trim(), locale + ": empty key " + key);
  }
}

const usedKeys = [...html.matchAll(/data-radio-i18n(?:-aria-label)?="([^"]+)"/g)]
  .map(match => match[1]);
for (const key of usedKeys) assert.ok(keys.includes(key), "Untranslated Radio element: " + key);
for (const key of [
  "brandHomeAria", "radioAria", "controlsAria", "skinAria",
  "presetsHint", "playbackLabel", "playbackMeta", "localPresetsHint",
  "savedPresetSelected", "presetSavedStatus", "presetSaveFailed"
]) assert.ok(keys.includes(key), "Missing Radio interface key: " + key);

assert.match(html, /class="section-hint" data-radio-i18n="presetsHint"/);
assert.match(html, /class="radio-control-meta" data-radio-i18n="playbackMeta"/);
assert.match(html, /href="\.\." data-radio-i18n="home"/);
assert.match(app, /if \(fallback\) \{/);
assert.match(app, /getLocaleSecondaryStationSeed\(locale\)/);
assert.match(app, /radioT\("localPresetsHint"\)/);
for (const oldText of [
  "Mentett preset kiválasztva", "Állomásválasztási hiba",
  "A presetek ezen az eszközön", "A preset mentése nem sikerült"
]) assert.ok(!app.includes(oldText), "Hardcoded Hungarian Radio text: " + oldText);

const stationModule = vm.runInNewContext(
  stationsSrc.replace(/^export /gm, "") +
    "\n({getLocaleSecondaryStationSeed,RADIO_SECOND_FAVORITES_BY_LOCALE})",
  { window: { localStorage: { getItem: () => null }, navigator: { language: "en" } }, URL }
);
for (const locale of locales) {
  const seed = stationModule.getLocaleSecondaryStationSeed(locale);
  assert.equal(seed.preferredLocale, locale);
  assert.equal(seed.recommendedSlot, 2);
  assert.ok(seed.directoryName && seed.countryCode);
  assert.ok(stationModule.RADIO_SECOND_FAVORITES_BY_LOCALE[locale]);
}
assert.equal(stationModule.getLocaleSecondaryStationSeed("ro").name, "Radio ZU");

const catalogApi = vm.runInNewContext(
  apiSrc.replace(/^export /gm, "") + "\nloadSharedRadioCatalog",
  {
    window: { location: { href: "https://idesuss.net/radio/" } },
    URL,
    fetch: async () => ({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        stations: [
          { id: "ro-kiss-fm", name: "Kiss FM", preferred: true, recommendedSlot: 1, countryCode: "RO", playbackPath: "/v1/radio/stream/ro-kiss-fm" },
          { id: "ro-radio-zu", name: "Radio ZU", preferred: false, recommendedSlot: 2, countryCode: "RO", playbackPath: "/v1/radio/stream/ro-radio-zu" }
        ]
      })
    })
  }
);
const catalog = await catalogApi("ro", "https://radio.example.org");
assert.equal(catalog.length, 2);
assert.equal(catalog[0].isLocaleFavorite, true);
assert.equal(catalog[1].recommendedSlot, 2);
assert.equal(catalog[1].preferredLocale, "ro");
assert.equal(catalog[1].countryCode, "RO");
assert.equal(catalog[1].streamUrl, "https://radio.example.org/v1/radio/stream/ro-radio-zu");
console.log("Radio locale and two-preset regression checks passed.");
