import fs from "node:fs";

function fail(message) {
  console.error("SECONDARY_SHELL_FAIL:", message);
  process.exitCode = 1;
}
function expect(condition, message) {
  if (!condition) fail(message);
}

const pages = {
  "admin/index.html": "secondary-admin",
  "messages/index.html": "secondary-messages",
  "tools/index.html": "secondary-tools",
  "rules/index.html": "secondary-rules",
  "ideas/index.html": "secondary-ideas",
  "eula/index.html": "secondary-eula",
  "privacy/index.html": "secondary-privacy",
  "delete-account/index.html": "secondary-delete"
};

const criticalIds = {
  "admin/index.html": ["roleBadge","accessMessage","adminContent","adminUserSearch","ownerUserSearch"],
  "messages/index.html": ["messagesLanguageSelect","mainTabs","messagesPanel","threadList","messageList","messageInput","sendMessageBtn","friendsPanel"],
  "tools/index.html": ["calcA","calcOp","calcB","calcResult"],
  "rules/index.html": ["rulesLangSelect","rulesTitle","ruleHeading","rule2Heading","rulesVersion"],
  "ideas/index.html": ["ideasLangSelect","ideaForm","ideaTitle","ideaBody","submitBtn","myIdeas"],
  "eula/index.html": [],
  "privacy/index.html": [],
  "delete-account/index.html": []
};

const shellCss = fs.readFileSync("secondary-page-shell.css","utf8");
expect(shellCss.includes("--secondary-canvas"), "shared shell must expose secondary tokens");
expect(shellCss.includes(".secondary-messages"), "shared shell must cover messages");
expect(shellCss.includes(".secondary-admin"), "shared shell must cover admin");
expect(shellCss.includes(".secondary-tools"), "shared shell must cover tools");
expect(shellCss.includes(".secondary-legal"), "shared shell must cover legal pages");

for (const [file, pageClass] of Object.entries(pages)) {
  const html = fs.readFileSync(file, "utf8");
  expect(html.includes('/design-system.css'), file + " must load design-system.css");
  expect(html.includes('/secondary-page-shell.css'), file + " must load secondary-page-shell.css");
  const bodyMatch = html.match(/<body[^>]*class=["']([^"']+)["']/i);
  const bodyClasses = new Set((bodyMatch?.[1] || "").split(/\s+/).filter(Boolean));
  expect(bodyClasses.has("secondary-page"), file + " must opt into shared secondary-page class");
  expect(bodyClasses.has(pageClass), file + " must opt into " + pageClass);
  for (const id of criticalIds[file]) {
    expect(html.includes('id="' + id + '"') || html.includes("id='" + id + "'"), file + " missing critical id #" + id);
  }

  const refs = [...html.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(m => m[1]);
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]));
  for (const id of new Set(refs)) {
    expect(ids.has(id), file + " inline runtime references missing DOM id #" + id);
  }
}

const navigationCoverage = [
  ["admin/index.html", ["/","/app/","/radio/"]],
  ["messages/index.html", ["/","/app/","/radio/"]],
  ["tools/index.html", ["/"]],
  ["rules/index.html", ["/"]],
  ["ideas/index.html", ["/"]],
  ["eula/index.html", ["/"]],
  ["privacy/index.html", ["/eula/"]],
  ["delete-account/index.html", ["/","/privacy/"]]
];
for (const [file, routes] of navigationCoverage) {
  const html = fs.readFileSync(file, "utf8");
  for (const route of routes) {
    expect(html.includes('href="' + route), file + " missing expected route " + route);
  }
}

if (!process.exitCode) console.log("SECONDARY_PAGE_SHELL_OK");
