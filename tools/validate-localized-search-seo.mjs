import fs from "node:fs";

const languages = ["hu","en","nl","ro","pl","hr","be"];
const base = "https://idesuss.net";

function fail(message) {
  console.error("LOCALIZED_SEARCH_SEO_FAIL:", message);
  process.exitCode = 1;
}
function expect(condition, message) {
  if (!condition) fail(message);
}

function verifyAlternates(html, source) {
  for (const language of languages) {
    expect(
      html.includes(`hreflang="${language}" href="${base}/${language}/"`),
      `${source} missing hreflang ${language}`
    );
  }
  expect(
    html.includes(`hreflang="x-default" href="${base}/"`),
    `${source} missing x-default hreflang`
  );
}

const root = fs.readFileSync("index.html","utf8");
expect(root.includes('<html lang="en">'), "root x-default page must use a stable default language");
expect(root.includes('<link rel="canonical" href="https://idesuss.net/"'), "root canonical missing");
verifyAlternates(root, "root");
expect(root.includes("<title>Idesüss™ — Driver Platform</title>"), "root title must be language-neutral/default English");

for (const language of languages) {
  const path = `${language}/index.html`;
  expect(fs.existsSync(path), `${path} missing`);
  if (!fs.existsSync(path)) continue;
  const html = fs.readFileSync(path,"utf8");
  expect(html.includes(`<html lang="${language}">`), `${path} has wrong html lang`);
  expect(html.includes(`<link rel="canonical" href="${base}/${language}/"`), `${path} canonical missing`);
  expect(/<title>[^<]+<\/title>/.test(html), `${path} title missing`);
  expect(/name="description"[\s\S]*?content="[^"]+"/.test(html), `${path} description missing`);
  verifyAlternates(html, path);
}

const sitemap = fs.readFileSync("sitemap.xml","utf8");
for (const language of languages) {
  expect(sitemap.includes(`<loc>${base}/${language}/</loc>`), `sitemap missing ${language} locale`);
  expect(sitemap.includes(`hreflang="${language}" href="${base}/${language}/"`), `sitemap missing ${language} alternate`);
}
expect(sitemap.includes(`<loc>${base}/</loc>`), "sitemap missing x-default root URL");

const robots = fs.readFileSync("robots.txt","utf8");
expect(robots.includes("User-agent: *"), "robots user-agent missing");
expect(robots.includes("Allow: /"), "robots allow rule missing");
expect(robots.includes("Sitemap: https://idesuss.net/sitemap.xml"), "robots sitemap declaration missing");

const languageRuntime = fs.readFileSync("js/lang/home-language.js","utf8");
expect(languageRuntime.includes("function getPathLanguage()"), "locale path detection missing");
expect(languageRuntime.includes("getPathLanguage() || getIdesussLanguage()"), "locale path must override stored language");
expect(languageRuntime.includes("syncLocalePath(safeLanguage)"), "language changes must keep URL locale in sync");

if (!process.exitCode) console.log("LOCALIZED_SEARCH_SEO_OK");
