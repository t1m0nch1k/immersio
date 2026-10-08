import assert from 'node:assert/strict';
import { build } from 'esbuild';

const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const bundle = await build({
  stdin: {
    contents: "export * from './src/services/grammarLookupService'; export * from './src/services/grammarService'; export * from './src/services/storageService'; export * from './src/data/grammar';",
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let count = 0;
for (const [lang, lessons] of Object.entries(api.GRAMMAR)) {
  const ids = new Set();
  for (const lesson of lessons) {
    assert(!ids.has(lesson.id), 'Topic ids must be unique: ' + lesson.id);
    ids.add(lesson.id);
    const exercises = api.buildGrammarExercises(lesson, lang);
    assert(exercises.length > 0);
    for (const exercise of exercises) {
      assert(exercise.answer.trim());
      assert(api.checkGrammarAnswer(exercise, exercise.answer, lang).correct, exercise.id);
      assert(!api.checkGrammarAnswer(exercise, 'совершенно другой ответ', lang).correct);
      for (const alternative of exercise.alternatives) assert(api.checkGrammarAnswer(exercise, alternative, lang).correct);
      assert.equal(new Set(api.shuffledTokenIndices(exercise.tokens)).size, exercise.tokens.length);
      if (exercise.mode === 'build') assert(api.checkGrammarAnswer(exercise, exercise.tokens.join(lang === 'ja' ? '' : ' '), lang).correct);
      count++;
    }
  }
  console.log(lang + ': ' + lessons.length + ' topics');
}
assert.equal(api.normalizeGrammarAnswer('  J’ai un livre ! ', 'fr'), "j'ai un livre");
assert.equal(api.normalizeGrammarAnswer('私 は 本 を 読みます。', 'ja'), '私は本を読みます');
assert.notEqual(api.normalizeGrammarAnswer('citam', 'sk'), api.normalizeGrammarAnswer('čítam', 'sk'));
const skLesson = api.GRAMMAR.sk.find((lesson) => lesson.id === 'sk-sentence-1');
const skWrite = api.buildGrammarExercises(skLesson, 'sk').find((exercise) => exercise.mode === 'write');
assert(api.checkGrammarAnswer(skWrite, 'Ja citam knihu.', 'sk').message.includes('диакритику'));
let state = api.getInitialState();
const initial = state;
state = api.recordGrammarAnswer(state, 'sk', skWrite.id, true, false);
assert.deepEqual(initial, api.getInitialState(), 'Answer recording must not mutate source state');
assert.equal(state.xp, 2);
assert.equal(state.streak.current, 1);
const due = state.languages.sk.grammarProgress[skWrite.id].dueDate;
assert(due > api.getLocalDateKey());
state = api.recordGrammarAnswer(state, 'sk', skWrite.id, true, false);
assert.equal(state.xp, 2, 'No repeated daily XP');
assert.equal(state.languages.sk.grammarProgress[skWrite.id].streak, 1);
assert.deepEqual(state.languages.en.grammarProgress, {}, 'Languages must be isolated');
state = api.recordGrammarAnswer(state, 'sk', skWrite.id, false, false);
assert(state.languages.sk.grammarProgress[skWrite.id].needsReview);
state = api.recordGrammarAnswer(state, 'sk', skWrite.id, true, true);
assert(state.languages.sk.grammarProgress[skWrite.id].needsReview, 'Hint cannot mark a skill mastered');
assert.equal(state.xp, 2);
assert(api.grammarLessonStats(state, skLesson, 'sk').due > 0);
assert.deepEqual(api.StorageService.load().languages.sk.grammarProgress, state.languages.sk.grammarProgress);
state = api.recordGrammarAnswer(state, 'sk', skWrite.id, true, false);
assert.equal(state.xp, 2, 'Recovery after an error must not duplicate a reward');
assert.equal(state.languages.sk.grammarProgress[skWrite.id].streak, 1, 'Independent recovery restores mastery');
const legacy = api.getInitialState();
delete legacy.languages.en.grammarProgress;
localStorage.setItem('pogruzhenie_v2', JSON.stringify(legacy));
assert.deepEqual(api.StorageService.load().languages.en.grammarProgress, {});
console.log('PASS: ' + count + ' exercises, alternatives, Unicode, progress, persistence, language isolation, reward limits.');

// Reader explanations must preserve contractions and distinguish missing data.
assert.equal(api.lookupGrammarNote('the', 'en', 'The book is here.').partOfSpeech, 'Артикль');
assert.equal(api.lookupGrammarNote('and', 'en').meaningRu, 'и, а');
assert.equal(api.lookupGrammarNote('don’t', 'en').partOfSpeech, 'Отрицательное сокращение');
assert.equal(api.lookupGrammarNote("l'homme", 'fr').partOfSpeech, 'Слитная форма (элизия)');
assert.equal(api.lookupGrammarNote('zzunknown', 'en'), null);
const missingNote = api.createFallbackExplorationNote('zzunknown', 'en', 'A zzunknown appears.');
assert.equal(missingNote.isFallback, true);
assert.equal(missingNote.contextSentence, 'A zzunknown appears.');
assert(missingNote.meaningRu.includes('не найден'));
