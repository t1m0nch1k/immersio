import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

const html = readFileSync('index.html', 'utf-8');
const vite = readFileSync('vite.config.ts', 'utf-8');
const pwa = readFileSync('src/services/pwa.ts', 'utf-8');
const main = readFileSync('src/main.tsx', 'utf-8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf-8'));

// 1. The app page links the manifest and describes itself for search and
// social sharing (the landing had this; the app page did not).
check(html.includes('<link rel="manifest" href="/manifest.webmanifest"'), 'index.html links the PWA manifest');
check(html.includes('<link rel="apple-touch-icon" href="/icons/icon.svg"'), 'index.html has an apple-touch-icon');
check(/<meta name="description" content="[^"]{40,}"/.test(html), 'index.html has a meta description');
check(html.includes('<meta name="theme-color" content="#0f3d2e"'), 'index.html has a theme-color');
check(html.includes('<meta property="og:title"'), 'index.html has og:title');
check(html.includes('<meta property="og:description"'), 'index.html has og:description');
check(html.includes('<meta property="og:type" content="website"'), 'index.html has og:type');
check(html.includes('<meta property="og:image" content="/icons/icon.svg"'), 'index.html has og:image');

// 2. The manifest is valid and installable: names, standalone display, and
// a scalable SVG icon plus a maskable one. SVG is deliberate: Chromium
// accepts it for installation (sizes "any"), and the push connector used for
// this repo cannot carry binary PNGs.
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf-8'));
check(manifest.name === 'Погружение — учи язык постепенно', 'manifest name');
check(manifest.short_name === 'Погружение', 'manifest short_name');
check(manifest.start_url === '/' && manifest.scope === '/', 'manifest start_url and scope are /');
check(manifest.display === 'standalone', 'manifest display is standalone');
check(manifest.theme_color === '#0f3d2e' && manifest.background_color === '#f5f1e6', 'manifest theme and background colors match the app palette');
const sizes = new Set(manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose ?? 'any'}`));
check(sizes.has('any:any'), 'manifest has a scalable icon');
check(sizes.has('any:maskable'), 'manifest has a maskable icon');
check(manifest.icons.every((icon) => icon.type === 'image/svg+xml'), 'manifest icons are SVG');

for (const icon of manifest.icons) {
  const path = `public${icon.src}`;
  check(existsSync(path), `manifest icon exists: ${path}`);
  const svg = readFileSync(path, 'utf-8');
  check(svg.trimStart().startsWith('<svg'), `${path} is an SVG document`);
  check(svg.includes('viewBox="0 0 512 512"'), `${path} has a square 512 viewBox`);
}

// 3. The build emits a service worker that precaches the shell.
check(vite.includes("name: 'pwa-service-worker'"), 'vite.config.ts has the pwa-service-worker plugin');
check(vite.includes('generateBundle'), 'the plugin emits sw.js in generateBundle');
check(vite.includes('skipWaiting'), 'the worker activates a new version promptly');
check(vite.includes('clients.claim'), 'the worker takes control of open pages');
check(vite.includes("request.mode === 'navigate'"), 'the worker handles navigation requests');
check(vite.includes('fonts.googleapis.com'), 'the worker caches Google Fonts');
check(vite.includes('collectPublic'), 'the precache list also covers public/ files (manifest, icons)');

// 4. Registration is web-only: the Android shell has local assets and its
// own OTA updates, and a worker there would serve the old bundle after one.
check(pwa.includes('window.AndroidHost'), 'registration skips the Android shell');
check(pwa.includes("window.location.protocol !== 'http:'"), 'registration requires http(s)');
check(pwa.includes('import.meta.env.DEV'), 'registration is skipped in dev');
check(pwa.includes('.catch('), 'a failed registration is swallowed, not fatal');
check(pwa.includes('import.meta.env.BASE_URL'), 'registration respects the build base');
check(main.includes('registerServiceWorker'), 'main.tsx registers the service worker');

// 5. The CSP lets the worker fetch the fonts it caches (a worker fetch is
// governed by connect-src of the worker script's own policy).
const csp = vercel.headers
  .flatMap((entry) => entry.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
check(csp.includes('https://fonts.googleapis.com') && csp.includes('https://fonts.gstatic.com'), 'CSP connect-src allows the font hosts the worker caches');

console.log(`PASS: ${count} PWA cases — manifest, icons, meta/OG, service worker, registration guards.`);
