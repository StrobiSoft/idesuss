import { getSharedSupabaseClient } from "./shared/supabase-client.js";

const LAST_VISIT_KEY = "idesuss_last_visit";
const VISITOR_KEY = "idesuss_visitor_key";
const VISIT_COOLDOWN_MS = 30 * 60 * 1000;

function getVisitorKey() {
  let key = localStorage.getItem(VISITOR_KEY);
  if (!key) {
    key = "visitor_" + crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, key);
  }
  return key;
}

function renderTotalVisits(value) {
  const totalEl = document.getElementById("totalVisitsCounter");
  if (!totalEl) return;

  totalEl.dataset.count = String(value ?? 0);
  const template =
    window.idesussHomeTranslations?.totalVisitsCounter ||
    "🌍 {count} total visits";
  totalEl.textContent = template.replace("{count}", totalEl.dataset.count);
}

async function registerVisitSession(client) {
  const { error: sessionError } = await client
    .from("site_sessions")
    .insert({
      visitor_key: getVisitorKey(),
      interaction_count: 0,
      is_active: true
    });

  if (sessionError) {
    console.error("Session insert error:", sessionError);
    return;
  }

  const { data, error } = await client.rpc("register_site_visit");
  if (error) {
    console.error("Counter error:", error);
    return;
  }

  renderTotalVisits(data);
}

async function loadTotalVisits(client) {
  const { data, error } = await client
    .from("site_stats")
    .select("value")
    .eq("name", "total_visits")
    .single();

  if (error) {
    console.error("Total visits load error:", error);
    return;
  }

  renderTotalVisits(data?.value ?? 0);
}

export async function initSiteStats() {
  const client = await getSharedSupabaseClient();
  await loadTotalVisits(client);

  const now = Date.now();
  const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
  if (lastVisit && now - lastVisit <= VISIT_COOLDOWN_MS) return;

  localStorage.setItem(LAST_VISIT_KEY, String(now));
  await registerVisitSession(client);
}

initSiteStats().catch((error) => {
  console.error("Site stats init failed", error);
});
