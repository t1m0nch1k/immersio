import assert from 'node:assert/strict';
import { build } from 'esbuild';

const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
const bundle = await build({
  stdin: {
    contents: "export * from './src/services/storageService'; export * from './src/services/srsService'; export * from './src/services/studyPlanService'; export * from './src/data/lessons'; export * from './src/data/words';",
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const KEY = 'pogruzhenie_v2';
const write = (state) => localStorage.setItem(KEY, JSON.stringify(state));
const writeRaw = (text) => localStorage.setItem(KEY, text);
const load = () => api.StorageService.load();
const throughJson = (value) => JSON.parse(JSON.stringify(value));
const sameShape = (actual, expected, message) => {
  assert.deepEqual(throughJson(actual), throughJson(expected), message);
  return true;
};

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count++;
};

// console.warn is expected for the corrupted-payload cases: capture it instead of printing.
const realWarn = console.warn;
const warnings = [];
console.warn = (...args) => { warnings.push(String(args[0])); };
const restoreWarn = () => { console.warn = realWarn; };

// --- getInitialState / getInitialProgress / getLocalDateKey ---
const initial = api.getInitialState();
assert.deepEqual(initial, {
  onboarded: false,
  name: '',
  avatar: '🦊',
  currentLang: 'en',
  darkMode: false,
  soundEnabled: true,
  account: { email: '', name: '', isAuth: false, tier: 'free' },
  languages: { en: api.getInitialProgress() },
  xp: 0,
  perfectCount: 0,
  streak: { current: 0, best: 0, lastActiveDate: '' },
  history: [],
  achievements: [],
  customLessons: [],
});
assert.deepEqual(api.getInitialProgress(), {
  immersion: 10,
  learnedWords: [],
  doneLessons: {},
  srsData: {},
  testLvl: null,
  dailyActivity: {},
  listeningActivity: {},
  grammarProgress: {},
});
count += 2;
assert.equal(Object.keys(initial).length, 14, 'UserState has exactly 14 known fields');
assert.notEqual(api.getInitialState(), initial, 'every call returns a fresh object');
assert.notEqual(api.getInitialState().languages.en, api.getInitialState().languages.en, 'progress is not shared between states');
count += 3;

const dateKey = api.getLocalDateKey();
assert(/^\d{4}-\d{2}-\d{2}$/.test(dateKey), 'getLocalDateKey returns YYYY-MM-DD');
assert.equal(api.getLocalDateKey(new Date(2026, 0, 5)), '2026-01-05', 'months are zero based and padded');
assert.equal(api.getLocalDateKey(new Date(2026, 11, 31)), '2026-12-31', 'the last day of the year');
assert.equal(api.getLocalDateKey(new Date(2026, 8, 26)), '2026-09-26', 'a fixed date is formatted from local time');
assert.equal(dateKey, api.getLocalDateKey(new Date()), 'the default argument is now');
count += 4;

// --- Empty and unreadable storage ---
memory.clear();
assert.deepEqual(load(), api.getInitialState(), 'no payload yields the initial state');
for (const broken of ['{oops', 'null', '[]', '42', '"text"', '', '{"a":']) {
  writeRaw(broken);
  check(sameShape(load(), api.getInitialState(), 'x'), 'broken payload ' + JSON.stringify(broken) + ' yields the initial state');
}
check(warnings.length === 2, 'only the two malformed JSON payloads are reported, valid JSON of a wrong shape fails silently');
restoreWarn();
count++;

// --- Unknown keys must not survive the load ---
memory.clear();
const storedHash = { salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 210000 };
write({
  onboarded: true,
  evil: 'root',
  isAdmin: true,
  languages: { en: { immersion: 40, hack: 1, nested: { deep: true } }, xx: { immersion: 90 } },
  account: { email: 'a@b.c', isAuth: true, tier: 'pro', passwordHash: storedHash, subscriptionPlan: 'lifetime', subscribedDate: '2026-01-01', secret: 'leak' },
  streak: { current: 3, best: 9, lastActiveDate: '2026-01-01', injected: 'x' },
  history: ['2026-01-01', 5, null, '2026-01-02'],
  achievements: ['first', 7, 'five_lessons'],
  customLessons: [],
  extra: { nested: 'deep' },
});
const clean = load();
assert.deepEqual(Object.keys(clean).sort(), [
  'account', 'achievements', 'avatar', 'currentLang', 'customLessons', 'darkMode', 'history',
  'languages', 'name', 'onboarded', 'perfectCount', 'soundEnabled', 'streak', 'xp',
].sort(), 'load() returns exactly the known UserState fields');
assert.deepEqual(Object.keys(clean.languages), ['en'], 'an unsupported language code is dropped');
assert.deepEqual(Object.keys(clean.languages.en).sort(), [
  'dailyActivity', 'doneLessons', 'grammarProgress', 'grammarSession', 'immersion', 'learnedWords',
  'listeningActivity', 'srsData', 'testLvl',
].sort(), 'a language progress exposes exactly the known fields');
assert.deepEqual(Object.keys(clean.account).sort(), [
  'email', 'isAuth', 'name', 'passwordHash', 'subscribedDate', 'subscriptionPlan', 'tier',
].sort(), 'the account keeps only declared fields');
assert.deepEqual(Object.keys(clean.streak), ['current', 'best', 'lastActiveDate']);
assert.equal(clean.streak.current, 3);
assert.equal(clean.streak.best, 9);
assert.equal(clean.languages.en.immersion, 40, 'a valid stored value is preserved');
assert.equal(clean.account.tier, 'free', 'paid access stays disabled');
assert.deepEqual(clean.account.passwordHash, storedHash, 'a PBKDF2 record survives a reload');
assert.equal(clean.account.subscriptionPlan, 'lifetime');
assert.equal(clean.account.subscribedDate, '2026-01-01');
assert.equal(clean.account.isAuth, true);
assert.deepEqual(clean.history, ['2026-01-01', '2026-01-02'], 'history keeps only date strings');
assert.deepEqual(clean.achievements, ['first', 'five_lessons'], 'achievements keep only ids');
assert.equal(clean.evil, undefined, 'an unknown root key is not part of the state');
count += 10;

// --- Legacy password digests are dropped and the session is signed out ---
for (const legacy of ['a'.repeat(64), 'A1B2'.repeat(16).toLowerCase()]) {
  memory.clear();
  write({ onboarded: true, account: { email: 'a@b.c', isAuth: true, passwordHash: legacy } });
  const migrated = load();
  assert.equal(migrated.account.passwordHash, undefined, 'a legacy SHA-256 digest is discarded on load');
  assert.equal(migrated.account.isAuth, false, 'a session backed by an unverifiable digest ends');
  assert.equal(migrated.account.email, 'a@b.c', 'the rest of the account survives the migration');
  count += 3;
}

// A record below the iteration floor is not a hash this build produced.
memory.clear();
write({ onboarded: true, account: { isAuth: true, passwordHash: { salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 1000 } } });
assert.equal(load().account.passwordHash, undefined, 'a record under the iteration floor is discarded');
count += 1;

// --- Scalar fields ---
memory.clear();
write({
  onboarded: 'yes',
  name: 42,
  avatar: '',
  currentLang: 'ru',
  darkMode: 'true',
  soundEnabled: null,
  xp: -5,
  perfectCount: '3',
  streak: { current: null, best: null, lastActiveDate: 5 },
  account: { email: 7, isAuth: 'true', tier: 'pro' },
});
const scalars = load();
assert.equal(scalars.onboarded, false, 'onboarded is strictly boolean');
assert.equal(scalars.name, '', 'a non-string name is dropped');
assert.equal(scalars.avatar, '🦊', 'an empty avatar falls back to the default');
assert.equal(scalars.currentLang, 'en', 'an unsupported currentLang falls back to en');
assert.equal(scalars.darkMode, false, 'a non-boolean darkMode is dropped');
assert.equal(scalars.soundEnabled, true, 'a missing soundEnabled keeps the default');
assert.equal(scalars.xp, 0, 'a negative xp is dropped');
assert.equal(scalars.perfectCount, 0, 'a string perfectCount is dropped');
assert.equal(scalars.streak.current, 0, 'a null streak is dropped');
assert.equal(scalars.streak.best, 0, 'a null best streak is dropped');
assert.equal(scalars.streak.lastActiveDate, '', 'a non-string lastActiveDate is dropped');
assert.equal(scalars.account.email, '', 'a numeric email is dropped');
assert.equal(scalars.account.isAuth, false, 'a truthy non-boolean isAuth is dropped');
assert.equal(scalars.account.tier, 'free', 'tier is forced to free');
count += 13;

memory.clear();
// 1e999 is the only way to get a real Infinity through JSON.
writeRaw('{"xp":1e999,"perfectCount":7.5,"streak":{"current":1e999,"best":7.5,"lastActiveDate":5},"currentLang":"ja","darkMode":true,"soundEnabled":false,"name":"Артём","avatar":"🐼","onboarded":true}');
const finite = load();
assert.equal(finite.xp, 0, 'an infinite xp is dropped');
assert.equal(finite.perfectCount, 7.5, 'a float perfectCount is kept');
assert.equal(finite.streak.current, 0, 'an infinite streak is dropped');
assert.equal(finite.streak.best, 7.5, 'a float best streak is kept');
assert.equal(finite.currentLang, 'ja', 'every supported language code is accepted');
assert.equal(finite.darkMode, true);
assert.equal(finite.soundEnabled, false);
assert.equal(finite.name, 'Артём');
assert.equal(finite.avatar, '🐼');
assert.equal(finite.onboarded, true);
count += 9;

// --- Language progress: immersion, learnedWords, testLvl ---
memory.clear();
write({
  languages: {
    en: { immersion: 500, learnedWords: ['hello', 'w_broken', 7, null, 'cat', ''], testLvl: 3 },
    sk: { immersion: -20, learnedWords: 'nope', testLvl: 'B1' },
    de: { immersion: 'abc', learnedWords: null },
  },
});
const langs = load().languages;
assert.equal(langs.en.immersion, 100, 'immersion is capped at 100');
assert.equal(langs.sk.immersion, 0, 'a negative immersion is clamped to 0');
assert.equal(langs.de.immersion, 10, 'a non-numeric immersion falls back to the default');
assert.deepEqual(langs.en.learnedWords, ['hello', 'cat', ''], 'legacy w_* ids and non-strings are dropped');
assert.deepEqual(langs.sk.learnedWords, [], 'a non-array learnedWords becomes an empty list');
assert.deepEqual(langs.de.learnedWords, [], 'a null learnedWords becomes an empty list');
assert.equal(langs.en.testLvl, null, 'a numeric testLvl becomes null');
assert.equal(langs.sk.testLvl, 'B1', 'a string testLvl is kept');
count += 8;

// --- srsData: a record is either fully valid or dropped as a whole ---
memory.clear();
const validCard = { wordId: 'hello', interval: 6, repetition: 2, efactor: 2.5, dueDate: '2026-03-01', lastReviewed: '2026-02-25' };
write({
  languages: {
    en: {
      srsData: {
        good: validCard,
        goodMinEf: { ...validCard, wordId: 'a', efactor: 1.3 },
        goodMaxEf: { ...validCard, wordId: 'b', efactor: 3.0 },
        goodLeapDay: { ...validCard, wordId: 'c', dueDate: '2028-02-29', lastReviewed: '2028-02-28' },
        goodZero: { ...validCard, wordId: 'd', interval: 0, repetition: 0 },
        extraField: { ...validCard, wordId: 'e', hacked: 'yes' },
        stringInterval: { ...validCard, wordId: 'f', interval: 'abc' },
        numericStringInterval: { ...validCard, wordId: 'g', interval: '6' },
        nullInterval: { ...validCard, wordId: 'h', interval: null },
        boolInterval: { ...validCard, wordId: 'i', interval: true },
        negativeInterval: { ...validCard, wordId: 'k', interval: -1 },
        floatRepetition: { ...validCard, wordId: 'l', repetition: 1.5 },
        negativeRepetition: { ...validCard, wordId: 'm', repetition: -2 },
        stringRepetition: { ...validCard, wordId: 'n', repetition: '2' },
        lowEf: { ...validCard, wordId: 'o', efactor: 1.29 },
        highEf: { ...validCard, wordId: 'p', efactor: 3.01 },
        nullEf: { ...validCard, wordId: 'q', efactor: null },
        impossibleDate: { ...validCard, wordId: 'r', dueDate: '2026-02-31' },
        impossibleMonth: { ...validCard, wordId: 's', dueDate: '2026-13-01' },
        zeroMonth: { ...validCard, wordId: 't', dueDate: '2026-00-10' },
        shortDate: { ...validCard, wordId: 'u', dueDate: '2026-1-1' },
        isoDateTime: { ...validCard, wordId: 'v', dueDate: '2026-03-01T00:00:00Z' },
        nanDate: { ...validCard, wordId: 'w', dueDate: 'NaN-NaN-NaN' },
        nullDate: { ...validCard, wordId: 'x', dueDate: null },
        badLastReviewed: { ...validCard, wordId: 'y', lastReviewed: 'yesterday' },
        emptyWordId: { ...validCard, wordId: '' },
        arrayRecord: [],
        nullRecord: null,
        stringRecord: 'hello',
        '': validCard,
      },
    },
  },
});
const srs = load().languages.en.srsData;
assert.deepEqual(
  Object.keys(srs).sort(),
  ['extraField', 'good', 'goodLeapDay', 'goodMaxEf', 'goodMinEf', 'goodZero'],
  'only complete and valid SRS records survive'
);
assert.deepEqual(srs.good, validCard, 'a valid record is preserved as is');
assert.deepEqual(
  Object.keys(srs.extraField),
  ['wordId', 'interval', 'repetition', 'efactor', 'dueDate', 'lastReviewed'],
  'unknown SRS fields are dropped'
);
assert.equal(srs.goodMinEf.efactor, 1.3, 'the lower EF bound is inclusive');
assert.equal(srs.goodMaxEf.efactor, 3.0, 'the upper EF bound is inclusive');
assert.equal(srs.goodLeapDay.dueDate, '2028-02-29', 'a real leap day is accepted');
assert.equal(srs.goodZero.interval, 0, 'a zero interval is valid');
count += 6;

// Infinity can only be produced by raw JSON, so it gets its own payload.
memory.clear();
writeRaw('{"languages":{"en":{"srsData":{"inf":{"wordId":"inf","interval":1e999,"repetition":2,"efactor":2.5,"dueDate":"2026-03-01","lastReviewed":"2026-02-25"}}}}}');
assert.deepEqual(load().languages.en.srsData, {}, 'an infinite interval is dropped');
writeRaw('{"languages":{"en":{"srsData":{"huge":{"wordId":"huge","interval":1e308,"repetition":2,"efactor":2.5,"dueDate":"2026-03-01","lastReviewed":"2026-02-25"}}}}}');
assert.deepEqual(Object.keys(load().languages.en.srsData), ['huge'], 'a huge but finite interval is still finite and kept');
count += 2;

// A card that survived validation must be schedulable again.
const repaired = api.SRSService.calculateNextReview(srs.good, 4);
assert(/^\d{4}-\d{2}-\d{2}$/.test(repaired.dueDate), 'a loaded card can be scheduled again');
assert(Number.isFinite(repaired.interval), 'a loaded card produces a finite interval');
count += 2;

// --- doneLessons ---
memory.clear();
write({
  languages: {
    en: {
      doneLessons: {
        l1: { score: 9, pct: 100, date: '2026-02-20' },
        l2: { score: 0, pct: 0, date: '' },
        stringPct: { score: 5, pct: '80', date: '2026-02-20' },
        overHundred: { score: 9, pct: 101, date: '2026-02-20' },
        negativePct: { score: 9, pct: -1, date: '2026-02-20' },
        nullPct: { score: 9, pct: null, date: '2026-02-20' },
        missingScore: { pct: 50, date: '2026-02-20' },
        stringScore: { score: '9', pct: 50, date: '2026-02-20' },
        negativeScore: { score: -9, pct: 50, date: '2026-02-20' },
        numericDate: { score: 9, pct: 50, date: 20260220 },
        extra: { score: 9, pct: 50, date: '2026-02-20', injected: 'x' },
        '': { score: 9, pct: 50, date: '2026-02-20' },
        arrayValue: [],
        nullValue: null,
        numberValue: 80,
        stringValue: 'passed',
      },
    },
  },
});
const done = load().languages.en.doneLessons;
assert.deepEqual(Object.keys(done).sort(), ['extra', 'l1', 'l2'], 'only well-formed lesson records survive');
assert.deepEqual(done.l1, { score: 9, pct: 100, date: '2026-02-20' });
assert.deepEqual(Object.keys(done.extra), ['score', 'pct', 'date'], 'unknown lesson fields are dropped');
assert.equal(done.l2.pct, 0, 'a zero percentage is valid');
count += 4;

for (const [label, value] of [['array', []], ['string', 'l1'], ['null', null], ['number', 5]]) {
  memory.clear();
  write({ languages: { en: { doneLessons: value } } });
  check(Object.keys(load().languages.en.doneLessons).length === 0, 'a ' + label + ' doneLessons map is dropped');
}

// The weak-lesson sort of the study plan reads `.pct` as a number.
memory.clear();
write({ languages: { en: { doneLessons: { l1: { score: 9, pct: 100, date: '2026-02-20' } } } } });
assert(Object.values(load().languages.en.doneLessons).every((entry) => Number.isFinite(entry.pct)), 'every surviving pct is a finite number');
count++;

// --- customLessons ---
memory.clear();
const goodLesson = { id: 'custom_1', title: 'Мой текст', emoji: '📖', lvl: 2, description: 'd', sent: [['Привет', { id: 'hello', ru: 'привет' }, '.']] };
write({
  customLessons: [
    goodLesson,
    { ...goodLesson, id: 'custom_2', sent: [['a', 'b']] },
    { ...goodLesson, id: 'noTitle', title: '' },
    { ...goodLesson, id: 'emptyId', id: '' },
    { ...goodLesson, id: 'noSent', sent: undefined },
    { ...goodLesson, id: 'sentNotArray', sent: 'Привет' },
    { ...goodLesson, id: 'emptySent', sent: [] },
    { ...goodLesson, id: 'sentenceNotArray', sent: ['Привет'] },
    { ...goodLesson, id: 'emptySentence', sent: [[]] },
    { ...goodLesson, id: 'pieceNotString', sent: [[42]] },
    { ...goodLesson, id: 'pieceNoId', sent: [[{ ru: 'привет' }]] },
    { ...goodLesson, id: 'pieceRuNumber', sent: [[{ id: 'hello', ru: 5 }]] },
    { id: 'nullLesson' },
    'not a lesson',
    42,
  ],
});
const custom = load().customLessons;
assert.deepEqual(custom.map((lesson) => lesson.id), ['custom_1', 'custom_2'], 'broken custom lessons are skipped, valid ones survive');
assert.deepEqual(custom[0], goodLesson, 'a valid custom lesson round-trips unchanged');
for (const lesson of custom) {
  check(lesson.sent.every((sentence) => Array.isArray(sentence) && sentence.length > 0), 'every sentence stays a non-empty array, so .flat() cannot crash');
  check(lesson.sent.every((sentence) => sentence.every((piece) => typeof piece === 'string' || typeof piece.id === 'string')), 'every piece is a string or a word reference');
}
count += 2;
for (const [label, value] of [['object', { 0: goodLesson }], ['null', null], ['string', 'nope']]) {
  memory.clear();
  write({ customLessons: value });
  check(load().customLessons.length === 0, 'customLessons as ' + label + ' yields an empty list');
}

// A legacy record without the optional presentation fields survives with defaults.
memory.clear();
write({
  customLessons: [
    { id: 'legacy', title: 'Старый текст', sent: [['Привет']] },
    { ...goodLesson, id: 'badLevel', lvl: 9 },
    { ...goodLesson, id: 'pro', isProOnly: true },
  ],
});
const [legacyLesson, badLevel, pro] = load().customLessons;
assert.equal(legacyLesson.emoji, '📖', 'a missing emoji falls back to the import default');
assert.equal(legacyLesson.lvl, 2, 'a missing level falls back to A2');
assert.equal('description' in legacyLesson, false, 'an absent description is not invented');
assert.equal(badLevel.lvl, 2, 'an impossible level falls back to A2');
assert.equal(pro.isProOnly, true, 'the pro flag is preserved');
assert.equal('isProOnly' in badLevel, false, 'a missing pro flag is not invented');
count += 5;

// --- dailyActivity / listeningActivity / grammarProgress ---
memory.clear();
write({
  languages: {
    en: {
      dailyActivity: {
        '2026-02-20': { sessions: 2, minutes: 12, reviewedWords: 5, newWords: 3, completedTasks: ['t1', 't2'], sessionCounted: true },
        '2026-02-21': { sessions: 'lots', minutes: -4, reviewedWords: null, newWords: undefined, completedTasks: 'nope', sessionCounted: 'yes' },
        '2026-02-22': null,
        '2026-02-23': 'garbage',
      },
      listeningActivity: {
        '2026-02-20': { minutes: 15, sessions: 1, completedItems: ['l1', 7, null, 'l2'] },
        '2026-02-21': { minutes: null, sessions: [], completedItems: 'x' },
      },
      grammarProgress: {
        'sk-sentence-1': { attempts: 3, correct: 2, streak: 1, needsReview: true, dueDate: '2026-03-01', lastRewardDate: '2026-02-20' },
        broken: 'garbage',
        partial: { attempts: 'x', needsReview: 'yes' },
      },
    },
  },
});
const activity = load().languages.en;
const emptyDay = { sessions: 0, minutes: 0, reviewedWords: 0, newWords: 0, completedTasks: [], sessionCounted: false };
assert.deepEqual(activity.dailyActivity['2026-02-20'], {
  sessions: 2, minutes: 12, reviewedWords: 5, newWords: 3, completedTasks: ['t1', 't2'], sessionCounted: true,
});
assert.deepEqual(activity.dailyActivity['2026-02-21'], emptyDay, 'a partial day is zero filled');
assert.deepEqual(activity.dailyActivity['2026-02-22'], emptyDay, 'a null day is zero filled');
assert.deepEqual(activity.dailyActivity['2026-02-23'], emptyDay, 'a string day is zero filled');
assert.deepEqual(activity.listeningActivity['2026-02-20'], { minutes: 15, sessions: 1, completedItems: ['l1', 'l2'] });
assert.deepEqual(activity.listeningActivity['2026-02-21'], { minutes: 0, sessions: 0, completedItems: [] });
assert.deepEqual(activity.grammarProgress['sk-sentence-1'], {
  attempts: 3, correct: 2, streak: 1, needsReview: true, dueDate: '2026-03-01', lastRewardDate: '2026-02-20',
});
assert.deepEqual(Object.keys(activity.grammarProgress).sort(), ['partial', 'sk-sentence-1'], 'a non-object grammar entry is dropped');
assert.deepEqual(activity.grammarProgress.partial, {
  attempts: 0, correct: 0, streak: 0, needsReview: false, dueDate: '', lastRewardDate: '',
});
count += 8;

// --- Legacy payloads ---
memory.clear();
const legacy = api.getInitialState();
delete legacy.languages.en.grammarProgress;
delete legacy.languages.en.listeningActivity;
write(legacy);
const migrated = load();
assert.deepEqual(migrated.languages.en.grammarProgress, {}, 'a legacy state without grammarProgress migrates to an empty map');
assert.deepEqual(migrated.languages.en.listeningActivity, {}, 'a legacy state without listeningActivity migrates to an empty map');
assert.equal(migrated.languages.en.immersion, 10);
assert.equal(migrated.languages.en.grammarSession, undefined, 'a missing grammar session stays undefined');
assert.equal(migrated.languages.en.testLvl, null);
count += 4;

memory.clear();
write({ languages: { en: { grammarSession: { lessonId: 'l1', exerciseIndex: 3, assisted: true } } } });
assert.deepEqual(
  load().languages.en.grammarSession,
  { lessonId: 'l1', exerciseIndex: 3, assisted: true },
  'a valid grammar session is kept'
);
for (const bad of [{ lessonId: 'l1', exerciseIndex: -1 }, { lessonId: 5, exerciseIndex: 1 }, { exerciseIndex: 1 }, 'l1', 7]) {
  memory.clear();
  write({ languages: { en: { grammarSession: bad } } });
  check(load().languages.en.grammarSession === undefined, 'a broken grammar session is dropped: ' + JSON.stringify(bad));
}

for (const [label, value] of [['string', 'sk'], ['array', []], ['null', null], ['number', 3]]) {
  memory.clear();
  write({ languages: value });
  check(Object.keys(load().languages).join() === 'en', 'a ' + label + ' languages map falls back to the default language');
}
memory.clear();
write({ languages: { en: 'broken', sk: { immersion: 60 } } });
const partialLangs = load().languages;
assert.equal(partialLangs.en.immersion, 10, 'a broken language progress becomes the default one');
assert.equal(partialLangs.sk.immersion, 60, 'a healthy language next to a broken one is untouched');
assert.deepEqual(Object.keys(partialLangs), ['en', 'sk'], 'the default language is always first');
count += 3;

// --- Language isolation ---
memory.clear();
const isolated = api.getInitialState();
const skProgress = api.StorageService.ensureLangProgress(isolated, 'sk');
skProgress.learnedWords.push('hello');
skProgress.srsData.hello = validCard;
skProgress.doneLessons.l1 = { score: 3, pct: 30, date: '2026-02-20' };
skProgress.immersion = 70;
api.StorageService.save(isolated);
const reloaded = load();
assert.deepEqual(reloaded.languages.en.learnedWords, [], 'English progress stays empty');
assert.deepEqual(reloaded.languages.en.srsData, {}, 'English SRS data stays empty');
assert.deepEqual(reloaded.languages.en.doneLessons, {}, 'English lesson results stay empty');
assert.equal(reloaded.languages.en.immersion, 10, 'English immersion is untouched');
assert.deepEqual(reloaded.languages.sk.learnedWords, ['hello']);
assert.deepEqual(reloaded.languages.sk.srsData.hello, validCard);
assert.deepEqual(reloaded.languages.sk.doneLessons.l1, { score: 3, pct: 30, date: '2026-02-20' });
assert.equal(reloaded.languages.sk.immersion, 70);
assert.deepEqual(Object.keys(reloaded.languages).sort(), ['en', 'sk']);
count += 9;

// --- Full round trip ---
memory.clear();
const rich = api.getInitialState();
Object.assign(rich, {
  onboarded: true,
  name: 'Артём',
  avatar: '🦉',
  currentLang: 'cs',
  darkMode: true,
  soundEnabled: false,
  xp: 1234,
  perfectCount: 9,
  history: ['2026-02-19', '2026-02-20'],
  achievements: ['first', 'five_lessons'],
  customLessons: [goodLesson],
});
rich.account = {
  email: 'artem@example.com', name: 'Артём', isAuth: true, tier: 'free',
  passwordHash: { salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 210000 },
  subscriptionPlan: 'monthly', subscribedDate: '2026-02-01',
};
const cs = api.StorageService.ensureLangProgress(rich, 'cs');
cs.immersion = 95;
cs.learnedWords = ['hello', 'cat', 'dog'];
cs.doneLessons = { l1: { score: 9, pct: 100, date: '2026-02-20' } };
cs.srsData = { hello: { wordId: 'hello', interval: 15, repetition: 3, efactor: 2.6, dueDate: '2026-03-05', lastReviewed: '2026-02-20' } };
cs.testLvl = 'B1';
cs.dailyActivity['2026-02-20'] = { sessions: 1, minutes: 25, reviewedWords: 8, newWords: 4, completedTasks: ['a'], sessionCounted: true };
cs.listeningActivity['2026-02-20'] = { minutes: 15, sessions: 1, completedItems: ['podcast'] };
cs.grammarProgress['cs-sentence-1'] = { attempts: 2, correct: 1, streak: 1, needsReview: false, dueDate: '2026-03-02', lastRewardDate: '2026-02-20' };
cs.grammarSession = { lessonId: 'cs-sentence-1', exerciseIndex: 2, assisted: true };
rich.streak = { current: 5, best: 9, lastActiveDate: '2026-02-20' };
api.StorageService.save(rich);
const roundTrip = load();
assert.deepEqual(throughJson(roundTrip), throughJson(rich), 'a complete state survives a save/load round trip');
// load() always materialises the optional session key, JSON drops it again.
assert.equal(roundTrip.languages.en.grammarSession, undefined);
assert('grammarSession' in roundTrip.languages.en, 'the optional grammarSession key is always present after a load');
assert.equal(JSON.parse(memory.get(KEY)).languages.cs.grammarSession.assisted, true, 'the raw payload keeps the nested session');
count += 4;

// --- Helpers used by the rest of the app ---
memory.clear();
const helperState = api.getInitialState();
assert.deepEqual(api.StorageService.getLangProgress(helperState, 'ja'), api.getInitialProgress(), 'an unknown language returns a default progress');
const ensured = api.StorageService.ensureLangProgress(helperState, 'ja');
assert.equal(helperState.languages.ja, ensured, 'ensureLangProgress attaches the progress to the state');
assert.deepEqual(api.StorageService.getLangProgress(helperState, 'ja'), ensured, 'the attached progress is returned afterwards');
count += 3;

const today = api.getLocalDateKey();
const streakState = api.getInitialState();
const firstStreak = api.StorageService.updateStreak(streakState);
assert.equal(firstStreak.current, 1);
assert.equal(streakState.streak.best, 1);
assert.equal(streakState.streak.lastActiveDate, today);
assert.deepEqual(streakState.history, [today]);
assert.equal(api.StorageService.updateStreak(streakState).updated, false, 'a second call on the same day changes nothing');
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const continued = api.getInitialState();
continued.streak = { current: 4, best: 4, lastActiveDate: api.getLocalDateKey(yesterday) };
assert.equal(api.StorageService.updateStreak(continued).current, 5, 'a consecutive day extends the streak');
const brokenStreak = api.getInitialState();
brokenStreak.streak = { current: 3, best: 3, lastActiveDate: '2020-01-01' };
assert.equal(api.StorageService.updateStreak(brokenStreak).current, 1, 'a gap restarts the streak');
assert.deepEqual(api.StorageService.getRank(0), { currentRank: 'Новичок', nextRank: 'Ученик', nextXp: 100 });
assert.deepEqual(api.StorageService.getRank(2000), { currentRank: 'Мастер', nextRank: null, nextXp: 1500 });
assert.deepEqual(api.StorageService.getRank(-10), { currentRank: 'Новичок', nextRank: 'Ученик', nextXp: 100 }, 'a negative xp falls into the first rank');
count += 10;

const taskState = api.getInitialState();
const taskIds = ['task-a', 'task-b'];
assert.equal(api.StorageService.recordDailyTask(taskState, 'fr', { id: 'task-a', minutes: 5, reviewedWords: 2, newWords: 1 }, taskIds), true);
assert.equal(api.StorageService.recordDailyTask(taskState, 'fr', { id: 'task-a', minutes: 5, reviewedWords: 2, newWords: 1 }, taskIds), false, 'the same task cannot be recorded twice');
assert.equal(taskState.xp, 3);
assert.equal(api.StorageService.recordDailyTask(taskState, 'fr', { id: 'task-b', minutes: 5 }, taskIds), true);
assert.equal(taskState.xp, 11, 'completing the plan adds the session bonus');
assert.equal(taskState.languages.fr.dailyActivity[today].sessions, 1);
assert.deepEqual(taskState.languages.fr.dailyActivity[today].completedTasks, ['task-a', 'task-b']);
assert.deepEqual(
  throughJson(load().languages.fr.dailyActivity[today]),
  throughJson(taskState.languages.fr.dailyActivity[today]),
  'the daily activity is persisted'
);
count += 7;

const unlockState = api.getInitialState();
api.StorageService.ensureLangProgress(unlockState, 'en').doneLessons.l1 = { score: 9, pct: 100, date: today };
const unlocked = api.StorageService.checkAndUnlockAchievements(unlockState, () => {});
check(unlocked.length > 0, 'finishing a lesson unlocks an achievement');
assert.deepEqual(api.StorageService.checkAndUnlockAchievements(unlockState, () => {}), [], 'an achievement is not unlocked twice');
count++;

// A rewritten payload must not resurrect anything the sanitiser removed.
memory.clear();
write({
  languages: { en: { srsData: { broken: { wordId: 'broken', interval: 'abc', repetition: 0, efactor: 2.5, dueDate: '2026-01-01', lastReviewed: '2026-01-01' } } } },
  customLessons: [{ id: 'x', title: 'x', sent: 'broken' }],
});
const finalLoad = load();
assert.deepEqual(finalLoad.languages.en.srsData, {}, 'a broken card does not come back after a reload');
assert.deepEqual(finalLoad.customLessons, [], 'a broken custom lesson does not come back after a reload');
assert.deepEqual(
  Object.keys(api.SRSService.createDefaultItem('x')),
  ['wordId', 'interval', 'repetition', 'efactor', 'dueDate', 'lastReviewed'],
  'a fresh card has exactly the SRSItem fields'
);
count += 3;

// --- The study plan must not invent English words for other languages ---
const lessonWordIdsOf = (lesson) => {
  const ids = [];
  lesson.sent.flat().forEach((piece) => {
    if (typeof piece !== 'string' && piece.id && !ids.includes(piece.id)) ids.push(piece.id);
  });
  return ids;
};
const planTask = (plan, type) => plan.tasks.find((task) => task.type === type);

memory.clear();
for (const lang of ['en', 'es', 'de', 'fr', 'it', 'ja', 'sk', 'cs']) {
  const plan = api.buildStudyPlan(api.getInitialState(), lang, '2026-02-20');
  const skill = planTask(plan, 'lesson');
  const fresh = planTask(plan, 'new-words');
  check(plan.tasks.length === 3, 'the plan has three tasks for ' + lang);
  check(plan.totalMinutes === 15 && plan.completedMinutes === 0, 'the plan totals 15 minutes for ' + lang);
  check(plan.completed === false, 'a fresh plan is not completed for ' + lang);
  check(Boolean(skill), 'a fresh plan starts with a lesson for ' + lang);
  check(api.LESSONS.some((lesson) => lesson.id === skill.targetId), 'the lesson task points at a real lesson for ' + lang);
  const recommended = api.LESSONS.find((lesson) => lesson.id === skill.targetId);
  const knownIds = lessonWordIdsOf(recommended);
  check(fresh.itemCount > 0 && fresh.itemCount <= 5, 'new words come from the recommended lesson for ' + lang);
  check(knownIds.includes(fresh.targetId), 'the first suggested word belongs to the recommended lesson for ' + lang);
  check(Boolean(api.WORD_MAP[fresh.targetId]), 'the suggested word exists in the dictionary for ' + lang);
}

// Every lesson finished: the plan must degrade to a valid, empty new-word task.
memory.clear();
const finished = api.getInitialState();
const finishedProgress = api.StorageService.ensureLangProgress(finished, 'ja');
api.LESSONS.forEach((lesson) => {
  finishedProgress.doneLessons[lesson.id] = { score: 9, pct: 100, date: '2026-02-20' };
});
api.StorageService.save(finished);
const finishedPlan = api.buildStudyPlan(api.StorageService.load(), 'ja', '2026-02-20');
const finishedNewWords = planTask(finishedPlan, 'new-words');
assert.deepEqual(finishedPlan.tasks.map((task) => task.id), ['daily-2026-02-20-review', 'daily-2026-02-20-new-words', 'daily-2026-02-20-grammar'], 'a finished catalogue falls back to the grammar task');
assert.equal(finishedNewWords.itemCount, 0, 'no lesson means no new words');
assert.equal(finishedNewWords.newWords, 0);
assert.equal('targetId' in finishedNewWords, false, 'the empty plan carries no target id at all');
assert.equal(finishedPlan.totalMinutes, 15, 'the plan stays valid without a lesson');
assert.equal(finishedNewWords.title, 'Добавить новые слова');
count += 15;

// A corrupted weak-lesson percentage must not turn the plan into NaN sorting.
memory.clear();
const corruptPlan = api.getInitialState();
api.LESSONS.slice(0, 3).forEach((lesson) => {
  corruptPlan.languages.en.doneLessons[lesson.id] = { score: 1, pct: '80', date: '2026-02-20' };
});
const corruptResult = api.buildStudyPlan(corruptPlan, 'en', '2026-02-20');
assert(planTask(corruptResult, 'lesson'), 'a corrupt pct never removes the lesson task');
assert(corruptResult.tasks.every((task) => task.minutes === 5), 'the task minutes stay numeric');
count += 2;

api.StorageService.reset();
assert.equal(localStorage.getItem(KEY), null, 'reset clears the payload');
assert.deepEqual(load(), api.getInitialState(), 'the app starts fresh after a reset');
count += 2;

console.log('PASS: ' + count + ' storage cases — initial state, broken payloads, unknown-key removal, SRS/doneLesson/customLesson validation, legacy migration, language isolation, round trip, streak and daily task helpers, study plan without invented English words.');
