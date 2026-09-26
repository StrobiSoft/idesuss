import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_BLOBS = {
  hu: '6856511fe710ab7bfceffc57a02758bd68cf8fe2',
  en: 'a8e1ab8b40760e2736bf374723bbc724d4f94f30',
  nl: '03b156122a14898a985bde82114f6e97d3b6ea4e',
  ro: '4a06c48e7b9b07ea17481d0f1503baa4dbf91b8b',
  pl: 'e50c059f72a78596636ce7a7f4bcee10fb7ee212',
  hr: '6f8903463c71011eb6f878be41d7a138220c40a8',
  be: '5e6bec45d77bcd9512c477a0cd232ca2bc3b16ac'
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
