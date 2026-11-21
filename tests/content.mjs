import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

// Guards the public copy (README + landing) against the code: the language
// count drifted to 8 while the app already had 10, and the grammar totals
// are sums over all languages, so adding a language silently breaks them.
let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

// 1. The app's own language lists agree: 10 codes in both places.
const storage = readFileSync('src/services/storageService.ts', 'utf-8');
const supported = storage.match(/SUPPORTED_LANGUAGES[^=]*=\s*\[([^\]]*)\]/)?.[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean) ?? [];
const languages = readFileSync('src/data/languages.ts', 'utf-8');
const defined = [...languages.matchAll(/^\s{2}(\w{2}): \{/gm)].map((m) => m[1]);
check(supported.length === 10, `SUPPORTED_LANGUAGES must list 10 languages, got ${supported.length}`);
check(new Set(supported).size === supported.length, 'SUPPORTED_LANGUAGES must not repeat a code');
check(JSON.stringify([...supported].sort()) === JSON.stringify([...defined].sort()), 'LANGUAGES keys must match SUPPORTED_LANGUAGES');
const names = [...languages.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
check(names.length === 10, `LANGUAGES must name 10 languages, got ${names.length}`);

// 2. Grammar totals are sums over every language, computed from the data.
const bundle = await build({
  stdin: {
    contents: "export * from './src/data/grammar';",
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const topics = Object.values(api.GRAMMAR).reduce((sum, lessons) => sum + lessons.length, 0);
const examples = Object.values(api.GRAMMAR).reduce(
  (sum, lessons) => sum + lessons.reduce((s, lesson) => s + lesson.examples.length, 0), 0,
);
check(topics > 0 && examples > 0, 'grammar data must load');

// 3. README names every language and states the real dictionary size.
const readme = readFileSync('README.md', 'utf-8');
for (const name of names) check(readme.includes(name), `README must name ${name}`);
check(readme.includes('10 языков'), 'README must say 10 languages');
check(readme.includes('словарь (306 слов)'), 'README architecture must say 306 words, not ~3500');
check(!readme.includes('~3500'), 'README must not keep the stale ~3500 word count');
check(!/восемь языков/i.test(readme), 'README must not say eight languages');

// 4. The landing shows the same numbers and the same language list.
const landing = readFileSync('landing/index.html', 'utf-8');
for (const name of names) check(landing.includes(`<b>${name}</b>`), `landing must list ${name}`);
check(landing.includes('<b>10</b><span>языков</span>'), 'landing stats must say 10 languages');
check(landing.includes(`<b>${topics}</b><span>тем грамматики</span>`), `landing stats must say ${topics} grammar topics`);
check(landing.includes(`${topics} тем и ${examples} примеров`), `landing grammar card must say ${topics} topics and ${examples} examples`);
check(landing.includes('Десять языков'), 'landing languages heading must say ten');
check(!/восемь языков/i.test(landing), 'landing must not say eight languages');
check(!/Восемь языков/.test(landing), 'landing heading must not say eight languages');

console.log(`PASS: ${count} content cases — README and landing match the 10-language code, ${topics} grammar topics, ${examples} examples.`);
