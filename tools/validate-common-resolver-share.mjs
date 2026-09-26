import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const EXPECTED_RESOLVER_CONTRACT_BLOB = '759c6b728490dbce14e23644775e9cf3ba2a1e7f';
const EXPECTED_SHARE_INTAKE_BLOB = '7c6d966f17ae769c42ebd8f1e1d48ebf3d81400a';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([header, buffer]))
    .digest('hex');
}

const contractPath = path.join(here, 'fixtures', 'common-resolver-contract.json');
const intakePath = path.join(here, 'fixtures', 'common-share-intake.json');
const resolverPath = path.join(root, 'js', 'resolver.js');
const intakeAdapterPath = path.join(root, 'js', 'shared', 'share-intake.js');
const indexPath = path.join(root, 'index.html');
const appPath = path.join(root, 'app', 'index.html');

const contractBytes = fs.readFileSync(contractPath);
const intakeBytes = fs.readFileSync(intakePath);

assert.equal(
  gitBlobSha(contractBytes),
  EXPECTED_RESOLVER_CONTRACT_BLOB,
  'Web resolver contract fixture drifted from idesuss-common.'
);
assert.equal(
  gitBlobSha(intakeBytes),
  EXPECTED_SHARE_INTAKE_BLOB,
  'Web share-intake fixture drifted from idesuss-common.'
);

const contract = JSON.parse(contractBytes.toString('utf8'));
const intake = JSON.parse(intakeBytes.toString('utf8'));
const resolverSource = fs.readFileSync(resolverPath, 'utf8');
const intakeSource = fs.readFileSync(intakeAdapterPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');

const trackingBlock = resolverSource.match(
  /const trackingParams = \[([\s\S]*?)\n\s*\];/
);
assert.ok(trackingBlock, 'Web resolver tracking parameter list not found.');
const webTrackingParams = [...trackingBlock[1].matchAll(/"([^"]+)"/g)]
  .map((match) => match[1]);
assert.deepEqual(
  webTrackingParams,
  contract.trackingParams,
  'Web resolver tracking parameter list drifted from common.'
);

const sandbox = {
  URLSearchParams,
  window: {
    location: { search: '' },
    IdesussResolver: {
      cleanVideoUrl(rawUrl) {
        return { ok: true, cleanUrl: `clean:${rawUrl}` };
      }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(intakeSource, sandbox, { filename: intakeAdapterPath });

const adapter = sandbox.window.IdesussShareIntake;
assert.ok(adapter, 'Share-intake adapter was not exposed.');
assert.deepEqual(
  Array.from(adapter.fields),
  intake.precedence,
  'Web intake field precedence drifted from common.'
);

for (const field of intake.acceptedFields) {
  const search = new URLSearchParams({ [field]: 'https://example.com/video?id=1' });
  assert.equal(
    adapter.extractIncomingUrl(`?${search.toString()}`),
    'https://example.com/video?id=1',
    `Share intake field failed: ${field}`
  );
}

assert.equal(
  adapter.extractIncomingUrl('?text=hello%20https%3A%2F%2Fexample.com%2Fx%20world'),
  'https://example.com/x',
  'Share intake did not extract the first URL from text.'
);
assert.equal(
  adapter.resolveIncomingUrl('?url=https%3A%2F%2Fexample.com%2Fx'),
  'clean:https://example.com/x',
  'Share intake did not pass the URL through the shared resolver.'
);

for (const source of [indexSource, appSource]) {
  assert.ok(
    source.includes('IdesussShareIntake'),
    'Web consumer is not using the shared intake adapter.'
  );
}

assert.ok(
  !indexSource.includes('function cleanIncomingUrl'),
  'Root index must not implement a private incoming URL cleaner.'
);
assert.ok(
  !indexSource.includes('ides_shared_last_url'),
  'Dead shared URL localStorage key must not return.'
);

console.log(
  `Web resolver/share parity OK: ${contract.trackingParams.length} tracking parameter(s), ${intake.acceptedFields.length} intake field(s).`
);
