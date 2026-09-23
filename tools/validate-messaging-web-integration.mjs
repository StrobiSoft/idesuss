import fs from "node:fs";

const html = fs.readFileSync("messages/index.html","utf8");
const js = fs.readFileSync("messages/messages.js","utf8");
const lang = fs.readFileSync("messages/messages-language.js","utf8");
const auth = fs.readFileSync("js/menu/auth-controller.js","utf8");
const sharedClient = fs.readFileSync("js/shared/supabase-client.js","utf8");

function assert(condition,message){ if(!condition) throw new Error(message); }

assert(!js.includes("createClient("),"messages must not create its own Supabase client");
assert(js.includes('getSharedSupabaseClient'),"messages must use shared Supabase client");
assert(js.includes('subscribeAuthState'),"messages must use shared auth state");
assert(js.includes('openAuthModal'),"messages must expose shared auth modal");
assert(js.includes('get_push_preferences') && js.includes('set_push_preferences'),"notification preferences must be wired");
assert(js.includes('sendLocked') && js.includes('lastFailedBody'),"send de-duplication/retry state missing");
assert(js.includes('mobile-conversation'),"mobile conversation navigation missing");
assert(js.includes('postgres_changes'),"messages realtime subscription missing");
assert(auth.includes('idesuss-social-summary-') && auth.includes('postgres_changes'),"root unread badge must use realtime");
assert(auth.includes('60000'),"root unread badge fallback poll must be reduced to fallback cadence");

for (const id of [
  "messagesLanguageSelect","messagesLoginBtn","messagesRegisterBtn","conversationBackBtn",
  "sendStatus","pushEnabled","previewEnabled","saveNotificationSettingsBtn"
]) {
  assert(html.includes(`id="${id}"`),`missing messaging UI element: ${id}`);
}

for (const code of ["hu","en","nl","ro","pl","hr","be"]) {
  assert(new RegExp(`\\b${code}:\\s*\\{`).test(lang),`missing messaging locale: ${code}`);
}
assert(lang.includes('subscribeIdesussLanguage'),"messaging language must subscribe to global language");
assert(lang.includes('setIdesussLanguage'),"messaging language selector must update global language");

assert(sharedClient.includes('window.supabaseClient'),"shared Supabase client must reuse global client");
assert(sharedClient.includes('@supabase/supabase-js@2'),"shared Supabase loader must provide library fallback");

console.log("Messaging web integration validation: OK");
