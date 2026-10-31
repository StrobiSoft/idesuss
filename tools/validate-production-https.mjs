import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../js/shared/production-https.js", import.meta.url), "utf8");
const { productionHttpsTarget, ensureSecureProductionOrigin } = await import("data:text/javascript," + encodeURIComponent(source));
function location(url) {
  const parsed = new URL(url);
  return { hostname: parsed.hostname, protocol: parsed.protocol, pathname: parsed.pathname, search: parsed.search, hash: parsed.hash };
}
assert.equal(productionHttpsTarget(location("http://idesuss.net/app/?lang=hu#recovery")), "https://idesuss.net/app/?lang=hu#recovery");
assert.equal(productionHttpsTarget(location("https://www.idesuss.net/app/")), "https://idesuss.net/app/");
assert.equal(productionHttpsTarget(location("https://idesuss.net/app/")), null);
assert.equal(productionHttpsTarget(location("http://localhost:8080/app/")), null);
assert.equal(productionHttpsTarget(location("http://idesuss.net.attacker.example/app/")), null);
assert.equal(productionHttpsTarget(location("http://idesuss.net//attacker.example/path")), "https://idesuss.net//attacker.example/path");
let destination = null;
const insecure = { ...location("http://idesuss.net/"), replace: url => { destination = url; } };
assert.equal(ensureSecureProductionOrigin(insecure), false);
assert.equal(destination, "https://idesuss.net/");
assert.equal(ensureSecureProductionOrigin(location("https://idesuss.net/")), true);

const { getSharedSupabaseClient } = await import(new URL("../js/shared/supabase-client.js", import.meta.url));
const existingClient = {};
globalThis.window = { supabaseClient: existingClient };
globalThis.location = insecure;
await assert.rejects(getSharedSupabaseClient(), /secure HTTPS connection/);
globalThis.location = location("https://idesuss.net/");
assert.equal(await getSharedSupabaseClient(), existingClient);
delete globalThis.window;
delete globalThis.location;
console.log("Production HTTPS and auth guard checks passed");

