import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_BLOBS = {
  hu: 'b0b0a63d587f550383d4401f993678d9eaf7a19f',
  en: 'd4c50a31ee8889ce8e9bcf79e4678d4c3d8ce829',
  nl: 'ed23b1a2677dcee923a1b36586922eef0947a6fc',
  ro: '6d38ff9dac2a8e3a0b9d543d1e99a3fd2b206af7',
  pl: '72a9769c116e10dc790662f6d358fd1b52a113f6',
  hr: '86a7dc0160ae2e578d2a2b030b69c3823e3ad913',
  be: '0dfd16131dd253c14c216e272440b5b4e2fe4f11'
};

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([header, buffer]))
    .digest('hex');
}

for (const [locale, expectedBlob] of Object.entries(EXPECTED_BLOBS)) {
  const fixturePath = path.join(
    here,
    'fixtures',
    'common-home-locales',
    `${locale}.json`
  );
  const fixtureBytes = fs.readFileSync(fixturePath);

  assert.equal(
    gitBlobSha(fixtureBytes),
    expectedBlob,
    `${locale}: pinned common locale drifted from idesuss-common`
  );

  const commonLocale = JSON.parse(fixtureBytes.toString('utf8'));
  assert.equal(commonLocale.locale, locale);
  assert.ok(commonLocale.webHome && typeof commonLocale.webHome === 'object');

  const expectedModule =
    `export default ${JSON.stringify({
      common: { appName: 'Idesüss' },
      home: commonLocale.webHome
    }, null, 2)};\n`;

  const activePath = path.join(
    root,
    'js',
    'lang',
    'modules',
    'Home',
    'lang',
    `${locale}.js`
  );
  const active = fs.readFileSync(activePath, 'utf8');

  assert.equal(
    active,
    expectedModule,
    `${locale}: active Home locale drifted from common webHome`
  );
}

console.log(
  `Common Home locale parity OK: ${Object.keys(EXPECTED_BLOBS).length} locale(s).`
);
