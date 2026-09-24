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
  $("#userAdminCard").hidden = !caps.manage_users || caps.platform_owner;
  $("#ownerCard").hidden = !caps.platform_owner;
}

async function showAdminTerms() {
  $("#adminContent").hidden = true;
  $("#adminTermsCard").hidden = false;

  const { data, error } = await client.rpc("get_admin_terms");
  if (error) throw error;

  text($("#adminTermsTitle"), data?.title || "Adminisztrátori felelősségvállalás");
  text($("#adminTermsSummary"), data?.summary || "");

  const list = $("#adminTermsList");
  list.replaceChildren();
  for (const rule of data?.rules || []) {
    const li = document.createElement("li");
    li.textContent = rule;
    list.appendChild(li);
  }

  const checkbox = $("#adminTermsCheckbox");
  const button = $("#acceptAdminTermsBtn");
  checkbox?.addEventListener("change", () => {
    if (button) button.disabled = !checkbox.checked;
  });

  button?.addEventListener("click", async () => {
    button.disabled = true;
    text($("#adminTermsStatus"), "Elfogadás mentése…");
    try {
      const { error: acceptError } = await client.rpc("accept_admin_terms");
      if (acceptError) throw acceptError;
      text($("#adminTermsStatus"), "Szabályok elfogadva. Az adminisztrátori eszközök aktiválva.");
      window.location.reload();
    } catch (acceptError) {
      console.error("Admin terms acceptance failed", acceptError);
      text($("#adminTermsStatus"), `Az elfogadás mentése nem sikerült: ${acceptError?.message || "ismeretlen hiba"}`);
      button.disabled = false;
    }
  });
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

async function requestAdminPromotion(user, normalizedQuery) {
  const status = $("#adminUserStatus");
  text(status, `${user.nickname || user.email}: adminná emelési kérelem küldése…`);

  const { error } = await client.rpc("admin_request_admin_promotion", {
    p_user_id: user.id
  });
  if (error) throw error;

  text(status, `${user.nickname || user.email}: a kérelem elküldve a Platform Ownernek.`);
  await loadAdminUsers(normalizedQuery);
}

async function loadAdminUsers(query = "") {
  const list = $("#adminUserList");
  const status = $("#adminUserStatus");
  if (!list || !status) return;

  const normalizedQuery = query.trim();
  list.replaceChildren();

  if (normalizedQuery.length < 2) {
    text(status, "Írj be legalább 2 karaktert a kereséshez.");
    return;
  }

  text(status, "Keresés…");
  const { data, error } = await client.rpc("admin_search_users", {
    p_query: normalizedQuery,
    p_limit: 50
  });

  if (error) {
    console.error("Admin user search failed", error);
    text(status, "A keresés nem sikerült.");
    return;
  }

  for (const user of data || []) {
    const row = document.createElement("div");
    row.className = "user-row";

    const identity = document.createElement("div");
    const name = document.createElement("div");
    name.className = "user-name";
    name.textContent = user.nickname || user.email || "Névtelen profil";
    if (user.role === "owner") name.textContent += " 👑";
    else if (user.role === "admin" || user.role === "moderator") name.textContent += " 🛡️";
    if (user.is_vip) name.textContent += " 💎";

    const meta = document.createElement("div");
    meta.className = "user-meta";
    meta.textContent = `${user.email || "—"} · ${roleLabel(user.role)}`;
    identity.append(name, meta);

    const roleBox = document.createElement("div");
    const roleBadge = document.createElement("span");
    roleBadge.className = "badge";
    roleBadge.textContent = roleLabel(user.role);
    roleBox.append(roleBadge);

    const controls = document.createElement("div");
    controls.className = "controls";

    if (user.role === "user") {
      const promoteModerator = document.createElement("button");
      promoteModerator.className = "action save";
      promoteModerator.type = "button";
      promoteModerator.textContent = "Moderátorrá emelés";
      promoteModerator.addEventListener("click", async () => {
        promoteModerator.disabled = true;
        text(status, `${user.nickname || user.email}: moderátorrá emelés…`);
        try {
          const { error: promoteError } = await client.rpc("admin_promote_user_to_moderator", {
            p_user_id: user.id
          });
          if (promoteError) throw promoteError;
          text(status, `${user.nickname || user.email}: moderátorrá emelve.`);
          await loadAdminUsers(normalizedQuery);
        } catch (promoteError) {
          console.error("Admin moderator promotion failed", promoteError);
          text(status, `Műveleti hiba: ${promoteError?.message || "ismeretlen hiba"}`);
        } finally {
          promoteModerator.disabled = false;
        }
      });
      controls.append(promoteModerator);
    }

    if (["user", "moderator"].includes(user.role)) {
      const requestAdmin = document.createElement("button");
      requestAdmin.className = "action";
      requestAdmin.type = "button";
      requestAdmin.textContent = "Adminná emelés kérése";
      requestAdmin.title = "A rang csak a Platform Owner jóváhagyása után változik meg.";
      requestAdmin.addEventListener("click", async () => {
        requestAdmin.disabled = true;
        try {
          await requestAdminPromotion(user, normalizedQuery);
        } catch (requestError) {
          console.error("Admin promotion request failed", requestError);
          const raw = requestError?.message || "";
          text(
            status,
            raw.includes("ADMIN_PROMOTION_ALREADY_PENDING")
              ? "Ehhez a felhasználóhoz már van függő adminná emelési kérelem."
              : `A kérelem nem küldhető el: ${raw || "ismeretlen hiba"}`
          );
        } finally {
          requestAdmin.disabled = false;
        }
      });
      controls.append(requestAdmin);
    }

    if (!["user", "moderator"].includes(user.role)) {
      const note = document.createElement("span");
      note.className = "user-meta";
      note.textContent = "Ezt a rangot admin nem módosíthatja.";
      controls.append(note);
    }

    row.append(identity, roleBox, controls);
    list.appendChild(row);
  }

  text(
    status,
    (data || []).length
      ? `${(data || []).length} találat erre: „${normalizedQuery}”.`
      : `Nincs találat erre: „${normalizedQuery}”.`
  );
}

function initAdminUserSearch() {
  const input = $("#adminUserSearch");
  if (!input) return;

  let timer = null;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      loadAdminUsers(input.value).catch((error) => {
        console.error("Admin user search failed", error);
        text($("#adminUserStatus"), "A keresés nem sikerült.");
      });
    }, 250);
  });
}

async function loadOwnerPromotionRequests() {
  const list = $("#ownerPromotionRequestList");
  const status = $("#ownerPromotionRequestStatus");
  if (!list || !status) return;

  list.replaceChildren();
  text(status, "Kérelmek betöltése…");

  const { data, error } = await client.rpc("owner_list_admin_promotion_requests");
  if (error) {
    console.error("Owner promotion request list failed", error);
    text(status, "A kérelmek nem tölthetők be.");
    return;
  }

  for (const request of data || []) {
    const row = document.createElement("div");
    row.className = "request-row";

    const copy = document.createElement("div");
    const title = document.createElement("div");
    title.className = "user-name";
    title.textContent = request.target_nickname || request.target_email || "Névtelen profil";

    const meta = document.createElement("div");
    meta.className = "user-meta";
    meta.textContent = `${request.target_email || "—"} · jelenlegi rang: ${roleLabel(request.target_current_role)} · kérte: ${request.requester_nickname || request.requester_email || "ismeretlen admin"}`;
    copy.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approve = document.createElement("button");
    approve.className = "action save";
    approve.type = "button";
    approve.textContent = "Jóváhagyás";

    const reject = document.createElement("button");
    reject.className = "action";
    reject.type = "button";
    reject.textContent = "Elutasítás";

    const decide = async (approved) => {
      approve.disabled = true;
      reject.disabled = true;
      text(status, approved ? "Jóváhagyás mentése…" : "Elutasítás mentése…");
      try {
        const { error: decisionError } = await client.rpc("owner_decide_admin_promotion_request", {
          p_request_id: request.request_id,
          p_approve: approved
        });
        if (decisionError) throw decisionError;

        text(
          status,
          approved
            ? "Adminná emelés jóváhagyva. Az új adminnak el kell fogadnia az adminisztrátori szabályokat."
            : "Adminná emelési kérelem elutasítva."
        );
        await Promise.all([loadOwnerPromotionRequests(), loadOwnerUsers()]);
      } catch (decisionError) {
        console.error("Owner promotion decision failed", decisionError);
        text(status, `A döntés mentése nem sikerült: ${decisionError?.message || "ismeretlen hiba"}`);
        approve.disabled = false;
        reject.disabled = false;
      }
    };

    approve.addEventListener("click", () => decide(true));
    reject.addEventListener("click", () => decide(false));
    actions.append(approve, reject);
    row.append(copy, actions);
    list.appendChild(row);
  }

  text(
    status,
    (data || []).length
      ? `${(data || []).length} függő adminná emelési kérelem.`
      : "Nincs függő adminná emelési kérelem."
  );
}

async function loadOwnerUsers(query = "") {
  const list = $("#ownerUserList");
  const status = $("#ownerStatus");
  list.replaceChildren();
  text(status, "Felhasználók betöltése…");

  const rpcName = query.trim() ? "owner_search_users_v2" : "owner_list_users_v2";
  const args = query.trim() ? { p_query: query.trim(), p_limit: 50 } : undefined;
  const { data, error } = await client.rpc(rpcName, args);
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
    if (user.role === "owner") name.textContent += " 👑";
    else if (user.role === "admin" || user.role === "moderator") name.textContent += " 🛡️";
    if (user.is_vip) name.textContent += " 💎";
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

    const vipSelect = createSelect([
      ["false", "Normál státusz"],
      ["true", "💎 VIP"]
    ], user.is_vip ? "true" : "false");
    vipSelect.disabled = user.role === "owner";

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

          const nextVip = vipSelect.value === "true";
          if (nextVip !== Boolean(user.is_vip)) {
            const { error: vipError } = await client.rpc("owner_set_vip_status", {
              p_user_id: user.id,
              p_is_vip: nextVip
            });
            if (vipError) throw vipError;
          }

          text(status, `${user.nickname || user.email}: elmentve.`);
          await Promise.all([loadOwnerUsers(), loadOwnerPromotionRequests()]);
        } catch (error) {
          console.error("Owner user update failed", error);
          text(status, `Mentési hiba: ${error?.message || "ismeretlen hiba"}`);
        } finally {
          save.disabled = false;
        }
      });
      controls.append(roleSelect, compSelect, vipSelect, save);
    }

    row.append(identity, roleSelect.disabled ? document.createElement("div") : document.createElement("div"), controls);
    if (!roleSelect.disabled) {
      const middle = row.children[1];
      middle.append(roleSelect, compSelect, vipSelect);
    }
    list.appendChild(row);
  }

  text(
    status,
    query.trim()
      ? `${(data || []).length} találat erre: „${query.trim()}”.`
      : `${(data || []).length} felhasználó betöltve.`
  );
}

function initOwnerSearch() {
  const input = $("#ownerUserSearch");
  if (!input) return;

  let timer = null;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      loadOwnerUsers(input.value).catch((error) => {
        console.error("Owner search failed", error);
        text($("#ownerStatus"), "A keresés nem sikerült.");
      });
    }, 250);
  });
}


async function loadAvatarReviewQueue() {
  const list = $("#avatarReviewList");
  const status = $("#avatarReviewStatus");
  if (!list || !status) return;

  list.replaceChildren();
  text(status, "Függő avatárok betöltése…");

  const { data, error } = await client.rpc("list_pending_avatar_submissions");
  if (error) {
    console.error("Avatar review queue failed", error);
    text(status, `A munkalista nem tölthető be: ${error.message || "ismeretlen hiba"}`);
    return;
  }

  for (const item of data || []) {
    const row = document.createElement("div");
    row.className = "avatar-review-item";

    const image = document.createElement("img");
    image.className = "avatar-review-image";
    image.alt = item.nickname ? `${item.nickname} avatárja` : "Beküldött avatár";

    const signed = await client.storage
      .from("avatar-submissions")
      .createSignedUrl(item.storage_path, 300);

    if (signed.error) {
      console.error("Avatar preview URL failed", signed.error);
    } else {
      image.src = signed.data?.signedUrl || "";
    }

    const meta = document.createElement("div");
    meta.className = "avatar-review-meta";

    const title = document.createElement("div");
    title.className = "user-name";
    title.textContent = item.nickname || item.email || "Névtelen profil";

    const detail = document.createElement("div");
    detail.className = "user-meta";
    detail.textContent = `${item.email || "—"} · ${item.original_filename || "kép"} · ${new Date(item.created_at).toLocaleString()}`;

    const note = document.createElement("textarea");
    note.className = "avatar-review-note";
    note.maxLength = 1000;
    note.placeholder = "Moderátori megjegyzés (opcionális)";

    const actions = document.createElement("div");
    actions.className = "avatar-review-actions";

    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "action save";
    approve.textContent = "Jóváhagyás";

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "action reject";
    reject.textContent = "Elutasítás";

    const decide = async (approved) => {
      approve.disabled = true;
      reject.disabled = true;
      text(status, approved ? "Jóváhagyás mentése…" : "Elutasítás mentése…");
      const { error: decisionError } = await client.rpc("review_avatar_submission", {
        p_submission_id: item.submission_id,
        p_approve: approved,
        p_note: note.value.trim() || null
      });

      if (decisionError) {
        console.error("Avatar review decision failed", decisionError);
        text(status, `A döntés mentése nem sikerült: ${decisionError.message || "ismeretlen hiba"}`);
        approve.disabled = false;
        reject.disabled = false;
        return;
      }

      await loadAvatarReviewQueue();
    };

    approve.addEventListener("click", () => decide(true));
    reject.addEventListener("click", () => decide(false));

    actions.append(approve, reject);
    meta.append(title, detail, note, actions);
    row.append(image, meta);
    list.appendChild(row);
  }

  const count = (data || []).length;
  text(status, count ? `${count} függő avatár vár felülvizsgálatra.` : "Nincs függő avatár.");
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

    if (access.terms_required) {
      text($("#accessMessage"), "Az adminisztrátori szabályok elfogadása szükséges.");
      await showAdminTerms();
      return;
    }

    text($("#accessMessage"), "Jogosultság ellenőrizve.");
    $("#adminTermsCard").hidden = true;
    showCapabilities(access);

    if (access?.capabilities?.review_avatars) {
      await loadAvatarReviewQueue();
      if (window.location.hash === "#avatar-review") {
        $("#avatarReviewCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (access?.capabilities?.platform_owner) {
      initOwnerSearch();
      await Promise.all([loadOwnerUsers(), loadOwnerPromotionRequests()]);
    } else if (access?.capabilities?.manage_users) {
      initAdminUserSearch();
    }
  } catch (error) {
    console.error("Admin panel startup failed", error);
    text($("#roleBadge"), "Admin panel");
    text($("#accessMessage"), `A jogosultság ellenőrzése nem sikerült: ${error?.message || "ismeretlen hiba"}`);
    $("#accessMessage")?.classList.add("denied");
  }
}

boot();
