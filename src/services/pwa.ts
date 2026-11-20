/**
 * Registers the offline service worker — web only.
 *
 * The worker precaches the app shell (see the `pwa-service-worker` plugin in
 * `vite.config.ts`), so the reader, dictionary and practice keep working with
 * no connection. Registration is deliberately skipped in three cases:
 *
 * - the Android shell (`window.AndroidHost`): its assets are local files and
 *   its own OTA system swaps them — a worker precaching the shell would serve
 *   the old bundle after an update;
 * - non-http(s) pages: a worker cannot register there;
 * - `vite dev`: the dev server has no built `sw.js` to register.
 *
 * Best-effort by design: if registration fails the app still works online,
 * it just does not go offline.
 */
export const registerServiceWorker = (): void => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  if (typeof window.AndroidHost !== 'undefined') return;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline support is best-effort; a failed registration changes nothing.
    });
  });
};
