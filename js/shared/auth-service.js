function requireClient(supabaseClient) {
  if (!supabaseClient) throw new Error('Missing Supabase client.');
  return supabaseClient;
}

function toIdentity(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || ''
  };
}

export async function currentIdentity(supabaseClient) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return toIdentity(data?.user || null);
}

export async function signIn(supabaseClient, { email, password }) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return toIdentity(data?.user || null);
}

export async function signUp(supabaseClient, { email, password }) {
  const client = requireClient(supabaseClient);
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return toIdentity(data?.user || null);
}

export async function signOut(supabaseClient) {
  const client = requireClient(supabaseClient);
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function subscribeAuthState(supabaseClient, onChange) {
  const client = requireClient(supabaseClient);
  if (typeof onChange !== 'function') return () => {};

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    onChange(toIdentity(session?.user || null));
  });

  return () => {
    data?.subscription?.unsubscribe?.();
  };
}
