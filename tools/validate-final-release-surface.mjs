import fs from "node:fs";

function fail(message) {
  console.error("FINAL_RELEASE_SURFACE_FAIL:", message);
  process.exitCode = 1;
}
function expect(condition, message) {
  if (!condition) fail(message);
}

const pages = {
  "index.html": ["design-system.css","home-consolidation.css"],
  "app/index.html": ["design-system.css","app-release.css"],
  "radio/index.html": ["design-system.css","radio-release.css"],
  "ferry/index.html": ["board-shell.css"],
  "rola/index.html": ["board-shell.css"],
  "admin/index.html": ["design-system.css","secondary-page-shell.css"],
  "messages/index.html": ["design-system.css","secondary-page-shell.css"],
  "tools/index.html": ["design-system.css","secondary-page-shell.css"],
  "rules/index.html": ["design-system.css","secondary-page-shell.css"],
  "ideas/index.html": ["design-system.css","secondary-page-shell.css"],
  "eula/index.html": ["design-system.css","secondary-page-shell.css"],
  "privacy/index.html": ["design-system.css","secondary-page-shell.css"],
  "delete-account/index.html": ["design-system.css","secondary-page-shell.css"]
};

for (const [file, markers] of Object.entries(pages)) {
  expect(fs.existsSync(file), file + " must exist");
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file,"utf8");
  for (const marker of markers) {
    expect(html.includes(marker), file + " missing release marker " + marker);
  }
}

for (const obsolete of [
  "legacy-home.css",
  "test/index.html",
  "test/index_testkész.html",
  "test/consent_test",
  "test/js/app.js",
  "test/js/auth.js",
  "test/js/lang.js",
  "test/js/menu.js",
  "test/js/posts.js",
  "test/js/profile.js",
  "test/js/ui.js"
]) {
  expect(!fs.existsSync(obsolete), "obsolete release artifact still exists: " + obsolete);
}

const root = fs.readFileSync("index.html","utf8");
const homepageRoutes = [
  ["/app/", root.includes("/app/") || root.includes("https://idesuss.net/app")],
  ["/radio/", root.includes("/radio/")],
  ["/ferry/", root.includes("/ferry/")],
  ["/rola/", root.includes("/rola/")],
  ["/tools/", root.includes("/tools/")]
];
for (const [route, present] of homepageRoutes) {
  expect(present, "homepage release navigation missing route " + route);
}

const webapp = fs.readFileSync("app/index.html","utf8");
for (const route of ["/","/ferry/","/rola/","/radio/","/app/","/tools/"]) {
  expect(webapp.includes('href="' + route), "Webapp navigation missing route " + route);
}

expect(fs.existsSync("tools/validate-release-webapp-shell.mjs"), "Webapp release validator missing");
expect(fs.existsSync("tools/validate-secondary-page-shell.mjs"), "secondary page validator missing");

if (!process.exitCode) {
  console.log("FINAL_RELEASE_SURFACE_OK");
}
