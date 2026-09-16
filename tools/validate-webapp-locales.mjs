import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const appDir = path.join(root, 'app');
const appIndex = path.join(appDir, 'index.html');
const homeIndex = path.join(root, 'index.html');
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

const bridgeEntry = path.join(appDir, 'profile-bridge-entry.js');
const languageOptions = path.join(appDir, 'language-options.js');
if (!fs.existsSync(bridgeEntry)) {
  failures.push('app/profile-bridge-entry.js: missing');
} else {
  const bridgeSource = fs.readFileSync(bridgeEntry, 'utf8');
  if (!bridgeSource.includes("./language-options.js")) {
    failures.push('app/profile-bridge-entry.js: Belarusian language extension is not wired');
  }
  if (!bridgeSource.includes("document.querySelector('.brand-home-link')") ||
      !bridgeSource.includes("new URL('../', window.location.href)") ||
      !bridgeSource.includes('window.location.assign(homeUrl.href)')) {
    failures.push('app/profile-bridge-entry.js: executable home navigation fallback is missing');
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

if (!fs.existsSync(homeIndex)) {
  failures.push('index.html: missing');
} else {
  const homeSource = fs.readFileSync(homeIndex, 'utf8');
  if (!homeSource.includes('.hero-footer-links a { color: #173b74; }')) {
    failures.push('index.html: hero webapp link contrast guard is missing');
  }
}

if (failures.length) {
  console.error('Webapp validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Webapp validation OK: ${dictionaries.size} locale(s), ${union.size} shared keys, all runtime t(...) keys covered, navigation, status reset, contrast, profile bridge, and Belarusian option wired.`);