import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

const supabase = readFileSync('src/services/supabase.ts', 'utf-8');
const sync = readFileSync('src/services/syncService.ts', 'utf-8');
const auth = readFileSync('src/services/supabaseAuth.ts', 'utf-8');
const app = readFileSync('src/App.tsx', 'utf-8');
const vite = readFileSync('vite.config.ts', 'utf-8');

// 1. The Supabase SDK must not be a static import anywhere in the entry
// graph: it was over half of the entry chunk, and guests never use it.
// Type-only imports are erased at build time, so they are fine.
const staticSdkImport = /^\s*import\s+(?!\s*type\b)[^;]*from\s+['"]@supabase\/supabase-js['"]/m;
check(!staticSdkImport.test(supabase), 'supabase.ts must not statically import the SDK');
check(supabase.includes("import type { SupabaseClient } from '@supabase/supabase-js'"), 'supabase.ts keeps the type-only import');
check(/import\(['"]@supabase\/supabase-js['"]\)/.test(supabase), 'supabase.ts loads the SDK with a dynamic import');

// 2. getSupabase is async and caches the in-flight import.
check(/export const getSupabase = \(\): Promise<SupabaseClient \| null>/.test(supabase), 'getSupabase returns a promise');
check(supabase.includes('clientPromise'), 'getSupabase shares one in-flight import');

// 3. The sync engine must not build its backend in the constructor: that
// pulled the SDK into the entry chunk for every guest. It is built lazily,
// only once a signed-in session attaches.
check(!sync.includes('createSupabaseBackend(getSupabase()!)'), 'syncService must not create the backend synchronously');
check(sync.includes('private ensureBackend'), 'syncService has a lazy ensureBackend');
check(sync.includes('await this.ensureBackend()'), 'attach() ensures the backend before reconciling');
check(sync.includes('if (!userId) {'), 'attach() still has a guest path that does not load the SDK');

// 4. Sign-in awaits the client instead of assuming it is already loaded.
check(auth.includes('const client = await getSupabase();'), 'signInWithGoogle awaits getSupabase()');

// 5. App awaits the client at both call sites.
check((app.match(/await getSupabase\(\)/g) ?? []).length >= 2, 'App.tsx awaits getSupabase() at start-up and at sign-out');

// 6. The rarely shown modals load on demand, inside Suspense.
check(app.includes("React.lazy(() => import('./components/AuthModal')"), 'AuthModal is lazy-loaded');
check(app.includes("React.lazy(() => import('./components/UpdateModal')"), 'UpdateModal is lazy-loaded');
check(!/^import \{ AuthModal \}/m.test(app) && !/^import \{ UpdateModal \}/m.test(app), 'AuthModal/UpdateModal are no longer static imports');

// 7. The build splits the slow-changing vendor code out of the entry chunk,
// so repeat visits reuse the cached vendor chunks across app deploys.
check(vite.includes('manualChunks'), 'vite.config.ts defines manualChunks');
check(vite.includes("'vendor-react': ['react', 'react-dom']"), 'manualChunks splits react/react-dom');
check(vite.includes("'vendor-supabase': ['@supabase/supabase-js']"), 'manualChunks splits the Supabase SDK');

console.log(`PASS: ${count} bundle-splitting cases — Supabase lazy, vendor chunks split, modals lazy.`);
