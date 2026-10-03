import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    contents: "export * from './src/services/storageService'; export * from './src/services/srsService'; export * from './src/services/studyPlanService'; export * from './src/services/grammarService'; export * from './src/services/immersionProfile'; export * from './src/data/lessons'; export * from './src/data/words'; export * from './src/data/grammar';",
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
  hapticEnabled: true,
  reminderEnabled: true,
  reminderTime: '20:00',
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
  depthLessons: 0,
  learnedWords: [],
  doneLessons: {},
  srsData: {},
  testLvl: null,
  dailyActivity: {},
  listeningActivity: {},
  grammarProgress: {},
});
count += 2;
assert.equal(Object.keys(initial).length, 17, 'UserState has exactly 17 known fields');
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
const storedUserId = '11111111-2222-3333-4444-555555555555';
write({
  onboarded: true,
  evil: 'root',
  isAdmin: true,
  languages: { en: { immersion: 40, hack: 1, nested: { deep: true } }, xx: { immersion: 90 } },
  account: { email: 'a@b.c', isAuth: true, userId: storedUserId, tier: 'pro', subscriptionPlan: 'lifetime', subscribedDate: '2026-01-01', secret: 'leak' },
  streak: { current: 3, best: 9, lastActiveDate: '2026-01-01', injected: 'x' },
  history: ['2026-01-01', 5, null, '2026-01-02'],
  achievements: ['first', 7, 'five_lessons'],
  customLessons: [],
  extra: { nested: 'deep' },
});
const clean = load();
assert.deepEqual(Object.keys(clean).sort(), [
  'account', 'achievements', 'avatar', 'currentLang', 'customLessons', 'darkMode', 'hapticEnabled', 'history',
  'languages', 'name', 'onboarded', 'perfectCount', 'reminderEnabled', 'reminderTime', 'soundEnabled', 'streak', 'xp',
].sort(), 'load() returns exactly the known UserState fields');
assert.deepEqual(Object.keys(clean.languages), ['en'], 'an unsupported language code is dropped');
assert.deepEqual(Object.keys(clean.languages.en).sort(), [
  'dailyActivity', 'depthLessons', 'doneLessons', 'grammarProgress', 'grammarSession', 'immersion',
  'learnedWords', 'listeningActivity', 'srsData', 'testLvl',
].sort(), 'a language progress exposes exactly the known fields');
assert.deepEqual(Object.keys(clean.account).sort(), [
  'email', 'isAuth', 'name', 'subscribedDate', 'subscriptionPlan', 'tier', 'userId',
].sort(), 'the account keeps only declared fields');
assert.deepEqual(Object.keys(clean.streak), ['current', 'best', 'lastActiveDate']);
assert.equal(clean.streak.current, 3);
assert.equal(clean.streak.best, 9);
assert.equal(clean.languages.en.immersion, 40, 'a valid stored value is preserved');
assert.equal(clean.account.tier, 'free', 'paid access stays disabled');
assert.equal(clean.account.userId, storedUserId, 'the session owner survives a reload');
assert.equal(clean.account.subscriptionPlan, 'lifetime');
assert.equal(clean.account.subscribedDate, '2026-01-01');
assert.equal(clean.account.isAuth, true);
assert.deepEqual(clean.history, ['2026-01-01', '2026-01-02'], 'history keeps only date strings');
assert.deepEqual(clean.achievements, ['first', 'five_lessons'], 'achievements keep only ids');
assert.equal(clean.evil, undefined, 'an unknown root key is not part of the state');
count += 10;

// --- A session is only believed when it names a user -------------------------
// The local password profile is gone, so nothing on the device can re-verify a
// sign-in. A bare `isAuth: true` is exactly the state an older build wrote, and
// honouring it would show a signed-in header over a device that cannot sync.
for (const stale of [undefined, '', 42, {}]) {
  memory.clear();
  write({ onboarded: true, account: { email: 'a@b.c', isAuth: true, userId: stale } });
  const loaded = load();
  assert.equal(loaded.account.isAuth, false, 'a session without a user id is not a session');
  assert.equal(loaded.account.userId, undefined, 'a non-string user id is dropped');
  assert.equal(loaded.account.email, 'a@b.c', 'the rest of the account survives');
  count += 3;
}

// A user id that is not a UUID is kept: it is an opaque key, and refusing to
// store it would sign the person out for a formatting reason.
memory.clear();
write({ onboarded: true, account: { isAuth: true, userId: 'opaque-but-present' } });
assert.equal(load().account.isAuth, true, 'a named session survives');
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
  userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
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

// --- The new-word allowance has to shrink with the backlog ---
// A flat five-a-day is what grew the backlog in the first place: every new
// word is scheduled ahead of cards that were never reviewed.
assert.equal(api.newWordAllowance(0), 5, 'a clean slate allows five new words');
assert.equal(api.newWordAllowance(-5), 5, 'a nonsense negative count is treated as clean');
assert.equal(api.newWordAllowance(NaN), 5, 'NaN is treated as clean, not as a floor');
assert.equal(api.newWordAllowance(1), 5, 'one overdue card changes nothing');
assert.equal(api.newWordAllowance(30), 5, '30 overdue still allows five');
assert.equal(api.newWordAllowance(31), 4, 'the first step down happens just past 30');
assert.equal(api.newWordAllowance(70), 4, '70 overdue is still four');
assert.equal(api.newWordAllowance(71), 3, 'the second step down happens just past 70');
assert.equal(api.newWordAllowance(120), 3, '120 overdue is still three');
assert.equal(api.newWordAllowance(121), 2, 'the floor is reached just past 120');
assert.equal(api.newWordAllowance(1540), 2, 'a huge backlog floors at two, never zero');
assert.equal(api.newWordAllowance(Number.MAX_SAFE_INTEGER), 2, 'an absurd count still floors at two');
// The whole catalogue holds ~164 distinct lesson words, so a per-20 divisor
// would put every step past anything real state produces. These assertions pin
// that reasoning so the bands cannot drift out of range again.
for (const due of [0, 1, 30, 31, 70, 71, 120, 121, 164, 1540]) {
  const value = api.newWordAllowance(due);
  check(value >= 2 && value <= 5, 'the allowance stays in 2..5 for ' + due + ' overdue');
}
check(api.newWordAllowance(164) < api.newWordAllowance(0), 'a full-catalogue backlog is visibly smaller than a clean slate');
count += 26;

// The allowance must reach the plan, not just the helper: a learner with a
// backlog should be offered fewer new words and told why.
memory.clear();
const backlog = api.getInitialState();
const backlogProgress = api.StorageService.ensureLangProgress(backlog, 'ja');
// The backlog is drawn from every lesson's own words rather than from the whole
// dictionary: these are the words the plan will actually schedule, and the
// allowance reacts at 80, so the fixture has to clear that mark.
// The backlog is drawn from every lesson *except* the first one, which is the
// lesson the plan will recommend. Leaving that lesson's words unlearned is what
// makes the new-word task have something to offer; if its words were already
// in the backlog the task would correctly report zero and the test would pass
// without ever exercising the description it checks.
const BACKLOG_MIN = 100;
const openLesson = api.LESSONS[0];
const openWordIds = new Set(lessonWordIdsOf(openLesson));
const backlogWordIds = [];
for (const lesson of api.LESSONS) {
  for (const wordId of lessonWordIdsOf(lesson)) {
    if (openWordIds.has(wordId)) continue;
    if (!backlogWordIds.includes(wordId)) backlogWordIds.push(wordId);
  }
}
assert(backlogWordIds.length >= BACKLOG_MIN, 'the catalogue supplies at least ' + BACKLOG_MIN + ' lesson words outside the first lesson, got: ' + backlogWordIds.length);
backlogWordIds.forEach((wordId) => {
  backlogProgress.learnedWords.push(wordId);
  backlogProgress.srsData[wordId] = {
    wordId,
    interval: 1,
    repetition: 1,
    efactor: 2.6,
    dueDate: '2020-01-01',
    lastReviewed: '2020-01-01',
  };
});
api.StorageService.save(backlog);
const loadedBacklog = api.StorageService.load();
const backlogPlan = api.buildStudyPlan(loadedBacklog, 'ja', '2026-02-20');
const backlogReview = planTask(backlogPlan, 'review');
const backlogFresh = planTask(backlogPlan, 'new-words');
check(backlogReview.description.includes(String(backlogWordIds.length)), 'the review task counts the real backlog, got: ' + backlogReview.description);
// A single round takes ten cards, so the plan has to admit the rest is still
// waiting — "10 of 154" with no mention of the other 144 reads as if they do
// not exist.
check(backlogReview.description.includes('раунд'), 'a long backlog is reported in rounds, got: ' + backlogReview.description);
const expectedRounds = Math.ceil(backlogWordIds.length / 10);
check(backlogReview.description.includes(String(expectedRounds)), 'the round count matches the backlog, expected ' + expectedRounds + ', got: ' + backlogReview.description);
check(backlogFresh.itemCount > 0, 'the recommended lesson still offers new words, got: ' + backlogFresh.itemCount);
check(backlogFresh.itemCount < 5, 'new words shrink under a backlog, got: ' + backlogFresh.itemCount);
check(backlogFresh.description.includes(String(backlogWordIds.length)), 'the new-word task explains the shrink with the backlog number');
check(backlogReview.itemCount === 10, 'a single session still caps at ten cards');
check(backlogFresh.itemCount === api.newWordAllowance(backlogWordIds.length), 'the plan uses the allowance for this backlog size');
count += 8;

// A small backlog must NOT claim there are rounds to grind through.
memory.clear();
const smallBacklog = api.getInitialState();
const smallProgress = api.StorageService.ensureLangProgress(smallBacklog, 'ja');
lessonWordIdsOf(api.LESSONS[0]).slice(0, 4).forEach((wordId) => {
  smallProgress.learnedWords.push(wordId);
  smallProgress.srsData[wordId] = { wordId, interval: 1, repetition: 1, efactor: 2.6, dueDate: '2020-01-01', lastReviewed: '2020-01-01' };
});
api.StorageService.save(smallBacklog);
const smallPlan = api.buildStudyPlan(api.StorageService.load(), 'ja', '2026-02-20');
const smallReview = planTask(smallPlan, 'review');
check(!smallReview.description.includes('раунд'), 'a small backlog is not reported in rounds, got: ' + smallReview.description);
check(smallReview.description.includes('4 слова'), 'four overdue cards read as "4 слова", got: ' + smallReview.description);
check(api.newWordAllowance(4) === 5, 'a small backlog does not shrink new words');

// The plural must survive the awkward teens and the 1/2/4 boundaries, or the
// count reads as machine output.
memory.clear();
const pluralState = api.getInitialState();
const pluralProgress = api.StorageService.ensureLangProgress(pluralState, 'ja');
const pluralWords = [];
for (const lesson of api.LESSONS) {
  for (const wordId of lessonWordIdsOf(lesson)) {
    if (!pluralWords.includes(wordId)) pluralWords.push(wordId);
  }
}
assert(pluralWords.length > 20, 'the catalogue supplies enough words for plural cases, got: ' + pluralWords.length);
const markOverdue = (count) => {
  memory.clear();
  const state = api.getInitialState();
  const progress = api.StorageService.ensureLangProgress(state, 'ja');
  pluralWords.slice(0, count).forEach((wordId) => {
    progress.learnedWords.push(wordId);
    progress.srsData[wordId] = { wordId, interval: 1, repetition: 1, efactor: 2.6, dueDate: '2020-01-01', lastReviewed: '2020-01-01' };
  });
  api.StorageService.save(state);
  return planTask(api.buildStudyPlan(api.StorageService.load(), 'ja', '2026-02-20'), 'review').description;
};
check(markOverdue(1).includes('1 слово'), 'one card reads as "1 слово", got: ' + markOverdue(1));
check(markOverdue(2).includes('2 слова'), 'two cards read as "2 слова", got: ' + markOverdue(2));
check(markOverdue(5).includes('5 слов'), 'five cards read as "5 слов", got: ' + markOverdue(5));
check(markOverdue(11).includes('11 слов'), 'eleven cards read as "11 слов", got: ' + markOverdue(11));
check(markOverdue(12).includes('12 слов'), 'twelve cards read as "12 слов", got: ' + markOverdue(12));
check(markOverdue(21).includes('21 слово'), 'twenty-one cards read as "21 слово", got: ' + markOverdue(21));
count += 12;

// --- Overdue grammar must reach the daily plan ---
// `recordGrammarAnswer` already schedules a wrong answer for today. Nothing
// collected those into the plan, so a forgotten rule waited unnoticed.
memory.clear();
const grammarState = api.getInitialState();
const grammarProgress = api.StorageService.ensureLangProgress(grammarState, 'sk');
const skTopic = api.GRAMMAR.sk[0];
const skExercises = api.buildGrammarExercises(skTopic, 'sk');
assert(skExercises.length > 0, 'the fixture topic has exercises to mark wrong');

// Two topics marked wrong, so "which one is offered" is a real question.
const otherTopic = api.GRAMMAR.sk[1];
let withGrammar = grammarState;
skExercises.slice(0, 3).forEach((exercise) => {
  withGrammar = api.recordGrammarAnswer(withGrammar, 'sk', exercise.id, false, false);
});
withGrammar = api.recordGrammarAnswer(withGrammar, 'sk', api.buildGrammarExercises(otherTopic, 'sk')[0].id, false, false);
api.StorageService.save(withGrammar);

const grammarPlan = api.buildStudyPlan(api.StorageService.load(), 'sk', '2026-02-20');
const grammarTask = planTask(grammarPlan, 'grammar');
check(Boolean(grammarTask), 'a plan with overdue grammar gets a grammar task');
check(grammarTask.title === 'Вернуть забытые правила', 'the task names the reason, got: ' + grammarTask.title);
check(grammarTask.itemCount === 4, 'the task counts every overdue exercise, got: ' + grammarTask.itemCount);
check(Boolean(grammarTask.targetId), 'the task points at a real topic');
check(api.GRAMMAR.sk.some((topic) => topic.id === grammarTask.targetId), 'the target is a real grammar topic');
check(grammarTask.description.includes(skTopic.title) || grammarTask.description.includes(otherTopic.title), 'the task names the topic');
// The lesson task must survive: swapping it out would stop offering new
// lessons for as long as the grammar backlog lasted.
check(Boolean(planTask(grammarPlan, 'lesson')), 'the lesson task survives alongside overdue grammar');
check(grammarPlan.tasks.length === 4, 'overdue grammar adds a fourth task, got: ' + grammarPlan.tasks.length);
check(grammarPlan.totalMinutes === 20, 'the fourth task costs its five minutes, got: ' + grammarPlan.totalMinutes);
count += 9;

// A topic that was answered correctly is not overdue and must not be offered.
memory.clear();
const masteredState = api.getInitialState();
let mastered = masteredState;
skExercises.slice(0, 2).forEach((exercise) => {
  mastered = api.recordGrammarAnswer(mastered, 'sk', exercise.id, true, false);
});
api.StorageService.save(mastered);
const masteredDue = api.grammarLessonStats(api.StorageService.load(), skTopic, 'sk').due;
check(masteredDue === 0, 'two independent correct answers leave nothing due, got: ' + masteredDue);
const masteredPlan = api.buildStudyPlan(api.StorageService.load(), 'sk', '2026-02-20');
// The catalogue is not finished for sk, so the skill task is a lesson and the
// only thing this asserts is that nothing overdue produced a fourth task.
check(masteredPlan.tasks.every((task) => task.id !== 'daily-2026-02-20-grammar-review'), 'a clean grammar record never reaches the plan');
check(masteredPlan.tasks.length === 3, 'a clean plan stays at three tasks, got: ' + masteredPlan.tasks.length);
check(masteredPlan.totalMinutes === 15, 'a clean plan stays at fifteen minutes, got: ' + masteredPlan.totalMinutes);
count += 3;

// An unreadable dueDate must not hide an item forever — the same reasoning as
// SRSService.isDue.
memory.clear();
const blankDateState = api.getInitialState();
const blankDateProgress = api.StorageService.ensureLangProgress(blankDateState, 'sk');
const blankExercise = skExercises[0];
blankDateProgress.grammarProgress[blankExercise.id] = {
  attempts: 1, correct: 0, streak: 0, needsReview: true, dueDate: '', lastRewardDate: '',
};
api.StorageService.save(blankDateState);
const blankPlan = api.buildStudyPlan(api.StorageService.load(), 'sk', '2026-02-20');
check(planTask(blankPlan, 'grammar').itemCount >= 1, 'a blank dueDate is treated as due, got: ' + planTask(blankPlan, 'grammar').itemCount);
count += 1;

// The clean-state assertions in the language sweep above run against a plan with
// no grammar progress at all; pin that the fallback grammar task is still the
// generic one when nothing is overdue, since that is the path most learners hit.
memory.clear();
// The generic grammar task is the fallback that appears only once the whole
// lesson catalogue is done — a fresh state still gets a lesson instead.
const fallbackState = api.getInitialState();
const fallbackProgress = api.StorageService.ensureLangProgress(fallbackState, 'ja');
api.LESSONS.forEach((lesson) => {
  fallbackProgress.doneLessons[lesson.id] = { score: 9, pct: 100, date: '2026-02-19' };
});
api.StorageService.save(fallbackState);
const fallbackPlan = api.buildStudyPlan(api.StorageService.load(), 'ja', '2026-02-20');
const fallbackGrammar = planTask(fallbackPlan, 'grammar');
check(Boolean(fallbackGrammar), 'a finished catalogue still offers grammar');
check(fallbackGrammar.title === 'Одна грамматическая тема', 'the generic title returns when nothing is overdue, got: ' + fallbackGrammar.title);
check('targetId' in fallbackGrammar === false, 'no overdue topic means no target id');
check(fallbackGrammar.itemCount === undefined, 'a task with nothing to review claims no count');
check(fallbackPlan.tasks.length === 3, 'the generic fallback is still three tasks, got: ' + fallbackPlan.tasks.length);
count += 5;

// A corrupted grammarProgress payload must not throw out of the plan.
memory.clear();
const corruptGrammar = api.getInitialState();
const corruptGrammarProgress = api.StorageService.ensureLangProgress(corruptGrammar, 'sk');
corruptGrammarProgress.grammarProgress = { 'sk-nonsense': 7, 'sk-other': { attempts: 'x' } };
api.StorageService.save(corruptGrammar);
const corruptGrammarPlan = api.buildStudyPlan(api.StorageService.load(), 'sk', '2026-02-20');
check(corruptGrammarPlan.tasks.length === 3, 'a corrupt grammar payload still yields three tasks');
check(corruptGrammarPlan.tasks.every((task) => task.minutes === 5), 'the minutes stay numeric under a corrupt grammar payload');
check(corruptGrammarPlan.tasks.every((task) => task.id !== 'daily-2026-02-20-grammar-review'), 'ids that match no exercise produce no grammar task');
count += 3;

// --- The dial only advances after the depth has been held ---
// The first engine stepped up on every passed lesson and reached full
// immersion by lesson fifteen. A depth has to be lived at for a run of lessons
// before the next step means anything.
const held = api.IMMERSION_LESSONS_PER_STEP;
check(held >= 2, 'the engine holds a depth for more than one lesson, got ' + held);

const depthPresets = api.IMMERSION_PRESETS.map((preset) => preset.value);
const stepUp = (current, at, pct = 95) => api.decideDepth(current, at, { pct, passed: true });
const stepDown = (current, at = 0) => api.decideDepth(current, at, { pct: 30, passed: false });

// A single strong lesson must not move anything.
const single = stepUp(60, 0, 100);
check(single.immersion === 60, 'one strong lesson holds the depth, got ' + single.immersion);
check(single.moved === null, 'one strong lesson reports no move');
check(single.lessonsAtDepth === 1, 'the run counts the lesson, got ' + single.lessonsAtDepth);

// The run completes but the last lesson was weak: stay and start again.
const weakEnd = stepUp(60, held - 1, 75);
check(weakEnd.immersion === 60, 'a run ending weakly holds the depth, got ' + weakEnd.immersion);
check(weakEnd.moved === null, 'a weak finish earns no move');
check(weakEnd.lessonsAtDepth === 0, 'a completed run resets the counter, got ' + weakEnd.lessonsAtDepth);

// The run completes and the last lesson is strong: step up once.
const earned = stepUp(60, held - 1, 95);
check(earned.immersion === 80, 'a held, strong run steps up one preset, got ' + earned.immersion);
check(earned.moved === 'up', 'the move is reported as up');
check(earned.lessonsAtDepth === 0, 'moving resets the run, got ' + earned.lessonsAtDepth);

// At the top there is nowhere to go, and the run still resets.
const atTop = stepUp(100, held - 1, 100);
check(atTop.immersion === 100, 'the top preset stays put, got ' + atTop.immersion);
check(atTop.moved === null, 'the top preset reports no move');
check(atTop.lessonsAtDepth === 0, 'a spent run at the top still resets');
count += 11;

// A failed lesson backs off immediately, at any point in a run.
for (const current of depthPresets) {
  const down = stepDown(current);
  if (current === depthPresets[0]) {
    check(down.immersion === current, 'the lowest preset cannot step down, got ' + down.immersion);
    check(down.moved === null, 'the lowest preset reports no move');
  } else {
    const expected = depthPresets[depthPresets.indexOf(current) - 1];
    check(down.immersion === expected, 'a failure steps down one preset from ' + current + ', got ' + down.immersion);
    check(down.moved === 'down', 'a failure reports a move down from ' + current);
  }
  check(down.lessonsAtDepth === 0, 'backing off resets the run from ' + current);
}
// Backing off mid-run still happens: the run length is not a veto.
const midRun = stepDown(80, 2);
check(midRun.moved === 'down', 'a failure mid-run still backs off, got ' + midRun.moved);
count += depthPresets.length * 3 + 1;

// Every produced value must be a real preset, so the caption and the number
// cannot disagree.
for (const current of depthPresets) {
  for (let at = 0; at <= held + 2; at += 1) {
    for (const pct of [0, 30, 64, 65, 80, 89, 90, 100]) {
      const decision = api.decideDepth(current, at, { pct, passed: pct >= 65 });
      check(depthPresets.includes(decision.immersion),
        'the decision from ' + current + '/' + at + '/' + pct + '% lands on a real preset');
      check(decision.lessonsAtDepth >= 0 && decision.lessonsAtDepth <= held,
        'the run counter stays in range from ' + current + '/' + at + '/' + pct + '%, got ' + decision.lessonsAtDepth);
    }
  }
}

// The full climb a strong learner would make, to pin the pace that was wrong
// before: from 20% it must take a full run per step, not one lesson per step.
let depth = 20;
let at = 0;
let lessonsToTop = 0;
while (depth !== 100 && lessonsToTop < 200) {
  const decision = stepUp(depth, at, 100);
  depth = decision.immersion;
  at = decision.lessonsAtDepth;
  lessonsToTop += 1;
}
check(depth === 100, 'a perfect learner does eventually reach full immersion');
check(lessonsToTop >= (depthPresets.length - 1) * held,
  'reaching the top costs at least one full run per step, got ' + lessonsToTop + ' lessons');
check(lessonsToTop >= 15,
  'a perfect learner needs more than fifteen lessons to reach the top, got ' + lessonsToTop);
count += 3;

// A hand-set depth outranks the engine.
localStorage.removeItem('pogruzhenie_immersion_manual_v1');
check(api.isImmersionManual() === false, 'the dial starts under engine control');
api.noteManualImmersion();
check(api.isImmersionManual() === true, 'touching the dial takes control away from the engine');
api.clearManualImmersion();
check(api.isImmersionManual() === false, 'control can be handed back to the engine');
count += 3;

// `depthLessons` has to survive a round trip, and a corrupt value must not
// become a free skip.
memory.clear();
const depthState = api.getInitialState();
const depthProgress = api.StorageService.ensureLangProgress(depthState, 'sk');
depthProgress.immersion = 60;
depthProgress.depthLessons = 2;
api.StorageService.save(depthState);
const depthLoaded = api.StorageService.load();
check(depthLoaded.languages.sk.depthLessons === 2, 'the run counter survives a reload, got ' + depthLoaded.languages.sk.depthLessons);
check(depthLoaded.languages.sk.immersion === 60, 'the depth survives a reload');

memory.clear();
const corruptDepth = api.getInitialState();
const corruptDepthProgress = api.StorageService.ensureLangProgress(corruptDepth, 'sk');
corruptDepthProgress.immersion = 60;
corruptDepthProgress.depthLessons = 'lots';
api.StorageService.save(corruptDepth);
check(api.StorageService.load().languages.sk.depthLessons === 0, 'a corrupt run counter reads as zero');

memory.clear();
const absentDepth = api.getInitialState();
const absentProgress = api.StorageService.ensureLangProgress(absentDepth, 'sk');
absentProgress.immersion = 60;
delete absentProgress.depthLessons;
api.StorageService.save(absentDepth);
check(api.StorageService.load().languages.sk.depthLessons === 0, 'an absent run counter reads as zero');
check(api.getInitialProgress().depthLessons === 0, 'a fresh language starts with no run');
count += 5;

// The dial is written from exactly two kinds of place: a handler the learner
// triggered, and the step decision — and the second is only reached behind the
// manual flag. A third write would be the regression this guard exists for.
// Strips comments so a guard reads the code, not the explanation of why the
// code looks like that.
const codeOnly = (file) => readFileSync(file, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');
const readerCode = codeOnly('src/components/ReaderView.tsx');
const appCode = codeOnly('src/App.tsx');
const sidebarCode = codeOnly('src/components/Sidebar.tsx');
// `=== 100` and `!== preset.value` are reads in markup, not writes.
const dialWrites = (code) => (code.match(/\.immersion\s*=[^=]/g) || []).length;
check(dialWrites(readerCode) === 2, 'the reader writes the dial from the slider and from the step, found ' + dialWrites(readerCode));
check(dialWrites(appCode) === 1, 'the sidebar writes the dial from its slider only, found ' + dialWrites(appCode));
check(dialWrites(sidebarCode) === 0, 'the sidebar component itself does not write the dial, found ' + dialWrites(sidebarCode));
// The engine write must sit behind the manual check, or the flag means nothing.
check(/if \(!isImmersionManual\(\)\)/.test(readerCode), 'the engine only runs when the dial is not hand-set');
const engineWrite = readerCode.indexOf('decideDepth(');
const guard = readerCode.indexOf('if (!isImmersionManual())');
check(guard >= 0 && engineWrite > guard, 'the manual check comes before the step decision');
// Both hand-set paths record the choice, so a deliberate depth is never
// overwritten by the engine later.
check(/noteManualImmersion\(\)/.test(readerCode), 'the reader records a hand-set depth');
check(/noteManualImmersion\(\)/.test(appCode), 'the sidebar records a hand-set depth too');
// And there must be a way back, or one stray tap on the slider switches the
// engine off permanently with no undo.
check(/clearManualImmersion\(\)/.test(readerCode), 'the reader can hand control back to the engine');
check(/clearManualImmersion\(\)/.test(sidebarCode), 'the sidebar can hand control back to the engine');
check(/Вернуть автоматический режим/.test(readerCode), 'the reader offers the way back');
check(/Вернуть автоматический режим/.test(sidebarCode), 'the sidebar offers the way back');
// The old engine raised the depth by 5% on every first pass and the reader told
// the learner exactly that. The copy must not keep promising it.
check(!/\+5%/.test(readerCode), 'the reader does not promise the removed +5% step');
check(/IMMERSION_LESSONS_PER_STEP/.test(readerCode), 'the reader explains the run instead');
// A change of depth always starts a new run, or the step would fire immediately
// after the learner moved the dial.
const resets = ((readerCode + appCode).match(/depthLessons\s*=\s*0/g) || []).length;
check(resets >= 1, 'a manual change resets the consolidation run, found ' + resets);
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

// --- The weak-lesson rule is a fixed 80%, on purpose ---
// A relative threshold was tried here and reverted: on a tight distribution
// (every lesson between 83 and 88) nothing sits five points under the average,
// so it never fires, and on a strong record it fires on a 93% lesson the learner
// clearly knows. These assertions pin the fixed behaviour that was kept.
const weakLessonTitle = (plan) => planTask(plan, 'lesson').title;
const recordPlan = (percentages, lang = 'ja') => {
  memory.clear();
  const state = api.getInitialState();
  const progress = api.StorageService.ensureLangProgress(state, lang);
  api.LESSONS.forEach((lesson, index) => {
    if (percentages[index] === undefined) return;
    progress.doneLessons[lesson.id] = { score: 14, pct: percentages[index], date: '2026-02-18' };
  });
  api.StorageService.save(state);
  return api.buildStudyPlan(api.StorageService.load(), lang, '2026-02-20');
};

// The learner's actual record: thirteen lessons, thirteen at 100% except one at
// 79% and one at 93%. The 79% must be caught, the 93% must not.
const realShape = recordPlan([100, 100, 100, 100, 93, 100, 79, 100, 100, 100, 100, 100, 100]);
check(weakLessonTitle(realShape) === 'Закрепить слабую тему', 'a 79% lesson is caught, got: ' + weakLessonTitle(realShape));
check(planTask(realShape, 'lesson').targetId === api.LESSONS[6].id, 'the 79% lesson is the one chosen');

// Everything strong: nothing under 80, so the next lesson is offered.
const allStrong = recordPlan([100, 100, 93, 95, 100, 100, 94, 100, 100, 100, 100, 100]);
check(weakLessonTitle(allStrong) === 'Следующий урок погружения', 'a strong record offers the next lesson, got: ' + weakLessonTitle(allStrong));

// Uniformly mediocre: every lesson is a pass, so none is sent back. This is the
// case the relative rule was supposed to catch and could not, and it is correct
// behaviour — passing at 83-88% consistently means the material is known.
const allMediocre = recordPlan([88, 86, 84, 85, 87, 83, 86, 84, 85, 87, 86, 84]);
check(weakLessonTitle(allMediocre) === 'Следующий урок погружения', 'a uniformly passing record offers new material, got: ' + weakLessonTitle(allMediocre));

// One lesson done at 100% is not weak, and one at 40% is.
check(weakLessonTitle(recordPlan([100])) === 'Следующий урок погружения', 'a single perfect lesson is not weak');
check(weakLessonTitle(recordPlan([40])) === 'Закрепить слабую тему', 'a single bad lesson is caught');
count += 7;

// Every lesson finished: reinforcement is all that is left, and it must not
// invent new words for a catalogue with nothing left in it.
const allDoneWeak = recordPlan(api.LESSONS.map(() => 60));
check(weakLessonTitle(allDoneWeak) === 'Закрепить слабую тему', 'a fully passed-but-weak catalogue offers reinforcement');
check(planTask(allDoneWeak, 'lesson').targetId === api.LESSONS[0].id, 'the lowest-scoring lesson is chosen');
count += 2;

api.StorageService.reset();
assert.equal(localStorage.getItem(KEY), null, 'reset clears the payload');
assert.deepEqual(load(), api.getInitialState(), 'the app starts fresh after a reset');
count += 2;

console.log('PASS: ' + count + ' storage cases — initial state, broken payloads, unknown-key removal, SRS/doneLesson/customLesson validation, legacy migration, language isolation, round trip, streak and daily task helpers, study plan without invented English words, backlog-aware new-word allowance, overdue grammar in the plan, and the held-depth immersion dial.');
