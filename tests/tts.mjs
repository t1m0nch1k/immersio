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

// 1. Production voices (api/tts.py): Hebrew and Kazakh are present.
const apiVoices = Object.fromEntries(
  [...api.matchAll(/"([a-z]{2})": os\.getenv\("[A-Z_]+", "([^"]+)"\)/g)].map((m) => [m[1], m[2]]),
);
check(apiVoices.he === 'he-IL-HilaNeural', 'api/tts.py uses he-IL-HilaNeural for Hebrew, got ' + apiVoices.he);
check(apiVoices.kk === 'kk-KZ-AigulNeural', 'api/tts.py uses kk-KZ-AigulNeural for Kazakh, got ' + apiVoices.kk);

// 2. Bashkir is deliberately absent from the production voices: no
// Edge / Azure / Google neural voice exists for it, so a fake voice here
// would mispronounce Bashkir-specific letters.
check(!('ba' in apiVoices), 'api/tts.py must not invent an Edge voice for Bashkir');
check(api.includes('Bashkir has no Edge-TTS voice'), 'api/tts.py fails fast for Bashkir with a clear message');

// 3. Local dev proxy (vite.config.ts) agrees with production on both voices.
const viteVoices = Object.fromEntries(
  [...vite.matchAll(/^\s*(he|kk): env\.EDGE_TTS_(?:HE|KK)_VOICE \|\| '([^']+)'/gm)].map((m) => [m[1], m[2]]),
);
check(viteVoices.he === apiVoices.he, 'vite.config.ts Hebrew voice matches api/tts.py');
check(viteVoices.kk === apiVoices.kk, 'vite.config.ts Kazakh voice matches api/tts.py');
check(vite.includes("lang === 'ba'"), 'vite.config.ts fails fast for Bashkir');

// 4. The new voices are documented in .env.example.
check(envExample.includes('EDGE_TTS_HE_VOICE=he-IL-HilaNeural'), '.env.example documents the Hebrew voice');
check(envExample.includes('EDGE_TTS_KK_VOICE=kk-KZ-AigulNeural'), '.env.example documents the Kazakh voice');
check(envExample.includes('No EDGE_TTS_BA_VOICE'), '.env.example explains why there is no Bashkir voice');

// 5. The client skips the server for Bashkir and falls back through the
// device voices: ba-RU, then Kazakh (closest Turkic neighbour), then Russian.
check(audio.includes("if (langCode === 'ba') return false;"), 'audioService skips the server proxy for Bashkir');
check(audio.includes("'kk-KZ', 'ru-RU'"), 'audioService falls back from Bashkir to kk-KZ then ru-RU');

console.log(`PASS: ${count} TTS voice cases — Hebrew and Kazakh on Edge-TTS, Bashkir honestly without a fake voice.`);
