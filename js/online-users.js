import { formatUserDisplayName } from "./shared/user-badges.js";
import { getSharedSupabaseClient } from "./shared/supabase-client.js";
import { PRESENCE_POLICY } from "./shared/presence-policy.js";

const REFRESH_MS = PRESENCE_POLICY.heartbeatIntervalMs;

function t(key, fallback) {
  return window.idesussHomeTranslations?.[key] || fallback;
}

function setStatusState(status, state, message = "") {
  status.className = "online-users-status info-state";
  status.dataset.state = state;
  status.textContent = message;
}

function renderEmpty(list, status) {
  list.replaceChildren();
  const item = document.createElement("div");
  item.className = "online-user-empty";
  item.textContent = t("onlineUsersNone", "No visible registered users are online.");
  list.append(item);
  status.className = "online-users-status";
  status.removeAttribute("data-state");
  status.textContent = "";
}

async function refreshOnlineUsers() {
  const list = document.getElementById("onlineUsersList");
  const status = document.getElementById("onlineUsersListStatus");
  if (!list || !status) return;

  setStatusState(status, "loading", t("onlineUsersLoading", "Online users loading…"));
  const client = await getSharedSupabaseClient();
  const { data, error } = await client.rpc(PRESENCE_POLICY.listRpc);
  if (error) {
    console.error("Online user list failed", error);
    setStatusState(status, "error", t("onlineUsersLoadError", "Online users could not be loaded."));
    return;
  }

  if (!(data || []).length) {
    renderEmpty(list, status);
    return;
  }

  list.replaceChildren();
  for (const user of data) {
    const row = document.createElement("div");
    row.className = "online-user-row";

    const avatar = document.createElement("span");
    avatar.className = "online-user-avatar";
    avatar.textContent = user.avatar_emoji || "🙂";

    const name = document.createElement("span");
    name.className = "online-user-name";
    name.textContent = formatUserDisplayName(
      user.nickname || t("onlineUsersAnonymous", "User"),
      { role: user.role, isVip: user.is_vip === true }
    );

    const dot = document.createElement("span");
    dot.className = "online-user-dot";
    dot.setAttribute("aria-label", t("onlineNow", "Online"));
    dot.title = t("onlineNow", "Online");

    row.append(avatar, name, dot);
    list.append(row);
  }

  status.className = "online-users-status";
  status.removeAttribute("data-state");
  status.textContent = t("onlineUsersVisibleCount", "{count} visible registered users online.")
    .replace("{count}", String(data.length));
}

window.addEventListener("idesuss:home-language-applied", refreshOnlineUsers);
window.addEventListener("idesuss:languagechange", refreshOnlineUsers);
refreshOnlineUsers();
window.setInterval(refreshOnlineUsers, REFRESH_MS);
