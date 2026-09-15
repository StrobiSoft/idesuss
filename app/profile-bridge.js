import {
  getCurrentUser,
  loadMyProfile,
  subscribeToMyProfile
} from "../js/shared/profile-service.js";

const SUPABASE_URL = "https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

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

async function getClient() {
  if (window.supabaseClient) return window.supabaseClient;
  const supabase = await loadSupabaseLibrary();
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return window.supabaseClient;
}

function ensureProfileBadge() {
  let badge = document.getElementById("webappProfileBadge");
  if (badge) return badge;

  badge = document.createElement("button");
  badge.id = "webappProfileBadge";
  badge.type = "button";
  badge.className = "install-btn";
  badge.hidden = true;
  badge.setAttribute("aria-label", "Profil");

  const host = document.querySelector(".top-actions");
  if (host) host.prepend(badge);
  return badge;
}

function renderBadge(profile, user) {
  const badge = ensureProfileBadge();
  const avatar = profile?.avatar_emoji || "👤";
  const label = profile?.nickname || user?.email || "Profil";
  badge.textContent = `${avatar} ${label}`;
  badge.hidden = false;
  badge.onclick = () => {
    window.location.href = "/#profile";
  };
}

export async function initWebappProfileBridge() {
  try {
    const client = await getClient();
    const user = await getCurrentUser(client);
    const badge = ensureProfileBadge();

    if (!user) {
      badge.textContent = "👤 Bejelentkezés";
      badge.hidden = false;
      badge.onclick = () => {
        window.location.href = "/#login";
      };
      return;
    }

    const profile = await loadMyProfile(client);
    renderBadge(profile, user);

    subscribeToMyProfile(client, user.id, (nextProfile) => {
      renderBadge(nextProfile, user);
    });
  } catch (error) {
    console.error("Webapp profile bridge init failed", error);
  }
}

// The current /app page is still a self-contained GEN1 consumer.
// Wire this module into app/index.html only after the branch is checked,
// keeping the existing video flow untouched.
