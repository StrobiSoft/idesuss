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
const homeUxPolish = fs.readFileSync("home-ux-polish.css","utf8");
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
expect(serviceWorker.includes('const CACHE_NAME = "idesuss-root-v47";'), "service worker cache version must include mobile hotfix");
expect(serviceWorker.includes("home-consolidation.css?v=20260927-package9"), "service worker must cache the mobile hotfix stylesheet");
expect(root.includes("home-ux-polish.css?v=20260929-ux3"), "homepage must load UX polish stylesheet");
expect(serviceWorker.includes("/home-ux-polish.css?v=20260929-ux3"), "service worker must cache UX polish stylesheet");
expect(homeUxPolish.includes("Profile is a true modal shell"), "profile modal UX polish guard missing");
expect(homeUxPolish.includes("body.profile-panel-open"), "profile background scroll lock styling missing");
expect(homeUxPolish.includes("Daily info should read as one composed section"), "dashboard composition polish missing");
expect(homeUxPolish.includes("Footer actions must look interactive"), "footer interaction contrast polish missing");
expect(homeUxPolish.includes("Header language selector: same dark control family as auth/user actions."), "dark header language selector polish missing");
expect(homeUxPolish.includes("color-scheme:dark"), "language selector must opt into dark native control rendering");
expect(homeUxPolish.includes("[hidden]{"), "global hidden-state release guard missing");
expect(homeUxPolish.includes("-webkit-text-fill-color:#f6f0e6!important"), "iOS control text contrast guard missing");

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
expect(authController.includes('!["admin", "owner"].includes(profileRole)'), "Admin menu must be hidden for non-admin/non-owner roles");

const menuCore = fs.readFileSync("js/menu/menu-core.js","utf8");
const profileModule = fs.readFileSync("js/menu/profile.js","utf8");
expect(menuCore.includes("auth-controller.js?v=20260929-adminmenu1"), "menu core must pin signed-in auth controller revision");
expect(root.includes("js/menu/menu-core.js?v=20260929-adminmenu1"), "homepage must cache-bust signed-in menu controller");
expect(serviceWorker.includes("js/menu/menu-core.js?v=20260929-adminmenu1"), "service worker must cache signed-in menu controller");
expect(menuCore.includes("profile.js?v=20260929-modal1"), "menu core must cache-bust profile modal revision");
expect(profileModule.includes('classList.add("profile-panel-open")'), "profile open must lock background scroll");
expect(profileModule.includes('classList.remove("profile-panel-open")'), "profile close must restore background scroll");

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
expect(root.includes("vision-theme.css?v=20260928-vision3"), "homepage must load the concept-driven vision theme");
expect(serviceWorker.includes("/vision-theme.css?v=20260928-vision3"), "service worker must cache the vision theme");
expect(visionCss.includes("Idesüss Vision UI Theme"), "vision theme identity marker missing");
expect(visionCss.includes("Portrait mobile: auth must remain available"), "portrait auth visibility guard missing");
expect(visionCss.includes('body:not(.idesuss-signed-in) .auth-chip #loginBtn'), "portrait login visibility selector missing");
expect(visionCss.includes('body:not(.idesuss-signed-in) .auth-chip #registerBtn'), "portrait registration visibility selector missing");
expect(!root.includes('class="platform-nav"'), "duplicated homepage platform nav must remain removed");


const visionSubpages = fs.readFileSync("vision-subpages.css","utf8");
for (const page of ["ferry/index.html","rola/index.html","radio/index.html","tools/index.html"]) {
  const html = fs.readFileSync(page,"utf8");
  expect(html.includes("/vision-subpages.css?v=20260929-vision2"), page + " missing Vision subpage theme");
}
const radioHtml = fs.readFileSync("radio/index.html","utf8");
expect(!radioHtml.includes('class="radio-nav"'), "radio must not duplicate platform navigation");
expect(!radioHtml.includes('id="radioLangSelect"'), "radio must not expose duplicate language selector");
expect(!radioHtml.includes('href="../app/"'), "radio header must not expose duplicate Webapp action");
expect(radioHtml.includes('href="../">← Főoldal</a>'), "radio must provide a direct Home action");
expect(visionSubpages.includes("Idesüss Vision Subpages"), "Vision subpage theme marker missing");
expect(serviceWorker.includes('const CACHE_NAME = "idesuss-root-v47";'), "service worker cache must include Vision subpages");
expect(serviceWorker.includes("/vision-subpages.css?v=20260929-vision2"), "service worker must cache Vision subpage theme");


expect(root.includes('id="footerLangSelect"'), "footer language selector missing");
expect(root.includes('data-i18n="vision.heroTitle"'), "Vision hero must be translated");
expect(root.includes('data-i18n="vision.overviewTitle"'), "Vision overview must be translated");
expect(root.includes('/js/home-runtime.js?v=20260928-visioni18n1'), "homepage must cache-bust Vision language runtime");
expect(serviceWorker.includes('/js/home-runtime.js?v=20260928-visioni18n1'), "service worker must cache Vision language runtime");
expect(serviceWorker.includes('/js/lang/home-language.js?v=20260928-visioni18n1'), "service worker must cache Vision language loader");
expect(serviceWorker.includes('const CACHE_NAME = "idesuss-root-v47";'), "service worker cache must include Vision i18n release");

const homeLanguage = fs.readFileSync("js/lang/home-language.js","utf8");
expect(homeLanguage.includes('data-idesuss-language-select'), "home language selectors must share one state");
expect(homeLanguage.includes('20260928-visioni18n1'), "Vision language asset revision missing");

for (const language of ["hu","en","nl","ro","pl","hr","be"]) {
  const langFile = fs.readFileSync("js/lang/modules/Home/lang/" + language + ".js","utf8");
  expect(langFile.includes('"vision": {'), language + " Vision translations missing");
  expect(langFile.includes('"heroTitle"'), language + " Vision hero translation missing");
  expect(langFile.includes('"footerPrivacy"'), language + " Vision footer translation missing");
}

const badges = fs.readFileSync("js/shared/user-badges.js","utf8");
expect(badges.includes('role === "owner") badges.push({ icon: "🛡️"'), "owner badge must use shield");
expect(badges.includes('isVip) badges.push({ icon: "👑"'), "VIP badge must use crown");

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


expect(root.includes('class="vision-primary-nav"'), "Vision desktop primary navigation missing");
expect(visionCss.includes("VISION REFERENCE FIDELITY"), "Vision reference fidelity layer missing");
expect(visionCss.includes(".vision-primary-nav"), "Vision primary navigation styling missing");


// Vision UI Package 2 guards

expect(visionCss.includes("VISION UI PACKAGE 2 — Content & Component Unification"), "Vision package 2 marker missing");
expect(visionCss.includes("--vision-card-radius"), "Vision shared card token missing");
expect(visionCss.includes(".dashboard-info-primary .fx-item"), "Vision FX component unification missing");
expect(visionCss.includes(".footer-stats > span"), "Vision footer stats treatment missing");


// Vision UI Package 3 guards
expect(visionSubpages.includes("VISION UI PACKAGE 3 — Secondary Pages Refinement"), "Vision package 3 marker missing");
expect(visionSubpages.includes(".board-route-card:hover"), "Vision board card refinement missing");
expect(visionSubpages.includes(".radio-console"), "Vision radio console refinement missing");
expect(visionSubpages.includes(".tool-card:hover"), "Vision tools refinement missing");
