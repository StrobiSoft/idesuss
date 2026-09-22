const SUPABASE_URL = "https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (selector) => document.querySelector(selector);

function text(el, value) {
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

function tierLabel(tier) {
  return {
    registered: "Regisztrált",
    premium: "Premium",
    premium_plus: "Premium Plus"
  }[tier] || tier || "Regisztrált";
}

async function getAccess() {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) return { allowed: false, role: "user", reason: "AUTH_REQUIRED" };

  const { data, error } = await client.rpc("get_my_admin_access");
  if (error) throw error;
  return data || { allowed: false, role: "user" };
}

function showCapabilities(access) {
  const caps = access?.capabilities || {};
  $("#adminContent").hidden = false;
  $("#moderationCard").hidden = !caps.moderate_content;
  $("#avatarReviewCard").hidden = !caps.review_avatars;
  $("#userAdminCard").hidden = !caps.manage_users;
  $("#ownerCard").hidden = !caps.platform_owner;
}

function createSelect(options, value) {
  const select = document.createElement("select");
  for (const [optionValue, label] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === (value ?? "");
    select.appendChild(option);
  }
  return select;
}

async function loadOwnerUsers() {
  const list = $("#ownerUserList");
  const status = $("#ownerStatus");
  list.replaceChildren();
  text(status, "Felhasználók betöltése…");

  const { data, error } = await client.rpc("owner_list_users");
  if (error) {
    console.error("Owner user list failed", error);
    text(status, "A felhasználólista nem tölthető be.");
    return;
  }

  for (const user of data || []) {
    const row = document.createElement("div");
    row.className = "user-row";

    const identity = document.createElement("div");
    const name = document.createElement("div");
    name.className = "user-name";
    name.textContent = user.nickname || user.email || "Névtelen profil";
    const meta = document.createElement("div");
    meta.className = "user-meta";
    meta.textContent = `${user.email || "—"} · ${roleLabel(user.role)} · ${tierLabel(user.effective_tier)}`;
    identity.append(name, meta);

    const roleSelect = createSelect([
      ["user", "Felhasználó"],
      ["moderator", "Moderátor"],
      ["admin", "Admin"]
    ], user.role === "owner" ? "user" : user.role);
    roleSelect.disabled = user.role === "owner";

    const compSelect = createSelect([
      ["", "Nincs díjmentes prémium"],
      ["premium", "Premium — díjmentes"],
      ["premium_plus", "Premium Plus — díjmentes"]
    ], user.complimentary_tier || "");
    compSelect.disabled = user.role === "owner";

    const controls = document.createElement("div");
    controls.className = "controls";

    if (user.role === "owner") {
      const owner = document.createElement("span");
      owner.className = "badge";
      owner.textContent = "👑 Platform Owner";
      controls.append(owner);
    } else {
      const save = document.createElement("button");
      save.className = "action save";
      save.type = "button";
      save.textContent = "Mentés";
      save.addEventListener("click", async () => {
        save.disabled = true;
        text(status, `${user.nickname || user.email}: mentés…`);
        try {
          if (roleSelect.value !== user.role) {
            const { error: roleError } = await client.rpc("owner_set_user_role", {
              p_user_id: user.id,
              p_role: roleSelect.value
            });
            if (roleError) throw roleError;
          }

          const nextComp = compSelect.value || "";
          if (nextComp !== (user.complimentary_tier || "")) {
            const { error: tierError } = await client.rpc("owner_set_complimentary_tier", {
              p_user_id: user.id,
              p_tier: nextComp
            });
            if (tierError) throw tierError;
          }

          text(status, `${user.nickname || user.email}: elmentve.`);
          await loadOwnerUsers();
        } catch (error) {
          console.error("Owner user update failed", error);
          text(status, `Mentési hiba: ${error?.message || "ismeretlen hiba"}`);
        } finally {
          save.disabled = false;
        }
      });
      controls.append(roleSelect, compSelect, save);
    }

    row.append(identity, roleSelect.disabled ? document.createElement("div") : document.createElement("div"), controls);
    if (!roleSelect.disabled) {
      const middle = row.children[1];
      middle.append(roleSelect, compSelect);
    }
    list.appendChild(row);
  }

  text(status, `${(data || []).length} felhasználó betöltve.`);
}

async function boot() {
  try {
    const access = await getAccess();

    if (!access.allowed) {
      text($("#roleBadge"), "Nincs adminisztrációs jogosultság");
      text($("#accessMessage"), "Ez a fiók nem fér hozzá az adminisztrációs funkciókhoz.");
      $("#accessMessage")?.classList.add("denied");
      return;
    }

    text($("#roleBadge"), `Szerepkör: ${roleLabel(access.role)}`);
    text($("#accessMessage"), "Jogosultság ellenőrizve.");
    showCapabilities(access);

    if (access?.capabilities?.platform_owner) {
      await loadOwnerUsers();
    }
  } catch (error) {
    console.error("Admin panel startup failed", error);
    text($("#roleBadge"), "Admin panel");
    text($("#accessMessage"), `A jogosultság ellenőrzése nem sikerült: ${error?.message || "ismeretlen hiba"}`);
    $("#accessMessage")?.classList.add("denied");
  }
}

boot();
