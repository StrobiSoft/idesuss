import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const EXPECTED_COMMON_BLOB = 'a7077a29bb9b7e06f1b92998a449fb9435e315d7';

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([header, buffer]))
    .digest('hex');
}

const fixtureBytes = fs.readFileSync(
  new URL('./fixtures/common-presence-contract.json', import.meta.url)
);
assert.equal(
  gitBlobSha(fixtureBytes),
  EXPECTED_COMMON_BLOB,
  'Web presence fixture drifted from idesuss-common.'
);

const contract = JSON.parse(fixtureBytes.toString('utf8'));
const policySource = fs.readFileSync(
  new URL('../js/shared/presence-policy.js', import.meta.url),
  'utf8'
);
const authSource = fs.readFileSync(
  new URL('../js/menu/auth-controller.js', import.meta.url),
  'utf8'
);
const indexSource = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
);
const anonymousSource = fs.readFileSync(
  new URL('../js/anonymous-presence.js', import.meta.url),
  'utf8'
);

assert.ok(
  policySource.includes(`heartbeatRpc: "${contract.authenticated.heartbeatRpc}"`)
);
assert.ok(
  policySource.includes(`offlineRpc: "${contract.authenticated.offlineRpc}"`)
);
assert.ok(
  policySource.includes(`listRpc: "${contract.authenticated.listRpc}"`)
);
assert.ok(
  policySource.includes(
    `heartbeatIntervalMs: ${contract.authenticated.heartbeatIntervalMs}`
  )
);
assert.ok(
  policySource.includes(
    `staleAfterMs: ${contract.authenticated.staleAfterMs}`
  )
);
assert.ok(
  policySource.includes(
    `heartbeatIntervalMs: ${contract.anonymousWebPresence.heartbeatIntervalMs}`
  )
);
assert.ok(
  policySource.includes(
    `staleAfterMs: ${contract.anonymousWebPresence.staleAfterMs}`
  )
);

assert.ok(authSource.includes('PRESENCE_POLICY.heartbeatRpc'));
assert.ok(authSource.includes('PRESENCE_POLICY.offlineRpc'));
assert.ok(authSource.includes('PRESENCE_POLICY.heartbeatIntervalMs'));
assert.ok(authSource.includes('PRESENCE_POLICY.pageField'));

assert.ok(anonymousSource.includes('PRESENCE_POLICY.anonymousWeb'));
assert.ok(indexSource.includes('/js/anonymous-presence.js'));
assert.ok(!indexSource.includes('ONLINE_TIMEOUT_SECONDS'));
assert.ok(!indexSource.includes('HEARTBEAT_INTERVAL_MS'));
assert.ok(!indexSource.includes('function heartbeatOnline'));
assert.ok(!indexSource.includes('function getActiveOnlineTabs'));

console.log('Web presence parity OK.');
