const RESERVED_MODERATOR_SUFFIXES = [
  "_hu", "_en", "_nl", "_ro", "_pl", "_hr", "_de"
];

export function normalizeNickname(name = "") {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function requireClient(supabaseClient) {
  if (!supabaseClient) {
    throw new Error("Missing Supabase client.");
  }
  return supabaseClient;
}

function isMissingRpcError(error) {
  if (!error) return false;
  const text = `${error.code || ""} ${error.message || ""} ${error.details || ""}`.toLowerCase();
  return text.includes("save_my_profile") && (
    text.includes("not found") ||
    text.includes("does not exist") ||
    text.includes("pgrst202") ||
    text.includes("42883")
  );
}

function profileError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function getMyEulaStatus(supabaseClient) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.rpc("get_my_eula_status");
  if (error) throw error;
  return data || { authenticated: false, accepted: false, required_version: null, accepted_at: null };
}

export async function acceptCurrentEula(supabaseClient) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.rpc("accept_current_eula");
  if (error) throw error;
  return data;
}

export async function getCurrentUser(supabaseClient) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

export async function ensureMyProfile(supabaseClient) {
  const client = requireClient(supabaseClient);
  const user = await getCurrentUser(client);
  if (!user) return null;

  const { data: existing, error: selectError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await client
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      email_visibility: "hidden",
      profile_completed: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function validateNickname(supabaseClient, rawNickname) {
  const client = requireClient(supabaseClient);
  const normalized = normalizeNickname(rawNickname);

  if (!normalized) {
    return { ok: false, normalized, reason: "EMPTY" };
  }

  if (RESERVED_MODERATOR_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return { ok: false, normalized, reason: "RESERVED_SUFFIX" };
  }

  const { data: reserved, error: reservedError } = await client
    .from("reserved_nicknames")
    .select("nickname_normalized")
    .eq("nickname_normalized", normalized)
    .maybeSingle();

  if (reservedError) throw reservedError;
  if (reserved) return { ok: false, normalized, reason: "RESERVED" };

  // `profiles` is intentionally owner-only under RLS, so a client must not
  // enumerate other users merely to preflight nickname uniqueness. The live
  // unique index / save_my_profile boundary is authoritative for TAKEN.
  return { ok: true, normalized, reason: null };
}

async function saveMyProfileLegacy(client, user, profile, changes) {
  const nickname = changes.nickname ?? profile?.nickname ?? "";
  const validation = await validateNickname(client, nickname);
  if (!validation.ok) {
    throw profileError(validation.reason, `INVALID_NICKNAME:${validation.reason}`);
  }

  const emailVisibility = ["hidden", "masked", "public"].includes(changes.email_visibility)
    ? changes.email_visibility
    : (profile?.email_visibility || "hidden");

  const isStaff = ["moderator", "admin"].includes(profile?.role);
  const requestedAvatar = changes.avatar_emoji ?? profile?.avatar_emoji ?? null;
  if (!isStaff && requestedAvatar === STAFF_AVATAR_EMOJI) {
    throw profileError("STAFF_AVATAR_RESERVED", "INVALID_PROFILE:STAFF_AVATAR_RESERVED");
  }

  const payload = {
    nickname,
    nickname_normalized: validation.normalized,
    avatar_emoji: isStaff ? STAFF_AVATAR_EMOJI : requestedAvatar,
    email_visibility: emailVisibility,
    profile_completed: Boolean(nickname && (changes.avatar_emoji ?? profile?.avatar_emoji))
  };

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select()
    .single();

  if (error?.code === "23505") {
    throw profileError("TAKEN", "INVALID_NICKNAME:TAKEN");
  }
  if (error) throw error;
  return data;
}

export async function saveMyProfile(supabaseClient, changes = {}) {
  const client = requireClient(supabaseClient);
  const user = await getCurrentUser(client);
  if (!user) throw new Error("AUTH_REQUIRED");

  const profile = await ensureMyProfile(client);
  const nickname = changes.nickname ?? profile?.nickname ?? "";
  const avatarEmoji = changes.avatar_emoji ?? profile?.avatar_emoji ?? "";
  const emailVisibility = ["hidden", "masked", "public"].includes(changes.email_visibility)
    ? changes.email_visibility
    : (profile?.email_visibility || "hidden");

  const { data: rpcData, error: rpcError } = await client.rpc("save_my_profile", {
    p_nickname: nickname,
    p_avatar_emoji: avatarEmoji,
    p_email_visibility: emailVisibility
  });

  if (!rpcError) return rpcData;
  if (rpcError.code === "23505") {
    throw profileError("TAKEN", "INVALID_NICKNAME:TAKEN");
  }
  if (!isMissingRpcError(rpcError)) throw rpcError;

  // Defensive compatibility only: use the old direct-write path if the RPC
  // is unexpectedly absent in a non-production/older environment.
  return saveMyProfileLegacy(client, user, profile, changes);
}


export async function setMyPresenceVisibility(supabaseClient, visibility) {
  const client = requireClient(supabaseClient);
  const allowed = new Set(["nobody", "friends", "everyone"]);
  if (!allowed.has(visibility)) throw profileError("INVALID_PRESENCE_VISIBILITY");

  const { data, error } = await client.rpc("set_my_presence_visibility", {
    p_visibility: visibility
  });
  if (error) throw error;
  return data;
}

export const STAFF_AVATAR_EMOJI = "🧑‍💻";

export const APPROVED_AVATAR_EMOJIS = Object.freeze([
  "🙂", "😎", "🤠", "🚚", "🎧",
  "🦊", "🐼", "🦁", "🐯", "🤖", "👽"
]);

const AVATAR_SUBMISSION_BUCKET = "avatar-submissions";

export async function getProfileAvatarImageUrl(supabaseClient, profile, expiresIn = 3600) {
  const client = requireClient(supabaseClient);
  const path = profile?.avatar_image_path;
  if (!path) return "";

  const { data, error } = await client.storage
    .from(AVATAR_SUBMISSION_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data?.signedUrl || "";
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateAvatarFile(file) {
  if (!file) return { ok: false, reason: "NO_FILE" };
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) return { ok: false, reason: "TYPE" };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, reason: "SIZE" };
  return { ok: true, reason: null };
}

function avatarExtension(file) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadAvatarSubmission(supabaseClient, file) {
  const client = requireClient(supabaseClient);
  const user = await getCurrentUser(client);
  if (!user) throw profileError("AUTH_REQUIRED");

  const profile = await ensureMyProfile(client);
  if (["moderator", "admin"].includes(profile?.role)) {
    throw profileError("STAFF_AVATAR_LOCKED", "INVALID_PROFILE:STAFF_AVATAR_LOCKED");
  }

  const validation = validateAvatarFile(file);
  if (!validation.ok) throw profileError(`AVATAR_${validation.reason}`);

  const randomPart = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  const path = `${user.id}/${Date.now()}-${randomPart}.${avatarExtension(file)}`;

  const { error: uploadError } = await client.storage
    .from(AVATAR_SUBMISSION_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await client
    .from("avatar_submissions")
    .insert({
      user_id: user.id,
      storage_path: path,
      original_filename: String(file.name || "").slice(0, 255),
      mime_type: file.type,
      status: "pending",
      rules_version: "2026-09-23-v2"
    })
    .select("id,status,created_at")
    .single();

  if (insertError) {
    await client.storage.from(AVATAR_SUBMISSION_BUCKET).remove([path]).catch(() => {});
    throw insertError;
  }

  return data;
}

export async function loadMyAvatarSubmissions(supabaseClient) {
  const client = requireClient(supabaseClient);
  const user = await getCurrentUser(client);
  if (!user) return [];

  const { data, error } = await client
    .from("avatar_submissions")
    .select("id,status,created_at,reviewed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

export async function loadMyProfile(supabaseClient) {
  return ensureMyProfile(supabaseClient);
}

export function subscribeToMyProfile(supabaseClient, userId, onChange) {
  const client = requireClient(supabaseClient);
  if (!userId || typeof onChange !== "function") return () => {};

  const channel = client
    .channel(`idesuss-profile-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`
      },
      (payload) => onChange(payload.new)
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
