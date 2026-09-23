import {
  getCurrentUser,
  getProfileAvatarImageUrl,
  loadMyProfile,
  subscribeToMyProfile
} from "../js/shared/profile-service.js";
import { subscribeAuthState } from "../js/shared/auth-service.js";

const SUPABASE_URL = "https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

let unsubscribeProfile = null;
let unsubscribeAuth = null;
let identityGeneration = 0;

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

function renderSignedOut() {
  const badge = ensureProfileBadge();
  badge.textContent = "👤 Bejelentkezés";
  badge.hidden = false;
  badge.onclick = () => {
    window.location.href = "/#login";
  };
}

async function renderSignedIn(client, profile, user) {
  const badge = ensureProfileBadge();
  const avatar = profile?.avatar_emoji || "👤";
  const label = profile?.nickname || user?.email || "Profil";
  const imageUrl = await getProfileAvatarImageUrl(client, profile).catch(() => "");

  if (imageUrl) {
    badge.replaceChildren();
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.style.width = "28px";
    image.style.height = "28px";
    image.style.borderRadius = "50%";
    image.style.objectFit = "cover";
    badge.append(image, document.createTextNode(` ${label}`));
  } else {
    badge.textContent = `${avatar} ${label}`;
  }

  badge.hidden = false;
  badge.onclick = () => {
    window.location.href = "/#profile";
  };
}

async function bindSignedInProfile(client, user, generation) {
  if (unsubscribeProfile) {
    unsubscribeProfile();
    unsubscribeProfile = null;
  }

  const profile = await loadMyProfile(client);
  if (generation !== identityGeneration) return;
  await renderSignedIn(client, profile, user);

  unsubscribeProfile = subscribeToMyProfile(client, user.id, (nextProfile) => {
    if (generation !== identityGeneration) return;
    renderSignedIn(client, nextProfile, user).catch((error) => console.error("Webapp avatar refresh failed", error));
  });
}

async function renderIdentity(client, user) {
  const generation = ++identityGeneration;

  if (!user) {
    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }
    renderSignedOut();
    return;
  }

  await bindSignedInProfile(client, user, generation);
}

export async function initWebappProfileBridge() {
  try {
    const client = await getClient();
    const user = await getCurrentUser(client);
    await renderIdentity(client, user);

    if (unsubscribeAuth) unsubscribeAuth();
    unsubscribeAuth = subscribeAuthState(client, async (identity) => {
      try {
        await renderIdentity(client, identity);
      } catch (error) {
        console.error("Webapp profile bridge auth refresh failed", error);
      }
    });
  } catch (error) {
    console.error("Webapp profile bridge init failed", error);
  }

  return () => {
    identityGeneration += 1;
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeAuth) unsubscribeAuth();
    unsubscribeProfile = null;
    unsubscribeAuth = null;
  };
}
