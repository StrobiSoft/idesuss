import { getSharedSupabaseClient } from "../js/shared/supabase-client.js";
import {
  currentIdentity,
  signIn,
  signUp,
  requestPasswordReset,
  subscribeAuthState
} from "../js/shared/auth-service.js";
import { ensureAuthModal, openAuthModal, closeAuthModal } from "../js/menu/auth-shell.js";
import { initMessagesLanguage, t, getMessagesLanguage } from "./messages-language.js";
import { formatUserDisplayName, loadUserBadgeMap } from "../js/shared/user-badges.js";

const $ = (s) => document.querySelector(s);
let client = null;
let me = null;
let currentOther = null;
let currentThread = null;
let dmChannel = null;
let friendChannel = null;
let unsubscribeAuth = null;
let sendLocked = false;
let lastFailedBody = "";
let friendshipByUser = new Map();
let userBadgeMap = new Map();

async function refreshBadgeMap(userIds) {
  try {
    userBadgeMap = await loadUserBadgeMap(client, userIds);
  } catch (error) {
    console.error("User badge load failed", error);
    userBadgeMap = new Map();
  }
}

function displayName(userId, name) {
  return formatUserDisplayName(name || t("user"), userBadgeMap.get(userId));
}

function setText(el, value) { if (el) el.textContent = value ?? ""; }
function fmtDate(value) {
  if (!value) return "";
  const locale = ({hu:"hu-HU",en:"en-GB",nl:"nl-NL",ro:"ro-RO",pl:"pl-PL",hr:"hr-HR",be:"be-BY"})[getMessagesLanguage()] || "en-GB";
  return new Intl.DateTimeFormat(locale,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function roleLabel(role) {
  return ({owner:t("roleOwner"),admin:t("roleAdmin"),moderator:t("roleModerator"),user:t("user")})[role] || role || t("user");
}
function friendshipStatusLabel(f) {
  if (f.status === "accepted") return t("friend");
  if (f.status === "pending" && f.direction === "incoming") return t("incomingRequest");
  if (f.status === "pending") return t("outgoingRequest");
  if (f.status === "later" && f.direction === "incoming") return t("laterIncoming");
  if (f.status === "later") return t("laterOutgoing");
  if (f.status === "declined") return t("declined");
  return f.status || "";
}

function showTab(which) {
  const messages = which === "messages";
  $("#messagesPanel").hidden = !messages;
  $("#friendsPanel").hidden = messages;
  $("#messagesTab").classList.toggle("active", messages);
  $("#friendsTab").classList.toggle("active", !messages);
  if (!messages && me) Promise.all([loadFriendships(),loadNotificationSettings()]);
}
$("#messagesTab").addEventListener("click", () => showTab("messages"));
$("#friendsTab").addEventListener("click", () => showTab("friends"));
$("#conversationBackBtn").addEventListener("click", () => $("#messagesPanel").classList.remove("mobile-conversation"));

async function loadThreads() {
  const list = $("#threadList");
  list.replaceChildren();
  const {data,error} = await client.rpc("list_message_threads");
  if (error) { setText(list,t("threadsLoadError")); return; }
  if (!(data||[]).length) { setText(list,t("noMessages")); return; }

  await refreshBadgeMap((data || []).map((thread) => thread.other_id));

  for (const thread of data) {
    const button = document.createElement("button");
    button.className = "thread" + (currentOther === thread.other_id ? " active" : "");
    button.type = "button";

    const top = document.createElement("div");
    top.className = "thread-top";
    const name = document.createElement("span");
    name.className = "thread-name";
    name.textContent = (thread.other_avatar_emoji || "🙂") + " " + displayName(thread.other_id, thread.other_nickname);
    top.append(name);

    if (Number(thread.unread_count) > 0) {
      const unread = document.createElement("span");
      unread.className = "unread";
      unread.textContent = Number(thread.unread_count) > 99 ? "99+" : String(thread.unread_count);
      top.append(unread);
    }

    const preview = document.createElement("div");
    preview.className = "muted thread-preview";
    preview.textContent = thread.last_message_type === "friend_request" ? t("friendRequest") : (thread.last_message_body || "");
    const date = document.createElement("div");
    date.className = "message-meta";
    date.textContent = fmtDate(thread.last_message_at);
    button.append(top,preview,date);
    button.addEventListener("click", () => openConversation(thread));
    list.append(button);
  }
}

function setComposerReplyability(replyable) {
  const wrap = $("#composerWrap");
  const input = $("#messageInput");
  const send = $("#sendMessageBtn");
  if (wrap) wrap.hidden = !replyable;
  if (input) input.disabled = !replyable;
  if (send) send.disabled = !replyable;
  if (!replyable) setText($("#sendStatus"), t("systemNoReply"));
  else setText($("#sendStatus"), "");
}

function isReplyableThread(thread) {
  return thread?.last_message_type !== "system";
}

async function openConversation(thread) {
  currentOther = thread.other_id;
  currentThread = thread;
  if (!userBadgeMap.has(thread.other_id)) await refreshBadgeMap([thread.other_id]);
  setText($("#conversationHead"), (thread.other_avatar_emoji || "🙂") + " " + displayName(thread.other_id, thread.other_nickname));
  setComposerReplyability(isReplyableThread(thread));
  $("#messagesPanel").classList.add("mobile-conversation");
  await client.rpc("mark_direct_messages_read",{p_sender:currentOther});
  await Promise.all([loadConversation(),loadThreads()]);
}

function friendRequestStatus(status) {
  return ({pending:t("pending"),later:t("later"),accepted:t("accepted"),declined:t("declined")})[status] || status || "";
}

async function respondFriendship(id, decision) {
  const {error} = await client.rpc("respond_friendship",{p_friendship_id:id,p_decision:decision});
  if (error) { alert(t("responseSaveError") + ": " + error.message); return; }
  await Promise.all([loadConversation(),loadFriendships(),loadThreads()]);
}

async function loadConversation() {
  if (!currentOther) return;
  const list = $("#messageList");
  list.replaceChildren();
  const {data,error} = await client.rpc("list_direct_conversation",{p_other:currentOther,p_limit:200});
  if (error) { setText(list,t("conversationLoadError")); return; }

  for (const message of data || []) {
    const mine = message.sender_id === me.id;
    const bubble = document.createElement("div");
    const systemLike = message.message_type === "friend_request" || message.message_type === "system";
    bubble.className = "bubble " + (systemLike ? "system" : mine ? "mine" : "");

    if (message.message_type === "friend_request") {
      const title = document.createElement("strong");
      title.textContent = mine ? t("friendRequestSent") : t("friendRequestIncoming");
      const status = document.createElement("div");
      status.className = "message-meta";
      status.textContent = friendRequestStatus(message.friendship_status);
      bubble.append(title,status);

      if (!mine && ["pending","later"].includes(message.friendship_status)) {
        const actions = document.createElement("div");
        actions.className = "friend-actions";
        [[t("yes"),"accepted"],[t("no"),"declined"],[t("maybe"),"later"]].forEach(([label,value]) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = label;
          btn.addEventListener("click", () => respondFriendship(message.friendship_id,value));
          actions.append(btn);
        });
        bubble.append(actions);
      }
    } else {
      const body = document.createElement("div");
      body.textContent = message.body || "";
      const meta = document.createElement("div");
      meta.className = "message-meta";
      meta.textContent = fmtDate(message.created_at);
      bubble.append(body,meta);
    }
    list.append(bubble);
  }
  list.scrollTop = list.scrollHeight;
}

function renderSendFailure(raw) {
  const status = $("#sendStatus");
  status.classList.add("error");
  const message = raw.includes("ENTITLEMENT_REQUIRED:PREMIUM")
    ? t("premiumRequired")
    : raw.includes("FRIENDSHIP_REQUIRED")
      ? t("friendshipRequired")
      : t("sendError") + ": " + raw;
  status.replaceChildren(document.createTextNode(message + " "));
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "soft-btn";
  retry.textContent = t("retry");
  retry.addEventListener("click", () => sendMessage(lastFailedBody));
  status.append(retry);
}

async function sendMessage(forcedBody = null) {
  const input = $("#messageInput");
  const body = (forcedBody ?? input.value).trim();
  if (!currentOther || !body || sendLocked || !isReplyableThread(currentThread)) return;

  sendLocked = true;
  lastFailedBody = "";
  $("#sendMessageBtn").disabled = true;
  setText($("#sendMessageBtn"),t("sending"));
  $("#sendStatus").classList.remove("error");
  setText($("#sendStatus"),t("sending"));

  const {error} = await client.rpc("send_direct_message",{p_recipient:currentOther,p_body:body});
  sendLocked = false;
  $("#sendMessageBtn").disabled = false;
  setText($("#sendMessageBtn"),t("send"));

  if (error) {
    lastFailedBody = body;
    renderSendFailure(error.message || "");
    return;
  }

  input.value = "";
  setText($("#sendStatus"),t("delivered"));
  await Promise.all([loadConversation(),loadThreads()]);
}

$("#sendMessageBtn").addEventListener("click", () => sendMessage());
$("#messageInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

async function loadFriendships() {
  const list = $("#friendshipsList");
  list.replaceChildren();
  const {data,error} = await client.rpc("list_my_friendships");
  if (error) { setText(list,t("friendshipsLoadError")); return; }

  friendshipByUser = new Map((data||[]).map((f) => [f.other_id,f]));
  if (!(data||[]).length) { setText(list,t("noConnections")); return; }

  await refreshBadgeMap((data || []).map((f) => f.other_id));

  for (const f of data) {
    const row = document.createElement("div");
    row.className = "person";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = (f.other_avatar_emoji || "🙂") + " " + displayName(f.other_id, f.other_nickname);
    const badge = document.createElement("div");
    badge.className = "status-badge";
    badge.textContent = friendshipStatusLabel(f);
    info.append(title,badge);

    const actions = document.createElement("div");
    actions.className = "friend-actions";

    if (["pending","later"].includes(f.status) && f.direction === "incoming") {
      [[t("yes"),"accepted"],[t("no"),"declined"],[t("maybe"),"later"]].forEach(([label,value]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", () => respondFriendship(f.friendship_id,value));
        actions.append(btn);
      });
    }

    if (f.status === "accepted") {
      const msg = document.createElement("button");
      msg.type = "button";
      msg.textContent = t("message");
      msg.addEventListener("click", async () => {
        showTab("messages");
        await openConversation({other_id:f.other_id,other_nickname:f.other_nickname,other_avatar_emoji:f.other_avatar_emoji});
      });
      actions.append(msg);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = f.status === "accepted" ? t("removeFriendship") : t("removeRequest");
    remove.addEventListener("click", async () => {
      if (!confirm(t("removeConfirm"))) return;
      const {error:rmError} = await client.rpc("remove_friendship",{p_friendship_id:f.friendship_id});
      if (rmError) alert(rmError.message);
      else await Promise.all([loadFriendships(),loadThreads()]);
    });
    actions.append(remove);
    row.append(info,actions);
    list.append(row);
  }
}

async function searchFriends() {
  const q = $("#friendSearchInput").value.trim();
  const status = $("#friendSearchStatus");
  const results = $("#friendSearchResults");
  results.replaceChildren();
  if (q.length < 2) { setText(status,t("minSearch")); return; }

  setText(status,t("searching"));
  const {data,error} = await client.rpc("search_social_users",{p_query:q,p_limit:20});
  if (error) { setText(status,t("searchError")); return; }

  setText(status,(data||[]).length ? t("resultCount",(data||[]).length) : t("noResults"));
  await refreshBadgeMap((data || []).map((user) => user.id));
  for (const user of data || []) {
    const row = document.createElement("div");
    row.className = "person";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = (user.avatar_emoji || "🙂") + " " + displayName(user.id, user.nickname);
    const role = document.createElement("div");
    role.className = "muted";
    role.textContent = roleLabel(user.role);
    info.append(title,role);

    const existing = friendshipByUser.get(user.id);
    if (existing) {
      const badge = document.createElement("span");
      badge.className = "status-badge";
      badge.textContent = friendshipStatusLabel(existing);
      row.append(info,badge);
    } else {
      const btn = document.createElement("button");
      btn.className = "action";
      btn.type = "button";
      btn.textContent = t("addFriend");
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const {error:reqError} = await client.rpc("request_friendship",{p_addressee:user.id});
        if (reqError) {
          const raw = reqError.message || "";
          setText(status,raw.includes("FRIENDSHIP_ALREADY_EXISTS") ? t("alreadyConnected") : t("requestSendError") + ": " + raw);
        } else {
          setText(status,t("requestSent"));
          await Promise.all([loadFriendships(),loadThreads()]);
          await searchFriends();
        }
        btn.disabled = false;
      });
      row.append(info,btn);
    }
    results.append(row);
  }
}
$("#friendSearchBtn").addEventListener("click",searchFriends);
$("#friendSearchInput").addEventListener("keydown",(event) => { if (event.key === "Enter") searchFriends(); });

async function loadNotificationSettings() {
  const {data,error} = await client.rpc("get_push_preferences");
  if (error) { setText($("#notificationSettingsStatus"),t("settingsError")); return; }
  $("#pushEnabled").checked = data?.direct_messages_enabled !== false;
  $("#previewEnabled").checked = data?.message_preview_enabled !== false;
  $("#previewEnabled").disabled = !$("#pushEnabled").checked;
}
$("#pushEnabled").addEventListener("change",() => {
  $("#previewEnabled").disabled = !$("#pushEnabled").checked;
});
$("#saveNotificationSettingsBtn").addEventListener("click",async () => {
  const btn = $("#saveNotificationSettingsBtn");
  btn.disabled = true;
  const {error} = await client.rpc("set_push_preferences",{
    p_direct_messages_enabled:$("#pushEnabled").checked,
    p_message_preview_enabled:$("#previewEnabled").checked
  });
  btn.disabled = false;
  setText($("#notificationSettingsStatus"),error ? t("settingsError") : t("settingsSaved"));
});

function cleanupRealtime() {
  if (dmChannel) client.removeChannel(dmChannel);
  if (friendChannel) client.removeChannel(friendChannel);
  dmChannel = null;
  friendChannel = null;
}

function subscribeRealtime() {
  cleanupRealtime();
  if (!me) return;

  dmChannel = client.channel(`idesuss-dm-live-${me.id}`)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`recipient_id=eq.${me.id}`},async (payload) => {
      await loadThreads();
      if (currentOther) {
        if (payload?.new?.sender_id === currentOther && payload?.new?.message_type === "system") {
          currentThread = {...(currentThread || {}), last_message_type:"system"};
          setComposerReplyability(false);
        }
        await client.rpc("mark_direct_messages_read",{p_sender:currentOther});
        await loadConversation();
        await loadThreads();
      }
    })
    .subscribe();

  friendChannel = client.channel(`idesuss-friend-live-${me.id}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"friendships"},async () => {
      await loadFriendships();
      await loadThreads();
      if (currentOther) await loadConversation();
    })
    .subscribe();
}

function setAuthUi(identity) {
  const signedIn = Boolean(identity);
  $("#authRequired").hidden = signedIn;
  $("#messagesPanel").hidden = !signedIn || !$("#friendsPanel").hidden;
  $("#mainTabs").hidden = !signedIn;
  if (!signedIn) $("#friendsPanel").hidden = true;
}

function bindAuthModal() {
  ensureAuthModal();
  const submit = $("#authSubmitBtn");
  const forgot = $("#authForgotPassword");
  const modeSwitch = $("#authModeSwitch");

  submit?.addEventListener("click",async () => {
    const modal = $("#idesussAuthModal");
    const mode = modal?.dataset.mode || "login";
    const email = $("#authEmail")?.value.trim() || "";
    const password = $("#authPassword")?.value || "";
    const repeat = $("#authPasswordRepeat")?.value || "";
    const message = $("#authMessage");

    try {
      if (mode === "register") {
        if (!email || password.length < 8 || password !== repeat) {
          setText(message,password !== repeat ? "Passwords do not match." : "Enter an email and a password of at least 8 characters.");
          return;
        }
        const result = await signUp(client,{email,password,emailRedirectTo:new URL("/",window.location.origin).href});
        setText(message,result.session ? "Registered." : "Check your email to confirm registration.");
        if (result.session) closeAuthModal();
      } else {
        if (!email || !password) { setText(message,"Enter email and password."); return; }
        await signIn(client,{email,password});
        closeAuthModal();
      }
    } catch (error) {
      setText(message,error?.message || "Authentication failed.");
    }
  });

  forgot?.addEventListener("click",async () => {
    const email = $("#authEmail")?.value.trim() || "";
    const message = $("#authMessage");
    if (!email) { setText(message,"Enter your email first."); return; }
    try {
      await requestPasswordReset(client,{email,redirectTo:new URL("/?auth=password-reset",window.location.origin).href});
      setText(message,"Password reset email sent.");
    } catch (error) {
      setText(message,error?.message || "Password reset failed.");
    }
  });

  modeSwitch?.addEventListener("click",() => {
    const modal = $("#idesussAuthModal");
    openAuthModal(modal?.dataset.mode === "register" ? "login" : "register");
  });

  $("#messagesLoginBtn").addEventListener("click",() => openAuthModal("login"));
  $("#messagesRegisterBtn").addEventListener("click",() => openAuthModal("register"));
}

async function handleIdentity(identity) {
  me = identity;
  currentOther = null;
  currentThread = null;
  $("#messagesPanel").classList.remove("mobile-conversation");
  setAuthUi(identity);
  cleanupRealtime();

  if (!identity) return;
  await Promise.all([loadFriendships(),loadThreads(),loadNotificationSettings()]);
  subscribeRealtime();
}

async function boot() {
  initMessagesLanguage();
  client = await getSharedSupabaseClient();
  bindAuthModal();

  unsubscribeAuth = subscribeAuthState(client,(identity) => handleIdentity(identity));
  let identity = null;
  try { identity = await currentIdentity(client); } catch {}
  await handleIdentity(identity);
}

window.addEventListener("idesuss:messages-language-applied",async () => {
  if (!client) return;
  if (me) {
    await Promise.all([loadFriendships(),loadThreads()]);
    if (currentOther) await loadConversation();
  }
});

window.addEventListener("beforeunload",() => {
  unsubscribeAuth?.();
  cleanupRealtime();
});

boot().catch((error) => {
  console.error("Messaging boot failed",error);
  setText($("#threadList"),t("threadsLoadError"));
});
