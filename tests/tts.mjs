import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

const api = readFileSync('api/tts.py', 'utf-8');
const vite = readFileSync('vite.config.ts', 'utf-8');
const envExample = readFileSync('.env.example', 'utf-8');
const audio = readFileSync('src/services/audioService.ts', 'utf-8');
const types = readFileSync('src/types/index.ts', 'utf-8');

// 1. Production voices (api/tts.py): Hebrew and Kazakh are present.
const apiVoices = Object.fromEntries(
  [...api.matchAll(/"([a-z]{2})": os\.getenv\("[A-Z_]+", "([^"]+)"\)/g)].map((m) => [m[1], m[2]]),
);
check(apiVoices.he === 'he-IL-HilaNeural', 'api/tts.py uses he-IL-HilaNeural for Hebrew, got ' + apiVoices.he);
check(apiVoices.kk === 'kk-KZ-AigulNeural', 'api/tts.py uses kk-KZ-AigulNeural for Kazakh, got ' + apiVoices.kk);

// 2. Bashkir is removed, not faked: no 'ba' code anywhere in the language
// type, the client, or the server — a request for it hits the generic
// "Unsupported language" path, never a special case.
check(!types.includes("'ba'"), 'LanguageCode must not include Bashkir');
check(!audio.includes("'ba'"), 'audioService must not reference Bashkir');
check(!api.includes('Bashkir'), 'api/tts.py must not reference Bashkir');

// 3. Local dev proxy (vite.config.ts) agrees with production on both voices.
const viteVoices = Object.fromEntries(
  [...vite.matchAll(/^\s*(he|kk): env\.EDGE_TTS_(?:HE|KK)_VOICE \|\| '([^']+)'/gm)].map((m) => [m[1], m[2]]),
);
check(viteVoices.he === apiVoices.he, 'vite.config.ts Hebrew voice matches api/tts.py');
check(viteVoices.kk === apiVoices.kk, 'vite.config.ts Kazakh voice matches api/tts.py');

// 4. The new voices are documented in .env.example.
check(envExample.includes('EDGE_TTS_HE_VOICE=he-IL-HilaNeural'), '.env.example documents the Hebrew voice');
check(envExample.includes('EDGE_TTS_KK_VOICE=kk-KZ-AigulNeural'), '.env.example documents the Kazakh voice');

// 5. In the Android shell the app is served from the local appassets origin,
// where a relative /api/tts does not exist and the device has no Kazakh
// voice — so the client must use the absolute Vercel proxy there.
check(audio.includes("const TTS_PROXY_BASE = 'https://immersio-five.vercel.app'"), 'audioService points the Android shell at the live Vercel proxy');
check(audio.includes("isAndroidShell() ? TTS_PROXY_BASE : ''"), 'audioService uses the absolute proxy only in the Android shell');

console.log(`PASS: ${count} TTS voice cases — Hebrew and Kazakh on Edge-TTS, Kazakh reachable from Android, Bashkir removed.`);
