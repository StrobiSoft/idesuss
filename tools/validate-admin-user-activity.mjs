import fs from "node:fs";

const html = fs.readFileSync("activity/index.html","utf8");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(html.includes("Felhasználói aktivitás"), "activity title missing");
expect(html.includes('id="activityContent"'), "activity content container missing");
expect(html.includes('id="onlineList"'), "online list missing");
expect(html.includes('id="recentList"'), "recent login list missing");
expect(html.includes("10 legutóbbi bejelentkezés"), "recent login heading missing");
expect(html.includes('href="/admin/"'), "admin navigation missing");

console.log("ADMIN_USER_ACTIVITY_SHELL_OK");
