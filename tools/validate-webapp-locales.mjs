import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const appDir = path.join(root, 'app');
const expectedLocales = ['hu', 'en', 'nl', 'ro', 'pl'];

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

if (failures.length) {
  console.error('Webapp locale validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Webapp locale parity OK: ${dictionaries.size} locale(s), ${union.size} shared keys.`);
