import { getSharedSupabaseClient } from "../js/shared/supabase-client.js";
import { RADIO_CLIENT_POLICY } from "./radio-policy.js";

const PRESET_POLICY = RADIO_CLIENT_POLICY.preset;
const TIER_RANK = Object.fromEntries(
  PRESET_POLICY.tierOrder.map((tier, index) => [tier, index])
);
const DEFAULT_PRESET_LIMITS = PRESET_POLICY.maximumSlotsByTier;

export async function getRadioSupabaseClient() {
  return getSharedSupabaseClient();
}

function capabilityEnvelope(tier, canSaveRadioChannels, canUseRadioSkins, maxRadioPresets) {
  const normalized = ["registered", "premium", "premium_plus"].includes(tier) ? tier : "registered";
  const tierAllowsRadioSkins = TIER_RANK[normalized] >= TIER_RANK.premium;
  const parsedLimit = Number(maxRadioPresets);
  const fallbackLimit = DEFAULT_PRESET_LIMITS[normalized] ?? 0;
  return {
    tier: normalized,
    label: normalized === "premium_plus" ? "Premium Plus" : normalized === "premium" ? "Premium" : "Free",
    canSaveRadioChannels: Boolean(canSaveRadioChannels),
    maxRadioPresets: Number.isInteger(parsedLimit) && parsedLimit >= 0
      ? Math.min(fallbackLimit, parsedLimit)
      : fallbackLimit,
    canUseCustomSkins: typeof canUseRadioSkins === "boolean" ? canUseRadioSkins : tierAllowsRadioSkins,
    canUsePremiumPlusFeatures: TIER_RANK[normalized] >= TIER_RANK.premium_plus,
    canUseRadioDiagnostics: false
  };
}

export async function loadRadioCapabilities() {
  const client = await getRadioSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData?.user || null;
  if (!user) {
    return {
      client, user: null,
      capabilities: {
        tier: "signed_out", label: "Vendég", canSaveRadioChannels: false,
        maxRadioPresets: 0, canUseCustomSkins: false, canUsePremiumPlusFeatures: false,
        canUseRadioDiagnostics: false
      }
    };
  }

  const { data: entitlementData, error: entitlementError } = await client.rpc(
    PRESET_POLICY.entitlementsRpc
  );
  if (entitlementError) throw entitlementError;

  const capabilities = capabilityEnvelope(
    entitlementData?.tier,
    entitlementData?.can_save_radio_channels,
    entitlementData?.can_use_radio_skins,
    entitlementData?.max_radio_presets
  );

  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("Radio admin role lookup failed", profileError);
  }

  capabilities.canUseRadioDiagnostics = ["admin", "owner"].includes(profileData?.role);
  return { client, user, capabilities };
}

export async function loadSavedRadioChannels(client, userId) {
  if (!client || !userId) return [];
  const { data, error } = await client
    .from(PRESET_POLICY.savedChannelsTable)
    .select("channel_key,channel_name,stream_url,metadata,updated_at")
    .eq("user_id", userId)
    .order("channel_key", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveRadioChannel(client, userId, slot, station) {
  if (!client || !userId) throw new Error("AUTH_REQUIRED");
  if (!station?.id || !station?.name) throw new Error("INVALID_STATION");
  const channelKey = `${PRESET_POLICY.savedChannelKeyPrefix}${slot}`;
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
    .from(PRESET_POLICY.savedChannelsTable)
    .upsert(payload, { onConflict: "user_id,channel_key" })
    .select("channel_key,channel_name,stream_url,metadata,updated_at")
    .single();
  if (error) throw error;
  return data;
}
