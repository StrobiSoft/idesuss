import assert from "node:assert/strict";
import fs from "node:fs";

const edge = fs.readFileSync("supabase/functions/messaging-push-dispatch/index.ts", "utf8");
const sql = fs.readFileSync("supabase/messaging-push-dispatch.sql", "utf8");

for (const marker of [
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "PUSH_DISPATCH_SECRET",
  "claim_push_notification_jobs",
  "finish_push_notification_job",
  "messages_conversation",
  "message_id",
  "sender_id",
  "message_type",
  "device_push_tokens",
]) {
  assert.ok(edge.includes(marker), "dispatcher missing marker: " + marker);
}

assert.ok(edge.includes("google-auth-library"), "FCM OAuth helper missing");
assert.ok(edge.includes("firebase.messaging"), "FCM scope missing");
assert.ok(!edge.includes("service-account.json"), "service-account file must not be committed");
assert.ok(!edge.includes("private_key_id"), "Firebase credentials must not be embedded");

for (const marker of [
  "security definer",
  "SERVICE_ROLE_REQUIRED",
  "revoke all on function public.claim_push_notification_jobs",
  "grant execute on function public.claim_push_notification_jobs(integer)",
  "revoke all on function public.finish_push_notification_job",
  "grant execute on function public.finish_push_notification_job",
  "for update skip locked",
  "auth.role()",
  "interval \'5 minutes\'",
]) {
  assert.ok(sql.toLowerCase().includes(marker.toLowerCase()), "dispatch SQL missing guard: " + marker);
}

console.log("MESSAGING_PUSH_DISPATCH_OK");
