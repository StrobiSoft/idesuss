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

function normalizeTier(value) {
  return ["registered", "premium", "premium_plus"].includes(value) ? value : "registered";
}

function isPremiumPlusActive(profile) {
  if (profile?.tier !== "premium_plus") return false;
  if (!profile?.subscription_expires_at) return false;
  const expiry = Date.parse(profile.subscription_expires_at);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function deriveRadioCapabilities(profile, signedIn) {
  if (!signedIn) {
    return {
      tier: "signed_out",
      label: "Vendég",
      canSaveRadioChannels: false,
      canUseCustomSkins: false,
      canUsePremiumPlusFeatures: false
    };
  }

  let tier = normalizeTier(profile?.tier);
  if (tier === "premium_plus" && !isPremiumPlusActive(profile)) tier = "registered";

  const rank = TIER_RANK[tier] ?? 1;
  return {
    tier,
    label: tier === "premium_plus" ? "Premium Plus" : tier === "premium" ? "Premium" : "Free",
    canSaveRadioChannels: rank >= TIER_RANK.premium,
    canUseCustomSkins: rank >= TIER_RANK.premium,
    canUsePremiumPlusFeatures: rank >= TIER_RANK.premium_plus
  };
}

export async function loadRadioCapabilities() {
  const client = await getRadioSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;

  const user = userData?.user || null;
  if (!user) return { client, user: null, profile: null, capabilities: deriveRadioCapabilities(null, false) };

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,nickname,avatar_emoji,tier,subscription_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    client,
    user,
    profile,
    capabilities: deriveRadioCapabilities(profile, true)
  };
}

export function canAccessTier(currentTier, requiredTier) {
  return (TIER_RANK[currentTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 999);
}
