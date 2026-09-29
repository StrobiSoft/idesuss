import fs from "node:fs";

const html = fs.readFileSync("admin/index.html","utf8");
const js = fs.readFileSync("admin/admin.js","utf8");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(html.includes('id="userActivityCard"'), "admin activity card missing");
expect(html.includes('id="adminOnlineUsersList"'), "online activity list missing");
expect(html.includes('id="adminRecentLoginsList"'), "recent login list missing");
expect(js.includes('"list_online_users"') || js.includes("PRESENCE_POLICY.listRpc"), "online presence RPC not reused");
expect(js.includes('"admin_list_recent_logins"'), "recent login RPC missing");
expect(js.includes("p_limit: 10"), "recent login limit must stay at 10");

console.log("ADMIN_USER_ACTIVITY_OK");
