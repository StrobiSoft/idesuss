import { readFile } from "node:fs/promises";

const shell = await readFile(new URL("../js/menu/auth-shell.js", import.meta.url), "utf8");
const controller = await readFile(new URL("../js/menu/auth-controller.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

const requiredShell = [
  'body.idesuss-auth-open #menuToggle',
  'body.idesuss-auth-open #idesussMenu',
  'document.body.classList.add("idesuss-auth-open")',
  'document.body.classList.remove("idesuss-auth-open")',
  'email.readOnly = reset',
  'Fiók e-mail címe'
];

for (const marker of requiredShell) {
  if (!shell.includes(marker)) throw new Error(`Auth shell missing recovery marker: ${marker}`);
}

const requiredController = [
  'new URL("/?password-reset=1", window.location.origin).href',
  'event === "PASSWORD_RECOVERY"',
  'openPasswordReset(nextIdentity)',
  'isPasswordResetReturn()',
  'clearPasswordResetReturnMarker()'
];

for (const marker of requiredController) {
  if (!controller.includes(marker)) throw new Error(`Auth controller missing recovery marker: ${marker}`);
}

if (!index.includes("menu-core.js?v=20260921-auth3")) {
  throw new Error("Root page must load the new auth revision.");
}

console.log("Password recovery flow validation passed.");
