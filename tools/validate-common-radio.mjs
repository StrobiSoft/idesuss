import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { RADIO_FAVORITES_BY_LOCALE } from '../radio/radio-stations.js';

const EXPECTED_CATALOG_BLOB = 'a45b3d01f9ad9fae1d7ebe0fcb7445e74651e114';
const EXPECTED_DEFAULTS_BLOB = '0870cdaadea55764bec8902d847b81a657880d2e';

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([header, buffer]))
    .digest('hex');
}

const catalogBytes = fs.readFileSync(
  new URL('../server/radio-proxy/common-radio-catalog.json', import.meta.url)
);
const defaultsBytes = fs.readFileSync(
  new URL('./fixtures/common-radio-defaults.json', import.meta.url)
);

assert.equal(
  gitBlobSha(catalogBytes),
  EXPECTED_CATALOG_BLOB,
  'Radio proxy catalog drifted from canonical idesuss-common/src/radio/catalog.json.'
);
assert.equal(
  gitBlobSha(defaultsBytes),
  EXPECTED_DEFAULTS_BLOB,
  'Radio defaults fixture drifted from canonical idesuss-common/src/radio/defaults.json.'
);

const catalog = JSON.parse(catalogBytes.toString('utf8'));
const defaults = JSON.parse(defaultsBytes.toString('utf8'));

assert.equal(catalog.schemaVersion, 1);
assert.equal(defaults.schemaVersion, 1);

for (const [locale, preset] of Object.entries(defaults.presetOne.byLocale)) {
  const favorite = RADIO_FAVORITES_BY_LOCALE[locale];
  assert.ok(favorite, `${locale}: missing web fallback seed`);
  assert.equal(favorite.id, preset.stationId, `${locale}: station id drift`);
  assert.equal(favorite.name, preset.name, `${locale}: station name drift`);
  assert.equal(favorite.countryCode, preset.countryCode, `${locale}: country drift`);

  const station = catalog.stations.find((row) => row.id === preset.stationId);
  assert.ok(station, `${locale}: common default station missing from catalog`);
  assert.equal(station.recommendedSlot, 1, `${locale}: default station is not slot 1`);
}

console.log(
  `Common Radio parity OK: ${catalog.stations.length} canonical station(s), ${Object.keys(defaults.presetOne.byLocale).length} locale default(s).`
);
