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

expect(!root.includes("legacy-home.css"), "homepage must not reference retired legacy-home.css");
expect(!root.includes("\\n"), "homepage must not contain literal escaped newline artifacts");

const homeCss = fs.readFileSync("home-consolidation.css","utf8");
expect(homeCss.includes(".viewer-shell,\n.info-panel"), "homepage overlay base selector missing");
expect(homeCss.includes("display:none!important"), "homepage overlays must be hidden by default");
expect(homeCss.includes(".viewer-shell.show,\n.info-panel.show"), "homepage overlay show selector missing");
expect(homeCss.includes("display:flex!important"), "homepage overlays must only display when explicitly shown");
expect(homeCss.includes("body.viewer-open"), "viewer-open scroll-lock guard missing");

const serviceWorker = fs.readFileSync("service-worker.js","utf8");
expect(!serviceWorker.includes("legacy-home.css"), "service worker must not cache retired legacy-home.css");
expect(!serviceWorker.includes("\\n"), "service worker must not contain literal escaped newline artifacts");


expect(root.includes("home-consolidation.css?v=20260927-package9"), "homepage must cache-bust mobile hotfix stylesheet");
expect(homeCss.includes("flex-direction:column!important"), "mobile dropdown must remain vertical");
expect(homeCss.includes(".menu-info-tooltip"), "idea tooltip guard missing");
expect(homeCss.includes("display:none!important"), "idea tooltip must remain hidden by default");
expect(serviceWorker.includes('const CACHE_NAME = "idesuss-root-v38";'), "service worker cache version must include mobile hotfix");
expect(serviceWorker.includes("home-consolidation.css?v=20260927-package9"), "service worker must cache the mobile hotfix stylesheet");

expect(homeCss.includes("Final mobile header/footer polish"), "active homepage stylesheet missing final mobile polish");
expect(homeCss.includes("justify-content:flex-end!important"), "mobile header actions must align compactly");
expect(homeCss.includes("border-color:transparent!important"), "mobile auth shell must not leave an empty visible box");
expect(homeCss.includes("color:var(--idesuss-text)!important"), "footer action text must keep dark-theme contrast");
expect(!serviceWorker.includes("visual-polish.css"), "service worker must not cache unused visual-polish.css");

expect(homeCss.includes("Signed-in header responsive state"), "signed-in header responsive guard missing");
expect(homeCss.includes(".auth-chip.is-signed-in"), "signed-in auth-chip selector missing");
expect(homeCss.includes("text-overflow:ellipsis"), "signed-in profile name must be truncatable");
expect(homeCss.includes(".idesuss-signed-in .header-actions"), "signed-in header action layout guard missing");

const authController = fs.readFileSync("js/menu/auth-controller.js","utf8");
expect(authController.includes('classList.toggle("idesuss-signed-in"'), "auth controller must expose signed-in body state");
expect(authController.includes('authSeparator.hidden = Boolean(identity)'), "signed-in auth separator must be hidden");

const menuCore = fs.readFileSync("js/menu/menu-core.js","utf8");
expect(menuCore.includes("auth-controller.js?v=20260927-headerfix1"), "menu core must pin signed-in auth controller revision");
expect(root.includes("js/menu/menu-core.js?v=20260927-headerfix1"), "homepage must cache-bust signed-in menu controller");
expect(serviceWorker.includes("js/menu/menu-core.js?v=20260927-headerfix1"), "service worker must cache signed-in menu controller");

expect(root.includes('id="headerMessagesBtn"'), "homepage header Messages button missing");
expect(!root.includes('id="moderationInboxBtn" class="moderation-inbox-btn"'), "moderation inbox must not occupy the public header");
expect(homeCss.includes("Header messages, language contrast and unified action cluster"), "header contrast cluster guard missing");
expect(homeCss.includes(".header-messages-btn"), "header Messages styling missing");
expect(homeCss.includes("background:#f2eee5!important"), "language selector contrast guard missing");
expect(homeCss.includes(".hero-banner-link"), "Android details contrast guard missing");
expect(authController.includes('headerMessagesBtn?.addEventListener("click"'), "header Messages click binding missing");
expect(authController.includes('window.location.href = "/messages/"'), "header Messages must route to Messages");

expect(!root.includes('class="platform-nav"'), "duplicated homepage platform nav must stay removed");
expect(!root.includes('id="footerOpenAppLink"'), "duplicated footer Webapp action must stay removed");
expect(homeCss.includes("Release header simplification: brand + compact actions only"), "simplified homepage header guard missing");
expect(homeCss.includes(".profile-action-grid"), "profile action grid guard missing");
expect(serviceWorker.includes("/secondary-page-shell.css?v=20260927-secondary2"), "service worker must cache simplified secondary shell");

const messagesHtml = fs.readFileSync("messages/index.html","utf8");
const messagesJs = fs.readFileSync("messages/messages.js","utf8");
expect(messagesHtml.includes('id="recipientSearchInput"'), "Messages recipient search input missing");
expect(messagesHtml.includes('id="recipientSearchBtn"'), "Messages recipient search action missing");
expect(!messagesHtml.includes('id="messagesLanguageSelect"'), "Messages must not expose a duplicate language selector");
expect(!messagesHtml.includes('href="/app/"'), "Messages header must not duplicate Webapp navigation");
expect(!messagesHtml.includes('href="/radio/?autoplay=1"'), "Messages header must not duplicate Radio navigation");
expect(messagesJs.includes('search_social_users'), "Messages recipient search RPC missing");
expect(messagesJs.includes('focusComposer:true'), "Messages recipient selection must focus composer");








const visionCss = fs.readFileSync("vision-theme.css","utf8");
expect(root.includes("vision-theme.css?v=20260927-vision1"), "homepage must load the concept-driven vision theme");
expect(serviceWorker.includes("/vision-theme.css?v=20260927-vision1"), "service worker must cache the vision theme");
expect(visionCss.includes("Idesüss Vision UI Theme"), "vision theme identity marker missing");
expect(visionCss.includes("Portrait mobile: auth must remain available"), "portrait auth visibility guard missing");
expect(visionCss.includes('body:not(.idesuss-signed-in) .auth-chip #loginBtn'), "portrait login visibility selector missing");
expect(visionCss.includes('body:not(.idesuss-signed-in) .auth-chip #registerBtn'), "portrait registration visibility selector missing");
expect(!root.includes('class="platform-nav"'), "duplicated homepage platform nav must remain removed");

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
