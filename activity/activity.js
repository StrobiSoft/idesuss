import { getSharedSupabaseClient } from "../js/shared/supabase-client.js";
import { formatUserDisplayName } from "../js/shared/user-badges.js";

const $ = (selector) => document.querySelector(selector);
const REFRESH_MS = 15000;

function setText(el, value) {
  if (el) el.textContent = value;
}

function roleLabel(role) {
  return {
    owner: "Platform Owner",
    admin: "Admin",
    moderator: "Moderátor",
    user: "Felhasználó"
  }[role] || role || "Felhasználó";
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function makeRow(user, { recent = false } = {}) {
  const row = document.createElement("div");
  row.className = "activity-row";

  const main = document.createElement("div");
  main.className = "activity-main";

  const name = document.createElement("div");
  name.className = "activity-name";
  name.textContent = formatUserDisplayName(
    user.nickname || user.email || "Felhasználó",
    { role: user.role, isVip: user.is_vip === true }
  );

  const meta = document.createElement("div");
  meta.className = "activity-meta";
  const page = user.page ? ` · oldal: ${user.page}` : "";
  meta.textContent = recent
    ? `${user.email || "—"} · ${roleLabel(user.role)} · bejelentkezés: ${formatTime(user.last_sign_in_at)}`
    : `${user.email || "—"} · ${roleLabel(user.role)} · utolsó jel: ${formatTime(user.last_seen)}${page}`;

  main.append(name, meta);

  const state = document.createElement("div");
  state.className = "activity-state";
  if (recent) {
    if (user.is_online) {
      state.classList.add("online");
      state.textContent = "● Online";
    } else {
      state.textContent = "Offline";
    }
  } else {
    state.classList.add("online");
    state.textContent = "● Online";
  }

  row.append(main, state);
  return row;
}

function renderList(target, rows, options) {
  target.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "activity-empty";
    empty.textContent = options.emptyText;
    target.append(empty);
    return;
  }
  for (const row of rows) target.append(makeRow(row, options));
}

async function getAccess(client) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) return { allowed: false, reason: "AUTH_REQUIRED" };

  const { data, error } = await client.rpc("get_my_admin_access");
  if (error) throw error;

  const role = data?.role || "user";
  const allowed = data?.allowed === true
    && ["admin", "owner"].includes(role)
    && data?.terms_required !== true;

  return { ...(data || {}), allowed, role };
}

async function refreshActivity(client) {
  const onlineList = $("#onlineList");
  const recentList = $("#recentList");
  const onlineStatus = $("#onlineStatus");
  const recentStatus = $("#recentStatus");

  setText(onlineStatus, "Online felhasználók frissítése…");
  setText(recentStatus, "Legutóbbi bejelentkezések frissítése…");

  const [onlineResult, recentResult] = await Promise.all([
    client.rpc("admin_list_online_users"),
    client.rpc("admin_list_recent_logins", { p_limit: 10 })
  ]);

  if (onlineResult.error) throw onlineResult.error;
  if (recentResult.error) throw recentResult.error;

  const online = onlineResult.data || [];
  const recent = recentResult.data || [];

  renderList(onlineList, online, {
    recent: false,
    emptyText: "Jelenleg nincs online regisztrált felhasználó."
  });
  renderList(recentList, recent, {
    recent: true,
    emptyText: "Még nincs rögzített bejelentkezés."
  });

  setText(onlineStatus, `${online.length} felhasználó online.`);
  setText(recentStatus, `${recent.length} legutóbbi bejelentkezés megjelenítve.`);
}

async function boot() {
  try {
    const client = await getSharedSupabaseClient();
    const access = await getAccess(client);

    if (!access.allowed) {
      setText($("#roleBadge"), "Nincs hozzáférés");
      setText(
        $("#accessStatus"),
        access?.terms_required
          ? "Az adminisztrátori szabályok elfogadása szükséges az aktivitási nézethez."
          : "Ez a nézet csak Admin és Platform Owner számára érhető el."
      );
      $("#accessStatus")?.classList.add("error");
      return;
    }

    setText($("#roleBadge"), `Szerepkör: ${roleLabel(access.role)}`);
    setText($("#accessStatus"), "Jogosultság ellenőrizve. Automatikus frissítés 15 másodpercenként.");
    $("#activityContent").hidden = false;

    await refreshActivity(client);

    window.setInterval(() => {
      refreshActivity(client).catch((error) => {
        console.error("Admin activity refresh failed", error);
        setText($("#onlineStatus"), "Az aktivitás frissítése nem sikerült.");
        setText($("#recentStatus"), "Az aktivitás frissítése nem sikerült.");
      });
    }, REFRESH_MS);
  } catch (error) {
    console.error("Admin activity startup failed", error);
    setText($("#roleBadge"), "Felhasználói aktivitás");
    setText($("#accessStatus"), `A nézet nem tölthető be: ${error?.message || "ismeretlen hiba"}`);
    $("#accessStatus")?.classList.add("error");
  }
}

boot();
