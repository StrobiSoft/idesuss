// Compatibility facade for the historical Home auth module.
// The canonical implementation now lives in js/shared/auth-service.js.

import {
  currentIdentity,
  signIn,
  signOut,
  signUp,
  subscribeAuthState
} from "../../../../shared/auth-service.js";

let currentUser = null;
const listeners = new Set();
let unsubscribeBackend = null;

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

  currentUser = await currentIdentity(supabaseClient);
  notifyAuthChange();

  unsubscribeBackend?.();
  unsubscribeBackend = subscribeAuthState(supabaseClient, (identity) => {
    currentUser = identity;
    notifyAuthChange();
  });
}

export async function login({ supabaseClient, email, password }) {
  currentUser = await signIn(supabaseClient, { email, password });
  notifyAuthChange();
  return currentUser;
}

export async function register({ supabaseClient, email, password }) {
  const identity = await signUp(supabaseClient, { email, password });
  currentUser = await currentIdentity(supabaseClient);
  notifyAuthChange();
  return { user: identity };
}

export async function logout({ supabaseClient }) {
  await signOut(supabaseClient);
  currentUser = null;
  notifyAuthChange();
}
