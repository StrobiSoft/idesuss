import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../friends/index.html", import.meta.url), "utf8");

const required = [
  'client.rpc("list_my_friendships")',
  'client.rpc("find_idesuss_user_by_nickname"',
  'client.rpc("request_friendship"',
  'client.rpc("accept_friendship"',
  'client.rpc("remove_friendship"',
  'client.rpc("send_direct_message"',
  'client.rpc("mark_direct_messages_read"',
  '.from("direct_messages")',
  'A telefonod névjegyzékét nem töltjük fel.'
];

for (const marker of required) {
  if (!html.includes(marker)) {
    throw new Error(`Friends page missing required marker: ${marker}`);
  }
}

const forbidden = [
  '.from("profiles")',
  'service_role',
  'raw_contacts',
  'contact_graph'
];

for (const marker of forbidden) {
  if (html.includes(marker)) {
    throw new Error(`Friends page contains forbidden direct-access marker: ${marker}`);
  }
}

if (!html.includes('maxlength="4000"')) {
  throw new Error("DM UI must preserve the 4000-character server limit");
}

console.log("Friends/DM first-slice validation passed.");
