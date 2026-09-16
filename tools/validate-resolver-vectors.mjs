import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const EXPECTED_COMMON_BLOB_SHA = 'e7a0e20264f53d2f7d9843605080d28bcb5d5559';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fixturePath = path.join(here, 'fixtures', 'resolver-vectors.json');
const resolverPath = path.join(root, 'js', 'resolver.js');

const fixtureBytes = fs.readFileSync(fixturePath);
const gitBlobHeader = Buffer.from(`blob ${fixtureBytes.length}\0`);
const fixtureBlobSha = crypto
  .createHash('sha1')
  .update(Buffer.concat([gitBlobHeader, fixtureBytes]))
  .digest('hex');

assert.equal(
  fixtureBlobSha,
  EXPECTED_COMMON_BLOB_SHA,
  'Generated resolver vectors must exactly match the canonical idesuss-common blob.'
);

const vectors = JSON.parse(fixtureBytes.toString('utf8'));
const sandbox = {
  URL,
  window: {},
  document: {
    querySelector() {
      return null;
    },
    createElement() {
      return { dataset: {} };
    },
    head: {
      appendChild() {}
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(resolverPath, 'utf8'), sandbox, {
  filename: resolverPath
});

const resolver = sandbox.window.IdesussResolver;
assert.equal(typeof resolver?.cleanVideoUrl, 'function');

for (const vector of vectors.cases) {
  const actual = resolver.cleanVideoUrl(vector.input);
  assert.equal(actual.ok, vector.ok, `${vector.name}: ok`);
  assert.equal(actual.platform, vector.platform, `${vector.name}: platform`);
  assert.equal(actual.cleanUrl, vector.cleanUrl, `${vector.name}: cleanUrl`);
  if (vector.error) assert.equal(actual.error, vector.error, `${vector.name}: error`);
}

console.log(
  `Resolver parity OK: ${vectors.cases.length} canonical vector(s), common blob ${fixtureBlobSha}.`
);
