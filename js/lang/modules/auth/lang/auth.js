// js/auth.js
// Közös auth-réteg webapphoz és későbbi natív apphoz

let currentUser = null;
const listeners = new Set();

export function getAuthState() {
  return {
    isLoggedIn: !!currentUser,
    user: currentUser,
  };
}

export function subscribeAuthChange(callback) {
  listeners.add(callback);
  callback(getAuthState());

  return () => {
    listeners.delete(callback);
  };
}

function notifyAuthChange() {
  const state = getAuthState();
  listeners.forEach((callback) => callback(state));
}

export async function initAuth({ supabaseClient } = {}) {
  if (!supabaseClient) {
    console.warn("Auth init skipped: missing supabaseClient");
    return;
  }

  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;
  notifyAuthChange();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    notifyAuthChange();
  });
}

export async function login({ supabaseClient, email, password }) {
  if (!supabaseClient) throw new Error("Hiányzó Supabase kliens.");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  currentUser = data?.user || null;
  notifyAuthChange();

  return currentUser;
}

export async function register({ supabaseClient, email, password }) {
  if (!supabaseClient) throw new Error("Hiányzó Supabase kliens.");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function logout({ supabaseClient }) {
  if (!supabaseClient) throw new Error("Hiányzó Supabase kliens.");

  await supabaseClient.auth.signOut();

  Object.keys(localStorage)
    .filter((key) => key.includes("supabase") || key.includes("sb-"))
    .forEach((key) => localStorage.removeItem(key));

  Object.keys(sessionStorage)
    .filter((key) => key.includes("supabase") || key.includes("sb-"))
    .forEach((key) => sessionStorage.removeItem(key));

  currentUser = null;
  notifyAuthChange();
}