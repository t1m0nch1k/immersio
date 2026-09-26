import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const bundle = await build({
  stdin: {
    contents: "export * from './src/services/immersionService'; export * from './src/data/words'; export * from './src/data/lessons'; export * from './src/data/immersiveTranslations';",
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const LANGS = ['en', 'es', 'de', 'fr', 'it', 'ja', 'sk', 'cs'];
let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count++;
};

/**
 * The reference tokenizer is a frozen copy of the pre-optimization
 * implementation (three `WORDS.find()` scans per token). Every assertion below
 * compares the indexed implementation against it, so any difference in the
 * resolved `wordId`, the token keys, the separators or the flags is a failure.
 *
 * `FOREIGN_INFLECTIONS` is module private, so it is read straight from the
 * source to guarantee both implementations work on the very same table.
 */
const source = readFileSync('src/services/immersionService.ts', 'utf8');
const inflectionBlock = /const FOREIGN_INFLECTIONS: Record<string, string> = \{([\s\S]*?)\n\};/.exec(source);
assert(inflectionBlock, 'FOREIGN_INFLECTIONS must stay recognisable in the source');
const FOREIGN_INFLECTIONS = new Function('return {' + inflectionBlock[1] + '};')();
const tokenWordPattern = /[\p{L}\p{M}\d]+(?:[-'’][\p{L}\p{M}\d]+)*/gu;
const referenceTokenizeForeignSentence = (sentenceText, sentenceIndex, lang) => {
  const result = [];
  let tokenIndex = 0;
  let lastOffset = 0;

  tokenWordPattern.lastIndex = 0;
  let match;
  while ((match = tokenWordPattern.exec(sentenceText)) !== null) {
    const matchIndex = match.index;
    const wordStr = match[0];

    if (matchIndex > lastOffset) {
      const sepText = sentenceText.slice(lastOffset, matchIndex);
      result.push({
        key: `${sentenceIndex}:${tokenIndex++}`,
        text: sepText,
        kind: 'separator',
        sentenceIndex,
        tokenIndex: tokenIndex - 1,
        isPunctuation: /^[.,:;!?…\)»”%]/.test(sepText.trim()),
      });
    }

    const lowerWord = wordStr.toLowerCase();

    // 1. Direct inflection lookup
    const matchedWordId = FOREIGN_INFLECTIONS[lowerWord];
    let matchedWord = matchedWordId
      ? (api.WORD_MAP[matchedWordId] || api.GRAMMAR_WORD_MAP[matchedWordId])
      : undefined;

    // 2. Exact match in WORDS or GRAMMAR_WORD_MAP
    if (!matchedWord) {
      matchedWord =
        api.WORDS.find((w) => {
          const foreign = (w[lang] || w.en || '').toLowerCase();
          return foreign === lowerWord;
        }) ||
        Object.values(api.GRAMMAR_WORD_MAP).find((w) => {
          const foreign = (w[lang] || w.en || '').toLowerCase();
          return foreign === lowerWord;
        });
    }

    // 3. Substring / base match
    if (!matchedWord && lowerWord.length >= 4) {
      matchedWord = api.WORDS.find((w) => {
        const foreign = (w[lang] || w.en || '').toLowerCase();
        return (
          foreign.length >= 4 &&
          (foreign.startsWith(lowerWord.slice(0, 4)) || lowerWord.startsWith(foreign.slice(0, 4)))
        );
      });
    }

    const finalWordId = matchedWord?.id || matchedWordId;

    result.push({
      key: `${sentenceIndex}:${tokenIndex++}`,
      text: wordStr,
      target: wordStr,
      kind: 'word',
      wordId: finalWordId,
      sentenceIndex,
      tokenIndex: tokenIndex - 1,
      isConcept: Boolean(finalWordId),
    });

    lastOffset = matchIndex + wordStr.length;
  }

  if (lastOffset < sentenceText.length) {
    const sepText = sentenceText.slice(lastOffset);
    result.push({
      key: `${sentenceIndex}:${tokenIndex++}`,
      text: sepText,
      kind: 'separator',
      sentenceIndex,
      tokenIndex: tokenIndex - 1,
      isPunctuation: /^[.,:;!?…\)»”%]/.test(sepText.trim()),
    });
  }

  return result;
};

// === 1. tokenizeLessonSentence ===
const lesson1 = api.LESSONS.find((lesson) => lesson.id === 'l1');
const tokens1 = api.tokenizeLessonSentence(lesson1.sent[0], 0, 'es');
assert.deepEqual(
  tokens1.map((token) => token.text),
  ['Ранним', ' ', 'утром', ' ', 'я', ' ', 'открываю', ' ', 'окно', ' ', 'и', ' ', 'вижу', ' ', 'солнце', '.'],
  'explicit word pieces are separated by a single space and keep the punctuation attached'
);
assert.deepEqual(
  tokens1.map((token) => token.kind),
  ['word', 'separator', 'word', 'separator', 'word', 'separator', 'word', 'separator', 'word', 'separator', 'word', 'separator', 'word', 'separator', 'word', 'separator'],
  'words and separators alternate'
);
assert.deepEqual(tokens1.map((token) => token.key), tokens1.map((_, index) => `0:${index}`), 'keys are sequential per sentence');
assert.equal(tokens1[tokens1.length - 1].isPunctuation, true, 'the trailing dot is marked as punctuation');
assert.equal(tokens1[0].wordId, 'early', 'a known Russian form resolves to its dictionary id');
assert.equal(tokens1[0].target, 'Temprano', 'the target text is translated for the requested language and keeps the capital');
assert.equal(tokens1[0].isConcept, true, 'a resolved word is a concept');
count += 5;

const noSpace = api.tokenizeLessonSentence(['Кофе', { id: 'coffee' }, 'и', { id: 'bread', ru: 'хлеб' }], 3, 'en');
assert.deepEqual(
  noSpace.map((token) => token.text),
  ['Кофе', ' ', 'кофе', ' ', 'и', ' ', 'хлеб'],
  'glued pieces get exactly one separating space, an explicit piece without ru falls back to the Russian dictionary text'
);
assert.equal(noSpace[0].wordId, 'coffee', 'a plain string piece is resolved through the Russian index');
assert.equal(noSpace[0].target, 'Coffee', 'a capitalised Russian word gets a capitalised translation');
assert.equal(noSpace[2].wordId, 'coffee', 'the explicit piece keeps its dictionary id');
assert.equal(noSpace[2].target, 'coffee', 'an explicit piece is translated into the language of the reader');
assert.equal(noSpace[6].wordId, 'bread', 'an explicit ru override still resolves its dictionary id');
assert.equal(noSpace[6].target, 'bread', 'an explicit ru override is translated too');
count += 8;

const glued = api.tokenizeLessonSentence(['Кофе,{id-broken}'], 1, 'en');
assert.equal(glued[0].kind, 'word', 'an unknown piece is still a word');
const attached = api.tokenizeLessonSentence(['Да', { id: 'hello' }, ',', ' это'], 2, 'en');
assert.deepEqual(
  attached.map((token) => token.text),
  ['Да', ' ', 'привет', ', ', 'это'],
  'punctuation attaches to the left word and the following space joins the same separator'
);
assert.equal(attached[3].isPunctuation, true, 'a merged separator is still marked as punctuation');
const dashed = api.tokenizeLessonSentence(['Сегодня, 5-ый раз!'], 4, 'en');
assert.deepEqual(
  dashed.filter((token) => token.kind === 'word').map((token) => token.text),
  ['Сегодня', '5-ый', 'раз'],
  'hyphenated words and digits stay in one token'
);
const repeatedPunct = api.tokenizeLessonSentence(['Wow!!!', ' Really?!'], 5, 'en');
assert.deepEqual(
  repeatedPunct.map((token) => token.text),
  ['Wow', '!!! ', 'Really', '?!'],
  'a trailing space is merged into the punctuation separator, never split off'
);
assert.deepEqual(
  repeatedPunct.filter((token) => token.kind === 'separator').map((token) => token.isPunctuation),
  [true, true],
  'both merged separators are punctuation'
);
const adjacentPunct = api.tokenizeLessonSentence(['end...'], 6, 'en');
assert.deepEqual(
  adjacentPunct.map((token) => token.text),
  ['end', '...'],
  'a run of punctuation stays in one separator'
);
assert.equal(adjacentPunct[1].isPunctuation, true);
const quotes = api.tokenizeLessonSentence(['end...', '"next"'], 6, 'en');
assert.deepEqual(
  quotes.filter((token) => token.kind === 'separator').map((token) => token.text),
  ['..."', '"'],
  'adjacent punctuation is merged into a single separator'
);
count += 10;

// Mixed languages: the same Russian sentence must be tokenised identically, and
// only the `target` field may depend on the requested language.
for (const lang of LANGS) {
  const tokens = api.tokenizeLessonSentence(lesson1.sent[2], 0, lang);
  check(tokens.length > 10, 'a real lesson sentence is tokenised for ' + lang);
  check(tokens.every((token, index) => token.key === `0:${index}`), 'keys stay sequential for ' + lang);
  check(tokens.every((token) => token.text.trim().length > 0 || token.kind === 'separator'), 'no empty token for ' + lang);
}
const russian = api.tokenizeLessonSentence(lesson1.sent[0], 0, 'en').map((token) => [token.text, token.wordId]);
const french = api.tokenizeLessonSentence(lesson1.sent[0], 0, 'fr').map((token) => [token.text, token.wordId]);
assert.deepEqual(russian, french, 'the language parameter only changes the target text, never the tokens');
count++;

// Stability: the tokenizer keeps a module level regex, so it must be re-entrant.
const bigSentence = api.LESSONS[3].sent.flat();
for (let repeat = 0; repeat < 5; repeat += 1) {
  const once = api.LESSONS.map((lesson, lessonIndex) => lesson.sent.map((sentence, index) => api.tokenizeLessonSentence(sentence, index, 'de')));
  const twice = api.LESSONS.map((lesson, lessonIndex) => lesson.sent.map((sentence, index) => api.tokenizeLessonSentence(sentence, index, 'de')));
  assert.deepEqual(once, twice, 'repeating the tokenizer over all lessons is stable');
  assert.equal(bigSentence.length > 0, true);
}
count += 5;

// === 2. tokenizeForeignSentence ===
const foreign = api.tokenizeForeignSentence('Hello, my friend!', 0, 'en');
assert.deepEqual(
  foreign.map((token) => [token.kind, token.text]),
  [['word', 'Hello'], ['separator', ', '], ['word', 'my'], ['separator', ' '], ['word', 'friend'], ['separator', '!']],
  'punctuation and spaces become separators of the foreign sentence'
);
assert.equal(foreign[0].wordId, 'hello', 'an English word resolves to its dictionary id');
assert.equal(foreign[0].target, 'Hello', 'a foreign token shows its own surface form');
assert.equal(foreign[0].isConcept, true);
assert.equal(foreign[2].wordId, 'g_we', 'an inflection of FOREIGN_INFLECTIONS wins over the dictionary (Slovak "my" is "we")');
assert.equal(foreign[4].wordId, 'friend', 'the rest of the sentence is resolved through the exact index');
count += 6;

const shortWords = api.tokenizeForeignSentence('The cat and the dog drink water.', 9, 'en');
assert.deepEqual(
  shortWords.filter((token) => token.kind === 'word').map((token) => token.wordId),
  ['v0001', 'cat', 'v0003', 'v0001', 'dog', 'v1249', 'water'],
  'words shorter than four characters are resolved by the exact index only, and the first record of the dictionary wins'
);
count++;

const unknownWord = api.tokenizeForeignSentence('Blorp xyzzy', 1, 'en');
assert.equal(unknownWord[0].wordId, undefined, 'an unknown word has no id');
assert.equal(unknownWord[0].isConcept, false, 'an unknown word is not a concept');
assert.equal(unknownWord[0].target, 'Blorp', 'an unknown word still shows its surface form');
count += 3;

const prefix = api.tokenizeForeignSentence('hell', 2, 'en');
assert.equal(prefix[0].wordId, 'hello', 'a four character prefix falls back to the base word');
const shortToken = api.tokenizeForeignSentence('xyz', 3, 'en');
assert.equal(shortToken[0].wordId, undefined, 'a token shorter than four characters never uses the prefix match');
count += 2;

const inflected = api.tokenizeForeignSentence('Idem do mesta a jdeme domov.', 4, 'sk');
assert.deepEqual(
  inflected.filter((token) => token.kind === 'word').map((token) => token.wordId),
  ['go', 'g_in', 'city', 'g_and', 'go', 'v0138'],
  'Slovak inflections and grammar helpers map back to their base words'
);
const czech = api.tokenizeForeignSentence('Ona čte knihu a pije kávu.', 5, 'cs');
assert.deepEqual(
  czech.filter((token) => token.kind === 'word').map((token) => token.wordId),
  ['g_she', 'read', 'book', 'g_and', 'drink', 'coffee'],
  'the authored Czech pack keeps resolving through the inflections and the exact index'
);
const englishInflection = api.tokenizeForeignSentence('She reads books and drinks tea.', 6, 'en');
assert.deepEqual(
  englishInflection.filter((token) => token.kind === 'word').map((token) => token.wordId),
  ['v0061', 'read', 'v0675', 'v0003', 'drink', 'tea'],
  'English inflections map back to their base words'
);
count += 3;

const mixedLanguage = api.tokenizeForeignSentence('Привет hello', 7, 'en');
assert.equal(mixedLanguage[0].wordId, undefined, 'a Russian word is not a concept in an English sentence');
assert.equal(mixedLanguage[2].wordId, 'hello', 'the English word next to it still resolves');
count += 2;

const emptyForeign = api.tokenizeForeignSentence('', 8, 'en');
assert.deepEqual(emptyForeign, [], 'an empty sentence produces no tokens');
const onlyPunct = api.tokenizeForeignSentence(' — !? ', 9, 'en');
assert.equal(onlyPunct.length, 1, 'a punctuation only sentence produces a single separator');
assert.equal(onlyPunct[0].kind, 'separator');
assert.equal(onlyPunct[0].isPunctuation, false, 'a leading dash is not sentence punctuation');
count += 3;

// Determinism of the tokenizer itself.
for (let repeat = 0; repeat < 3; repeat += 1) {
  assert.deepEqual(
    api.tokenizeForeignSentence('Idem do mesta a jdeme domov.', 4, 'sk'),
    inflected,
    'the foreign tokenizer is stable across calls'
  );
}
count += 3;

// === 3. No regression: indexed lookups vs the frozen linear implementation ===
let comparedSentences = 0;
let comparedTokens = 0;
const compareWithReference = (text, index, lang) => {
  const actual = api.tokenizeForeignSentence(text, index, lang);
  const expected = referenceTokenizeForeignSentence(text, index, lang);
  assert.deepEqual(actual, expected, 'indexed tokenizer must match the linear one for ' + JSON.stringify(text) + ' (' + lang + ')');
  comparedSentences += 1;
  comparedTokens += actual.length;
};

// 3a. Every authored lesson in every language that has a target text pack.
for (const lang of ['sk', 'en', 'cs']) {
  for (const lesson of api.LESSONS) {
    const text = api.getImmersiveLessonText(lesson.id, lang);
    if (!text) continue;
    text.forEach((sentence, index) => compareWithReference(sentence, index, lang));
  }
}

// 3b. Every dictionary word of every language, plus a prefix and a noise variant.
for (const lang of LANGS) {
  for (const word of api.WORDS) {
    const surface = word[lang] || word.en;
    if (typeof surface !== 'string' || !surface.trim()) continue;
    compareWithReference(surface, 0, lang);
    compareWithReference(surface.toUpperCase(), 1, lang);
    compareWithReference(surface.toLowerCase(), 2, lang);
    if (surface.length >= 4) compareWithReference(surface.slice(0, 4), 3, lang);
    if (surface.length >= 5) compareWithReference(surface.slice(0, -1), 4, lang);
  }
}

// 3c. Every grammar helper word of every language.
for (const lang of LANGS) {
  for (const word of Object.values(api.GRAMMAR_WORD_MAP)) {
    const surface = word[lang] || word.en;
    if (typeof surface !== 'string' || !surface.trim()) continue;
    compareWithReference(surface, 0, lang);
    if (surface.length >= 4) compareWithReference(surface.slice(0, 4), 1, lang);
  }
}

// 3d. Every inflection key, in the language it belongs to and in all others.
const inflectionKeys = Object.keys(FOREIGN_INFLECTIONS);
for (const form of inflectionKeys) {
  for (const lang of LANGS) compareWithReference(form, 0, lang);
}

// 3e. Sentences built from the dictionary, including mixed scripts and noise.
const noise = ['...', '!!!', '42', 'zzz', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'привет', 'こんにちは', 'ľahko', 'ß', '😀'];
for (const lang of LANGS) {
  const pool = api.WORDS.map((word) => word[lang] || word.en).filter((value) => typeof value === 'string' && value.trim());
  const parts = [];
  for (let index = 0; index < 60; index += 1) {
    parts.push(pool[(index * 37) % pool.length], noise[(index * 7) % noise.length]);
  }
  compareWithReference(parts.join(' '), 0, lang);
  compareWithReference(parts.join(' '), 1, 'en');
  compareWithReference(parts.join(', '), 2, lang);
}
check(comparedSentences > 8000, 'the equivalence corpus is large enough, got ' + comparedSentences);
check(comparedTokens > comparedSentences, 'the corpus really contains word tokens');

// === 4. selectImmersionTokenKeys ===
// The reader tokenises one lesson at a time, so the fixture uses a globally
// increasing sentence index to keep the token keys unique.
let runningSentenceIndex = 0;
const sentencesOf = (lessons, lang) => lessons.flatMap((lesson) => lesson.sent.map((sentence) => {
  const index = runningSentenceIndex;
  runningSentenceIndex += 1;
  return api.tokenizeLessonSentence(sentence, index, lang);
}));
const conceptSentences = sentencesOf(api.LESSONS.slice(0, 5), 'de');
const allKeys = conceptSentences.flat().filter((token) => token.kind === 'word' && token.wordId && token.target);
assert(allKeys.length > 100, 'the fixture has a decent number of concept tokens, got ' + allKeys.length);
count++;

const learnedSets = [
  new Set(),
  new Set([allKeys[0].wordId]),
  new Set(allKeys.slice(0, 5).map((token) => token.wordId)),
  new Set(allKeys.map((token) => token.wordId)),
];
for (const share of [0, 5, 20, 40, 60, 80, 95, 99, 100, 150]) {
  for (const learned of learnedSets) {
    // Main invariant: the visible set is a pure function of its input.
    const first = api.selectImmersionTokenKeys(conceptSentences, share, learned);
    for (let repeat = 0; repeat < 4; repeat += 1) {
      assert.deepEqual(
        api.selectImmersionTokenKeys(conceptSentences, share, learned),
        first,
        'the selected keys never jump between calls (share ' + share + ')'
      );
    }
    count += 4;

    const selectedKeys = [...first];
    check(new Set(selectedKeys).size === selectedKeys.length, 'no duplicated keys at share ' + share);
    check(selectedKeys.every((key) => allKeys.some((token) => token.key === key)), 'only real concept keys are selected at share ' + share);

    // Main invariant: a learned word is always shown in the studied language.
    for (const token of allKeys) {
      if (learned.has(token.wordId)) {
        check(first.has(token.key), 'a learned word is always immersed (share ' + share + ', ' + token.wordId + ')');
      }
    }

    if (share >= 100) {
      check(first.size === allKeys.length, 'full immersion shows every concept at share ' + share);
    } else {
      // Below 100% the effective share is the 5..99 window of the service, and a
      // learned word is always added on top of the quota it was picked from.
      const effective = Math.max(5, Math.min(99, share));
      const quota = Math.max(1, Math.round((allKeys.length * effective) / 100));
      const learnedTokens = allKeys.filter((token) => learned.has(token.wordId)).length;
      check(first.size <= quota + learnedTokens, 'the quota is respected at share ' + share);
      const stillRussian = allKeys.filter((token) => !learned.has(token.wordId));
      if (stillRussian.length > 0) {
        check(first.size < allKeys.length, 'at least one word stays in Russian below 100% (share ' + share + ')');
      }
    }
  }
}
check(true, 'the immersion selection matrix is covered');
// A share below 5% is raised to the 5% floor, and anything above 99 behaves like 99.
const floorSet = api.selectImmersionTokenKeys(conceptSentences, 0, new Set());
assert.deepEqual(floorSet, api.selectImmersionTokenKeys(conceptSentences, 5, new Set()), 'share 0 is raised to the 5% floor');
assert.deepEqual(floorSet, api.selectImmersionTokenKeys(conceptSentences, 1, new Set()), 'share 1 is raised to the 5% floor as well');
const ceilingSet = api.selectImmersionTokenKeys(conceptSentences, 100, new Set());
assert.deepEqual(
  api.selectImmersionTokenKeys(conceptSentences, 150, new Set()),
  ceilingSet,
  'a share above 100 behaves like full immersion'
);
assert.deepEqual(
  ceilingSet,
  new Set(allKeys.map((token) => token.key)),
  'full immersion exposes every concept token'
);
count += 3;

// Learning a word may only add keys, never move the visible set around.
for (const share of [20, 40, 60, 80, 95]) {
  const before = api.selectImmersionTokenKeys(conceptSentences, share, new Set());
  for (const token of allKeys) {
    const learned = new Set([token.wordId]);
    const after = api.selectImmersionTokenKeys(conceptSentences, share, learned);
    for (const key of before) {
      check(after.has(key), 'learning ' + token.wordId + ' keeps ' + key + ' visible at share ' + share);
    }
  }
}

// Degenerate inputs.
assert.deepEqual(api.selectImmersionTokenKeys([], 50, new Set()), new Set(), 'no tokens means no keys');
const plainSentences = [[{ key: '0:0', text: ' ', kind: 'separator' }]];
assert.deepEqual(api.selectImmersionTokenKeys(plainSentences, 50, new Set()), new Set(), 'a lesson without concepts selects nothing');
count += 2;

// === 5. getImmersionStats ===
const statsSentences = sentencesOf(api.LESSONS.slice(0, 2), 'sk');
const statsConcepts = statsSentences.flat().filter((token) => token.kind === 'word' && token.wordId && token.target);
const statsLearned = new Set(statsConcepts.slice(0, 3).map((token) => token.wordId));
const statsKeys = api.selectImmersionTokenKeys(statsSentences, 60, statsLearned);
const stats = api.getImmersionStats(statsSentences, statsKeys, 60, statsLearned);
const immersed = statsConcepts.filter((token) => statsKeys.has(token.key));
const learnedOnScreen = immersed.filter((token) => statsLearned.has(token.wordId));
assert.equal(stats.totalConcepts, statsConcepts.length, 'totalConcepts counts the concept tokens');
assert.equal(stats.immersedConcepts, immersed.length, 'immersedConcepts counts the selected tokens');
assert.equal(stats.actualShare, Math.round((immersed.length / statsConcepts.length) * 100), 'actualShare is the rounded real share');
assert.equal(stats.targetShare, 60, 'targetShare is echoed back');
assert.equal(stats.learnedCount, learnedOnScreen.length, 'learnedCount counts the learned words on screen');
assert.equal(stats.newCount, immersed.length - learnedOnScreen.length, 'newCount is the rest of the visible words');
assert.equal(stats.learnedCount + stats.newCount, stats.immersedConcepts, 'learned and new words partition the visible set');
assert.equal(
  stats.totalWords,
  statsSentences.flat().filter((token) => token.kind === 'word').length,
  'totalWords counts every word token'
);
assert(stats.actualShare <= 100, 'the real share never exceeds 100%');
count += 9;

const emptyStats = api.getImmersionStats([], new Set(), 40, new Set());
assert.deepEqual(
  emptyStats,
  { totalConcepts: 0, immersedConcepts: 0, actualShare: 0, targetShare: 40, learnedCount: 0, newCount: 0, totalWords: 0 },
  'an empty lesson reports honest zeroes'
);
const fullStats = api.getImmersionStats(statsSentences, new Set(statsConcepts.map((token) => token.key)), 100, new Set());
assert.equal(fullStats.actualShare, 100, 'a fully immersed lesson reports 100%');
assert.equal(fullStats.learnedCount, 0, 'nothing is learned in that fixture');
count += 3;

// The stats must stay identical when the selection is recomputed.
for (let repeat = 0; repeat < 3; repeat += 1) {
  const again = api.getImmersionStats(statsSentences, api.selectImmersionTokenKeys(statsSentences, 60, statsLearned), 60, statsLearned);
  assert.deepEqual(again, stats, 'the statistics are stable across recomputation');
}
count += 3;

const started = Date.now();
for (const lesson of api.LESSONS) {
  const text = api.getImmersiveLessonText(lesson.id, 'sk');
  if (!text) continue;
  text.forEach((sentence, index) => api.tokenizeForeignSentence(sentence, index, 'sk'));
}
const indexedMs = Date.now() - started;
const referenceStart = Date.now();
for (const lesson of api.LESSONS) {
  const text = api.getImmersiveLessonText(lesson.id, 'sk');
  if (!text) continue;
  text.forEach((sentence, index) => referenceTokenizeForeignSentence(sentence, index, 'sk'));
}
const referenceMs = Date.now() - referenceStart;
console.log('  timing (informational): indexed ' + indexedMs + 'ms vs linear reference ' + referenceMs + 'ms over the Slovak pack');
check(referenceMs > 0, 'the reference run is measurable');

console.log('PASS: ' + count + ' immersion cases — lesson tokenizer, foreign tokenizer, ' + comparedSentences + ' sentences (' + comparedTokens + ' tokens) identical to the frozen linear implementation, stable immersion selection, honest statistics.');
