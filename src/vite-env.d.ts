/// <reference types="vite/client" />

/**
 * Build-time configuration.
 *
 * Both values are compiled into the bundle, which for the Android build means
 * they are baked into the APK: changing the project or rotating the anon key
 * requires a new release. That is accepted because the anon key is not a
 * secret — Row Level Security is the security boundary, and a client that
 * ships no key at all can never be trusted anyway.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
