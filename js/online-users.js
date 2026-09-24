import { formatUserDisplayName } from "./shared/user-badges.js";

const REFRESH_MS = 15000;

function t(key, fallback) {
  return window.idesussHomeTranslations?.[key] || fallback;
}

function renderEmpty(list, status) {
  list.replaceChildren();
  const item = document.createElement("div");
  item.className = "online-user-empty";
  item.textContent = t("onlineUsersNone", "No visible registered users are online.");
  list.append(item);
  status.textContent = "";
}

async function refreshOnlineUsers() {
  const list = document.getElementById("onlineUsersList");
  const status = document.getElementById("onlineUsersListStatus");
  if (!list || !status || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient.rpc("list_online_users");
  if (error) {
    console.error("Online user list failed", error);
    status.textContent = t("onlineUsersLoadError", "Online users could not be loaded.");
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

  status.textContent = t("onlineUsersVisibleCount", "{count} visible registered users online.")
    .replace("{count}", String(data.length));
}

window.addEventListener("idesuss:home-language-applied", refreshOnlineUsers);
window.addEventListener("idesuss:languagechange", refreshOnlineUsers);
refreshOnlineUsers();
window.setInterval(refreshOnlineUsers, REFRESH_MS);
