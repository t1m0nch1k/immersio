import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabase, isSyncConfigured } from './supabase';

/**
 * Google sign-in.
 *
 * Google will not render its consent page inside an embedded WebView — it
 * answers with `disallowed_useragent` — so in the APK the flow has to leave the
 * WebView. The shell opens the URL in a Custom Tab and hands the redirect back
 * through a deep link; the bundle picks it up here.
 *
 * The whole flow is `signInWithOAuth` → open the URL somewhere Google tolerates
 * → `exchangeCodeForSession`. The PKCE verifier never leaves the device: the SDK
 * stashed it when it built the URL and consumes it during the exchange, so a
 * stolen authorization code is useless on its own.
 */


/** Must match `authScheme`/`authHost` in the Android manifest. */
export const ANDROID_REDIRECT_URI = 'ru.pogruzhenie.app://auth-callback';

/** On the web the redirect comes back to the page itself. */
export const webRedirectUri = (): string =>
  `${window.location.origin}${window.location.pathname}`;

export type AuthFailure = 'no-url' | 'exchange-failed';

export class AuthError extends Error {
  constructor(readonly reason: AuthFailure, message?: string) {
    super(message ?? reason);
    this.name = 'AuthError';
  }
}

const isInAppShell = (): boolean => typeof window.AndroidHost?.openAuth === 'function';

/**
 * Opens the consent screen.
 *
 * Inside the APK this goes to a Custom Tab via the bridge. On the web it is a
 * normal top-level navigation, which the browser is happy to do and which comes
 * back to the site origin.
 */
const openConsentScreen = (url: string): void => {
  if (isInAppShell()) {
    window.AndroidHost!.openAuth!(url);
    return;
  }
  window.location.assign(url);
};

/** True when the URL is an OAuth redirect carrying an outcome. */
export const isAuthRedirect = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has('code') || parsed.searchParams.has('error');
  } catch {
    return false;
  }
};

const redirectUri = (): string => (isInAppShell() ? ANDROID_REDIRECT_URI : webRedirectUri());

/**
 * Builds the consent URL without navigating anywhere.
 *
 * Split from `signInWithGoogle` so the shell can register a result handler
 * before the redirect is possible: on a cold start the redirect arrives while
 * the bundle is still loading, and a handler installed afterwards would never
 * see it.
 */
export const prepareGoogleSignIn = async (client: SupabaseClient): Promise<string> => {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri(), skipBrowserRedirect: true },
  });
  if (error) throw new AuthError('no-url', error.message);
  if (!data.url) throw new AuthError('no-url', 'Supabase returned no authorization URL');
  return data.url;
};

/** The URL the shell should call this with. Installed once, at module load. */
export const onAuthRedirect = (handler: (url: string) => void): void => {
  window.__pogruzhenieAuthResult = handler;
};

export type AuthStart =
  /** The consent screen is opening. The result arrives via the redirect handler. */
  | { readonly started: true }
  /** Sync is not configured, so there is nothing to sign in to. */
  | { readonly started: false; readonly reason: 'not-configured' | 'no-client' }
  /** Supabase would not produce an authorization URL. */
  | { readonly started: false; readonly reason: 'no-url'; readonly message: string };

/**
 * Opens the Google consent screen.
 *
 * Reports only whether the flow *started*. It cannot report success: the page
 * is either replaced (web) or left behind under a Custom Tab (APK), so the
 * outcome arrives later through the handler registered by `onAuthRedirect`.
 */
export const signInWithGoogle = async (): Promise<AuthStart> => {
  if (!isSyncConfigured()) return { started: false, reason: 'not-configured' };
  const client = getSupabase();
  if (!client) return { started: false, reason: 'no-client' };

  try {
    openConsentScreen(await prepareGoogleSignIn(client));
    return { started: true };
  } catch (error) {
    return {
      started: false,
      reason: 'no-url',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Finishes a sign-in from a redirect URL.
 *
 * Returns the user on success. A redirect carrying `error` means the user
 * declined or the provider refused, which is a normal outcome rather than a
 * failure worth shouting about.
 */
export const completeGoogleSignIn = async (client: SupabaseClient, url: string): Promise<User> => {
  const code = new URL(url).searchParams.get('code');
  if (!code) {
    throw new AuthError('exchange-failed', new URL(url).searchParams.get('error') ?? 'no code in redirect');
  }
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw new AuthError('exchange-failed', error.message);
  if (!data.user) throw new AuthError('exchange-failed', 'no user in the exchanged session');
  return data.user;
};

export const signOut = async (client: SupabaseClient): Promise<void> => {
  const { error } = await client.auth.signOut();
  // A failed sign-out leaves a live refresh token on the device, so it is worth
  // reporting; the caller still clears local state because the user asked to.
  if (error) console.warn('Supabase sign-out failed:', error.message);
};

export const currentSession = async (client: SupabaseClient): Promise<Session | null> => {
  const { data } = await client.auth.getSession();
  return data.session ?? null;
};
