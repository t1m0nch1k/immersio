import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export * from './src/services/speechService';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

// 1. Text cleaning
check(api.cleanSpeechText('Hello, World!') === 'hello world', 'clean text removes punctuation');
check(api.cleanSpeechText('«Dobré ráno!»') === 'dobré ráno', 'clean text handles quotes and diacritics');

// 2. Levenshtein distance
check(api.levenshteinDistance('cat', 'cat') === 0, 'distance for equal strings is 0');
check(api.levenshteinDistance('cat', 'bat') === 1, 'distance with 1 substitution');
check(api.levenshteinDistance('mesto', 'meso') === 1, 'distance with 1 omission');
check(api.levenshteinDistance('hotel', 'hotle') === 2, 'distance with transposition');

// 3. Pronunciation evaluation
const exact = api.evaluatePronunciation('We arrived in the city', 'We arrived in the city', 'en');
check(exact.score === 100, 'exact sentence matches 100%');
check(exact.words.every((w) => w.matched), 'all words matched for exact match');

const slightTypo = api.evaluatePronunciation('We arived in the city', 'We arrived in the city', 'en');
check(slightTypo.score === 100, 'small typo within threshold still matches');

const halfWrong = api.evaluatePronunciation('We left the mountain', 'We arrived in the mountain', 'en');
check(halfWrong.score > 0 && halfWrong.score < 100, 'partial match gives proportional score');

const emptyExpected = api.evaluatePronunciation('test', '', 'en');
check(emptyExpected.score === 100, 'empty expected returns 100');

console.log(`PASS: ${count} speech recognition service test cases.`);
