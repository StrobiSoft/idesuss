const SUPABASE_URL = "https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

const TIER_RANK = {
  signed_out: 0,
  registered: 1,
  premium: 2,
  premium_plus: 3
};

function loadSupabaseLibrary() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-idesuss-supabase]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.supabase), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.dataset.idesussSupabase = "true";
    script.addEventListener("load", () => resolve(window.supabase), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

export async function getRadioSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  const supabase = await loadSupabaseLibrary();
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return window.supabaseClient;
}

function capabilityEnvelope(tier, canSaveRadioChannels, canUseRadioSkins) {
  const normalized = ["registered", "premium", "premium_plus"].includes(tier) ? tier : "registered";
  const tierAllowsRadioSkins = TIER_RANK[normalized] >= TIER_RANK.premium;

  return {
    tier: normalized,
    label: normalized === "premium_plus" ? "Premium Plus" : normalized === "premium" ? "Premium" : "Free",
    canSaveRadioChannels: Boolean(canSaveRadioChannels),
    canUseCustomSkins: typeof canUseRadioSkins === "boolean" ? canUseRadioSkins : tierAllowsRadioSkins,
    canUsePremiumPlusFeatures: TIER_RANK[normalized] >= TIER_RANK.premium_plus
  };
}

export async function loadRadioCapabilities() {
  const client = await getRadioSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;

  const user = userData?.user || null;
  if (!user) {
    return {
      client,
      user: null,
      capabilities: {
        tier: "signed_out",
        label: "Vendég",
        canSaveRadioChannels: false,
        canUseCustomSkins: false,
        canUsePremiumPlusFeatures: false
      }
    };
  }

  const { data: entitlementData, error: entitlementError } = await client.rpc("get_my_idesuss_entitlements");
  if (entitlementError) throw entitlementError;

  const capabilities = capabilityEnvelope(
    entitlementData?.tier,
    entitlementData?.can_save_radio_channels,
    entitlementData?.can_use_radio_skins
  );

  return { client, user, capabilities };
}

export async function loadSavedRadioChannels(client, userId) {
  if (!client || !userId) return [];
  const { data, error } = await client
    .from("saved_radio_channels")
    .select("channel_key,channel_name,stream_url,metadata,updated_at")
    .eq("user_id", userId)
    .order("channel_key", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveRadioChannel(client, userId, slot, station) {
  if (!client || !userId) throw new Error("AUTH_REQUIRED");
  if (!station?.id || !station?.name) throw new Error("INVALID_STATION");

  const channelKey = `preset_${slot}`;
  const payload = {
    user_id: userId,
    channel_key: channelKey,
    channel_name: station.name,
    stream_url: station.streamUrl || null,
    metadata: {
      station_id: station.id,
      info: station.info || "",
      stream_type: station.streamType || "auto",
      artwork: station.artwork || "",
      homepage: station.homepage || "",
      source_status: station.sourceStatus || (station.streamUrl ? "configured" : "unconfigured"),
      preset_slot: slot
    },
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("saved_radio_channels")
    .upsert(payload, { onConflict: "user_id,channel_key" })
    .select("channel_key,channel_name,stream_url,metadata,updated_at")
    .single();
  if (error) throw error;
  return data;
}

export function canAccessTier(currentTier, requiredTier) {
  return (TIER_RANK[currentTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 999);
}
