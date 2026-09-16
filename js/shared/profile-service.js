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

export async function validateNickname(supabaseClient, rawNickname, currentUserId = null) {
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

  let query = client
    .from("profiles")
    .select("id")
    .eq("nickname_normalized", normalized);

  if (currentUserId) query = query.neq("id", currentUserId);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { ok: false, normalized, reason: "TAKEN" };

  return { ok: true, normalized, reason: null };
}

export async function saveMyProfile(supabaseClient, changes = {}) {
  const client = requireClient(supabaseClient);
  const user = await getCurrentUser(client);
  if (!user) throw new Error("AUTH_REQUIRED");

  const profile = await ensureMyProfile(client);
  const nickname = changes.nickname ?? profile?.nickname ?? "";
  const validation = await validateNickname(client, nickname, user.id);
  if (!validation.ok) {
    const error = new Error(`INVALID_NICKNAME:${validation.reason}`);
    error.code = validation.reason;
    throw error;
  }

  const emailVisibility = ["hidden", "masked", "public"].includes(changes.email_visibility)
    ? changes.email_visibility
    : (profile?.email_visibility || "hidden");

  const payload = {
    nickname,
    nickname_normalized: validation.normalized,
    avatar_emoji: changes.avatar_emoji ?? profile?.avatar_emoji ?? null,
    email_visibility: emailVisibility,
    profile_completed: Boolean(nickname && (changes.avatar_emoji ?? profile?.avatar_emoji))
  };

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
