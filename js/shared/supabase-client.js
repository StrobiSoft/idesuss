const SUPABASE_URL = "https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";

let loaderPromise = null;

function loadSupabaseLibrary() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
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

  return loaderPromise;
}

export async function getSharedSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  const supabase = await loadSupabaseLibrary();
  if (!supabase?.createClient) throw new Error("Supabase library failed to load.");
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return window.supabaseClient;
}
