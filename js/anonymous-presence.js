import { PRESENCE_POLICY } from "./shared/presence-policy.js";
import { getSharedSupabaseClient } from "./shared/supabase-client.js";

function getVisitorId() {
  let id = localStorage.getItem("ides_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ides_visitor_id", id);
  }
  return id;
}

function getTabId() {
  let id = sessionStorage.getItem("idesuss_online_tab_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("idesuss_online_tab_id", id);
  }
  return id;
}

export async function initAnonymousWebPresence() {
  const client = await getSharedSupabaseClient();
  const visitorId = getVisitorId();
  const tabId = getTabId();
  const prefix = PRESENCE_POLICY.anonymousWeb.tabPrefix;
  const ttlMs = PRESENCE_POLICY.anonymousWeb.tabTtlMs;
  const heartbeatMs = PRESENCE_POLICY.anonymousWeb.heartbeatIntervalMs;
  const staleAfterMs = PRESENCE_POLICY.anonymousWeb.staleAfterMs;
  const tabStorageKey = prefix + tabId;

  function touchOnlineTab() {
    localStorage.setItem(tabStorageKey, String(Date.now()));
  }

  function getActiveOnlineTabs() {
    const now = Date.now();
    const active = [];

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;

      const seenAt = Number(localStorage.getItem(key));
      if (!Number.isFinite(seenAt) || now - seenAt > ttlMs) {
        localStorage.removeItem(key);
        continue;
      }

      active.push(key.slice(prefix.length));
    }

    return active.sort();
  }

  function isOnlineLeader() {
    const active = getActiveOnlineTabs();
    return active.length > 0 && active[0] === tabId;
  }

  async function heartbeatOnline() {
    await client
      .from("online_visitors")
      .upsert({
        visitor_id: visitorId,
        page: window.location.pathname || "/",
        status: "online",
        last_seen: new Date().toISOString()
      }, {
        onConflict: "visitor_id"
      });
  }

  async function setOffline() {
    await client
      .from("online_visitors")
      .update({
        status: "offline",
        last_seen: new Date().toISOString()
      })
      .eq("visitor_id", visitorId);
  }

  async function updateOnlineCount() {
    const since = new Date(Date.now() - staleAfterMs).toISOString();

    const { count, error } = await client
      .from("online_visitors")
      .select("*", { count: "exact", head: true })
      .eq("status", "online")
      .gte("last_seen", since);

    if (error) return;

    const el = document.getElementById("onlineUsersCounter");
    if (!el) return;

    el.dataset.count = String(count || 0);
    const template =
      window.idesussHomeTranslations?.onlineUsersCounter ||
      "👁 {count} online";
    el.textContent = template.replace("{count}", el.dataset.count);
  }

  async function runTick() {
    touchOnlineTab();
    if (isOnlineLeader()) await heartbeatOnline();
    await updateOnlineCount();
  }

  touchOnlineTab();
  runTick();

  const timer = window.setInterval(runTick, heartbeatMs);

  const storageHandler = (event) => {
    if (event.key?.startsWith(prefix)) {
      window.setTimeout(runTick, 0);
    }
  };

  const pageHideHandler = () => {
    localStorage.removeItem(tabStorageKey);
    if (getActiveOnlineTabs().length === 0) setOffline();
  };

  window.addEventListener("storage", storageHandler);
  window.addEventListener("pagehide", pageHideHandler);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("pagehide", pageHideHandler);
    localStorage.removeItem(tabStorageKey);
  };
}

initAnonymousWebPresence().catch((error) => {
  console.error("Anonymous web presence init failed", error);
});
