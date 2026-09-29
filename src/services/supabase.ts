import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase connection, and the switch that decides whether sync exists at
 * all.
 *
 * The app has to work with no configuration present — a fresh clone, a build
 * without secrets, a contributor who has not been given a project. So the client
 * is created lazily and `isSyncConfigured()` is the single question the rest of
 * the app asks; every caller treats "not configured" as "stay a guest", which is
 * the same code path the app already used before sync existed.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedConfig: SupabaseConfig | null | undefined;
let cachedClient: SupabaseClient | null = null;

/**
 * Reads the build-time environment defensively.
 *
 * Vite replaces `import.meta.env` with an object, but a plain esbuild bundle —
 * which is how the tests load this module — leaves the property off entirely.
 * Touching it unguarded throws a `TypeError` from inside the SDK's own
 * constructor, a long way from the missing variable that caused it. The optional
 * chain has to sit on `env` itself, not on the value behind it.
 */
const readEnv = (): SupabaseConfig | null => {
  const env: Partial<ImportMetaEnv> = import.meta.env ?? {};
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    // A malformed URL would otherwise throw from inside the SDK on first use,
    // far away from the thing that caused it.
    new URL(url);
  } catch {
    console.warn('VITE_SUPABASE_URL is not a valid URL; sync stays off.');
    return null;
  }
  return { url, anonKey };
};

export const getSupabaseConfig = (): SupabaseConfig | null => {
  if (cachedConfig === undefined) cachedConfig = readEnv();
  return cachedConfig;
};

/** False means the app runs as a guest and never touches the network. */
export const isSyncConfigured = (): boolean => getSupabaseConfig() !== null;

/**
 * Overrides the configuration, for tests. Passing `null` puts the module back in
 * its unconfigured state.
 */
export const setSupabaseConfigOverride = (config: SupabaseConfig | null): void => {
  cachedConfig = config;
  cachedClient = null;
};

export const getSupabase = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  if (!config) return null;
  if (!cachedClient) {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        // The OAuth redirect lands on a custom scheme in the APK and is handed
        // back by the shell, so the SDK must not go looking for it in the URL.
        // On the web build this still works: the browser comes back to the site
        // origin and `completeSignInFromLocation` is called by hand.
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
};

/** Test seam: drop the memoised client so the next call rebuilds it. */
export const resetSupabaseClient = (): void => {
  cachedClient = null;
};
