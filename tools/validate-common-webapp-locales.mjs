import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(here, 'fixtures', 'common-webapp-locale-manifest.json'),
    'utf8'
  )
);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.commonRepository, 'StrobiSoft/idesuss-common');
assert.equal(manifest.namespace, 'webapp');
assert.match(manifest.commonCommit, /^[0-9a-f]{40}$/);

for (const [locale, expected] of Object.entries(manifest.locales)) {
  const localePath = path.join(root, 'app', `${locale}.json.txt`);
  const payload = JSON.parse(fs.readFileSync(localePath, 'utf8'));

  assert.deepEqual(
    payload,
    expected.payload,
    `${locale}: active webapp locale drifted from the generated common payload`
  );
  assert.match(expected.commonLocaleBlobSha, /^[0-9a-f]{40}$/);
}

console.log(
  `Common webapp locale parity OK: ${Object.keys(manifest.locales).length} locale(s), common commit ${manifest.commonCommit}.`
);
