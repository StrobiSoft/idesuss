import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const appDir = path.join(root, 'app');
const appIndex = path.join(appDir, 'index.html');
const homeIndex = path.join(root, 'index.html');
const menuCore = path.join(root, 'js', 'menu', 'menu-core.js');
const homeLanguage = path.join(root, 'js', 'lang', 'home-language.js');
const expectedLocales = ['hu', 'en', 'nl', 'ro', 'pl', 'be'];

const dictionaries = new Map();
const failures = [];

for (const locale of expectedLocales) {
  const file = path.join(appDir, `${locale}.json.txt`);
  if (!fs.existsSync(file)) {
    failures.push(`${locale}: missing locale file`);
    continue;
  }
  try {
    dictionaries.set(locale, JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (error) {
    failures.push(`${locale}: invalid JSON (${error.message})`);
  }
}

const union = new Set();
for (const dict of dictionaries.values()) {
  for (const key of Object.keys(dict)) union.add(key);
}

for (const [locale, dict] of dictionaries) {
  for (const key of union) {
    if (typeof dict[key] !== 'string' || dict[key].trim() === '') {
      failures.push(`${locale}: missing/non-string key ${key}`);
    }
  }
}

if (!fs.existsSync(appIndex)) {
  failures.push('app/index.html: missing');
} else {
  const source = fs.readFileSync(appIndex, 'utf8');
  const runtimeKeys = new Set();
  const tCall = /\bt\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = tCall.exec(source)) !== null) {
    runtimeKeys.add(match[1]);
  }

  for (const key of runtimeKeys) {
    for (const [locale, dict] of dictionaries) {
      if (typeof dict[key] !== 'string' || dict[key].trim() === '') {
        failures.push(`${locale}: runtime key ${key} used by app/index.html but missing`);
      }
    }
  }

  if (!source.includes('<script type="module" src="./profile-bridge-entry.js"></script>')) {
    failures.push('app/index.html: shared profile bridge entrypoint is not wired');
  }

  if (!source.includes('<a class="brand brand-home-link" href="/" aria-label="Idesüss főoldal">')) {
    failures.push('app/index.html: webapp brand does not link accessibly to the homepage');
  }

  if (!source.includes("els.urlInput.addEventListener('input'")) {
    failures.push('app/index.html: manual input does not clear stale status messages');
  }
}

if (!fs.existsSync(homeIndex)) {
  failures.push('index.html: missing');
} else {
  const homeSource = fs.readFileSync(homeIndex, 'utf8');
  if (!homeSource.includes('.hero-footer-links a { color: #173b74; }')) {
    failures.push('index.html: hero webapp link contrast guard is missing');
  }
}

if (!fs.existsSync(homeLanguage)) {
  failures.push('js/lang/home-language.js: missing');
} else {
  const homeLanguageSource = fs.readFileSync(homeLanguage, 'utf8');
  if (!homeLanguageSource.includes('["hu", "en", "nl", "ro", "pl", "be"]')) {
    failures.push('js/lang/home-language.js: canonical six-language set is not configured');
  }
  if (!homeLanguageSource.includes('BY Беларуская')) {
    failures.push('js/lang/home-language.js: Belarusian homepage option is missing');
  }
  if (homeLanguageSource.includes('hr:') || homeLanguageSource.includes('HR Hrvatski')) {
    failures.push('js/lang/home-language.js: stale Croatian homepage option remains');
  }
}

for (const locale of ['nl', 'ro', 'pl']) {
  const file = path.join(root, 'js', 'lang', 'modules', 'Home', 'lang', `${locale}.js`);
  if (!fs.existsSync(file)) failures.push(`homepage ${locale}: generated Common-derived module missing`);
}

if (!fs.existsSync(menuCore)) {
  failures.push('js/menu/menu-core.js: missing');
} else {
  const menuSource = fs.readFileSync(menuCore, 'utf8');
  for (const required of [
    'makeHomepageBrandStatic',
    'ensureOpenButtonDepth',
    'wireHomepageMenu',
    'openSettingsBtn',
    'homepageSettingsPanel',
    'aria-expanded',
    'ensureSettingsCloseStyle',
    'syncSettingsLanguageSelect',
    '#homepageSettingsClose::before'
  ]) {
    if (!menuSource.includes(required)) {
      failures.push(`js/menu/menu-core.js: missing navigation/UI guard ${required}`);
    }
  }
}

const bridgeEntry = path.join(appDir, 'profile-bridge-entry.js');
const languageOptions = path.join(appDir, 'language-options.js');
if (!fs.existsSync(bridgeEntry)) {
  failures.push('app/profile-bridge-entry.js: missing');
} else {
  const bridgeSource = fs.readFileSync(bridgeEntry, 'utf8');
  if (!bridgeSource.includes("./language-options.js")) {
    failures.push('app/profile-bridge-entry.js: Belarusian language extension is not wired');
  }
  if (!bridgeSource.includes('wireBrandHomeLink') || !bridgeSource.includes("new URL('../', window.location.href)")) {
    failures.push('app/profile-bridge-entry.js: runtime brand-to-home navigation is not wired');
  }
}
if (!fs.existsSync(languageOptions)) {
  failures.push('app/language-options.js: missing');
} else {
  const languageSource = fs.readFileSync(languageOptions, 'utf8');
  if (!languageSource.includes("BELARUSIAN_LOCALE = 'be'")) {
    failures.push('app/language-options.js: Belarusian locale is not configured');
  }
}

if (failures.length) {
  console.error('Webapp validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Webapp validation OK: ${dictionaries.size} locale(s), ${union.size} shared keys, canonical homepage locale coverage, homepage menu/settings, normalized close control, button depth, webapp home navigation, status reset, contrast, profile bridge, and Belarusian option wired.`);
