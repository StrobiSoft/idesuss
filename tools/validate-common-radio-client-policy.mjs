import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const EXPECTED_POLICY_BLOB = 'f89890ba5b5effe917b13bf3f31fb70394f28779';

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([header, buffer]))
    .digest('hex');
}

const fixtureBytes = fs.readFileSync(
  new URL('./fixtures/common-radio-client-policy.json', import.meta.url)
);
assert.equal(
  gitBlobSha(fixtureBytes),
  EXPECTED_POLICY_BLOB,
  'Web Radio client policy fixture drifted from idesuss-common.'
);

const policy = JSON.parse(fixtureBytes.toString('utf8'));
const generated = fs.readFileSync(
  new URL('../radio/radio-policy.js', import.meta.url),
  'utf8'
);
const expectedGenerated =
  `export const RADIO_CLIENT_POLICY = Object.freeze(${JSON.stringify(policy, null, 2)});\n`;

assert.equal(
  generated,
  expectedGenerated,
  'Generated web Radio policy drifted from common.'
);

const directory = fs.readFileSync(
  new URL('../radio/radio-directory.js', import.meta.url),
  'utf8'
);
const entitlements = fs.readFileSync(
  new URL('../radio/radio-entitlements.js', import.meta.url),
  'utf8'
);
const app = fs.readFileSync(
  new URL('../radio/radio-app.js', import.meta.url),
  'utf8'
);

assert.ok(directory.includes('RADIO_CLIENT_POLICY.directory'));
assert.ok(entitlements.includes('RADIO_CLIENT_POLICY.preset'));
assert.ok(app.includes('RADIO_CLIENT_POLICY.preset'));
assert.ok(entitlements.includes('getSharedSupabaseClient'));

for (const forbidden of [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'get_my_idesuss_entitlements',
  'saved_radio_channels'
]) {
  assert.ok(
    !directory.includes(forbidden) && !entitlements.includes(forbidden),
    `Web Radio hardcoded common policy value returned: ${forbidden}`
  );
}

console.log('Web Radio client policy parity OK.');
