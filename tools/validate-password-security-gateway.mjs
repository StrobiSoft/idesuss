import fs from "node:fs";

const authService = fs.readFileSync("js/shared/auth-service.js","utf8");
const controller = fs.readFileSync("js/menu/auth-controller.js","utf8");
const messages = fs.readFileSync("messages/messages.js","utf8");
const passwordClient = fs.readFileSync("js/shared/password-security-service.js","utf8");
const gateway = fs.readFileSync("server/password-security/server.js","utf8");
const spyTrap = fs.readFileSync("server/security/spy-trap.js","utf8");

function assert(condition,message){ if(!condition) throw new Error(message); }

assert(authService.includes('PASSWORD_SECURITY_ENFORCEMENT = "pending-vm101"'),
  "password security rollout must remain explicitly pending until VM101 is live");
assert(authService.includes('await checkPasswordSecurity(password)'),
  "rollout gate must call password security when enforcement is enabled");
assert((authService.match(/await enforcePasswordSecurity\(password\)/g) || []).length >= 2,
  "both sign-up and password update must pass through the rollout gate");
assert(!controller.includes('client.auth.signUp') && !messages.includes('client.auth.signUp'),
  "active web auth surfaces must not bypass shared auth service");
assert(passwordClient.includes('https://security.idesuss.net/v1/security/password/check'),
  "web password client must use the dedicated production gateway origin");
assert(passwordClient.includes('https://api.pwnedpasswords.com/range/'),
  "web password client must retain a k-anonymous HIBP resilience path until VM101 public routing is live");
assert(passwordClient.includes('crypto.subtle.digest') && passwordClient.includes('slice(0, 5)'),
  "browser resilience path must hash locally and send only the five-character prefix");
assert(passwordClient.includes('allowBrowserFallback'),
  "browser fallback must remain explicit and controllable");
assert(gateway.includes('createHash("sha1")'),"gateway must hash candidate locally");
assert(gateway.includes('digest.slice(0, 5)') && gateway.includes('digest.slice(5)'),
  "gateway must use HIBP k-anonymity prefix/suffix split");
assert(gateway.includes('"Add-Padding": "true"'),"HIBP range requests must request padding");
assert(gateway.includes('password_security_unavailable'),"upstream failure must fail closed");
assert(gateway.includes('["password","newPassword","repeatPassword","body","hash","sha1","suffix"]'),
  "sensitive log-field denylist missing");
assert(!gateway.includes('console.log(password') && !gateway.includes('console.warn(password'),
  "gateway must never log plaintext passwords");
assert(spyTrap.includes('event: "spy_trap"'),"shared Spy Trap security event missing");
assert(spyTrap.includes('requestSize') && !spyTrap.includes('requestBody'),"Spy Trap must stay metadata-only");

console.log("Password security gateway integration: OK");
