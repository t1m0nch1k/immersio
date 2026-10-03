import assert from 'node:assert/strict';
import { build } from 'esbuild';

globalThis.window = {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/data/words';",
      "export * from './src/data/lessons';",
      "export * from './src/data/lessonLinkedWords';",
      "export * from './src/services/immersionService';",
    ].join(' '),
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const WORDS = api.WORDS;
const LESSONS = api.LESSONS;
const GRAMMAR_IDS = new Set(Object.keys(api.GRAMMAR_WORD_MAP ?? {}));

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count += 1;
};

// Walk every lesson text once and record which dictionary entries the lessons
// actually reach.
const idsUsedByLessons = new Map();
const unlinkedForms = new Map();
let wordTokens = 0;
let linkedTokens = 0;
let sentenceIndex = 0;

for (const lesson of LESSONS) {
  for (const piece of lesson.sent) {
    for (const token of api.tokenizeLessonSentence(piece, sentenceIndex, 'sk')) {
      sentenceIndex += 1;
      if (token.kind !== 'word') continue;
      wordTokens += 1;
      if (token.wordId) {
        linkedTokens += 1;
        idsUsedByLessons.set(token.wordId, (idsUsedByLessons.get(token.wordId) ?? 0) + 1);
      } else {
        const form = String(token.text).trim().toLowerCase();
        unlinkedForms.set(form, (unlinkedForms.get(form) ?? 0) + 1);
      }
    }
  }
}

// === 1. Every dictionary entry is met in a lesson ===
//
// This is the direction that used to be hopeless: 3228 of 3533 entries were
// never referenced by any lesson, 3227 of them a generated frequency corpus with
// broken translations. The generated mass is now filtered down to the entries
// the curriculum resolves, so nothing is left advertising words the learner can
// never meet while reading.
const unusedEntries = WORDS.filter((word) => !idsUsedByLessons.has(word.id));
assert.deepEqual(
  unusedEntries.map((word) => `${word.id}[${word.ru}]`),
  [],
  'every dictionary entry must be used in at least one lesson'
);
check(true, 'no dead dictionary entries');

// Guard against the bulk creeping back in: the dictionary is meant to stay small
// and hand-maintained rather than growing with the frequency corpus.
assert.ok(
  WORDS.length < 400,
  'the dictionary must not silently regrow towards the generated corpus size, got ' + WORDS.length
);
check(true, 'the dictionary stays a curated size');

// === 2. The allowlist of generated entries matches what the lessons need ===
//
// `LESSON_LINKED_GENERATED_IDS` is hand-maintained because the filter cannot be
// computed at runtime without a circular import. If a lesson starts resolving a
// generated entry that is not listed, that entry is dropped from the dictionary
// and the word silently loses its translation, so this must fail loudly.
const generatedUsed = [...idsUsedByLessons.keys()].filter((id) => /^v\d+$/.test(id)).sort();
const generatedListed = [...api.LESSON_LINKED_GENERATED_IDS].sort();
assert.deepEqual(
  generatedUsed,
  generatedListed,
  'the generated-entry allowlist must equal the set the lessons resolve to; ' +
  `missing from the list: ${generatedUsed.filter((id) => !generatedListed.includes(id)).join(' ') || 'none'}; ` +
  `listed but unused: ${generatedListed.filter((id) => !generatedUsed.includes(id)).join(' ') || 'none'}`
);
check(true, 'the generated-entry allowlist is in sync with the lessons');

// Every listed id must really exist, or the list rots silently.
const knownIds = new Set(WORDS.map((word) => word.id));
const unknownListed = generatedListed.filter((id) => !knownIds.has(id));
assert.deepEqual(unknownListed, [], 'every allowlisted id must exist in the dictionary');
check(true, 'the allowlist contains no unknown ids');

// === 3. Every resolved id is backed by a real entry ===
//
// A token can resolve to a grammar word (`g_*`), which lives in its own table,
// or to a dictionary entry. Anything else is a dangling reference: the reader
// would try to translate a word that does not exist.
const dangling = [...idsUsedByLessons.keys()].filter((id) => !knownIds.has(id) && !GRAMMAR_IDS.has(id));
assert.deepEqual(dangling, [], 'lesson tokens must resolve to a dictionary or grammar entry');
check(true, 'no dangling lesson references');

// === 4. The remaining gap: words in lessons with no entry at all ===
//
// This is the half of the dictionary contract that is still open. Every token
// here is a word the reader meets in a lesson but cannot look up, and each one
// lowers the reachable immersion share. The numbers are pinned so the gap can
// only shrink: a new lesson word without a dictionary entry fails this test
// until it is either linked or given an entry.
const UNLINKED_TOKENS = 1169;
const UNLINKED_FORMS = 375;
assert.ok(
  unlinkedForms.size <= UNLINKED_FORMS,
  `unlinked word forms grew past ${UNLINKED_FORMS}: ${unlinkedForms.size}`
);
let unlinkedTokenTotal = 0;
unlinkedForms.forEach((n) => { unlinkedTokenTotal += n; });
assert.ok(
  unlinkedTokenTotal <= UNLINKED_TOKENS,
  `unlinked word tokens grew past ${UNLINKED_TOKENS}: ${unlinkedTokenTotal}`
);
check(true, 'the unlinked vocabulary gap has not grown');

console.log(
  `PASS: ${count} dictionary contract cases — ${WORDS.length} entries all used in lessons, ` +
  `allowlist in sync, ${wordTokens} word tokens scanned, ` +
  `${linkedTokens} linked (${((linkedTokens / wordTokens) * 100).toFixed(1)}%), ` +
  `${unlinkedForms.size} unlinked forms (${unlinkedTokenTotal} tokens) still open.`,
);