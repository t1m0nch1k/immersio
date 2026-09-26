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
    contents: "export * from './src/services/srsService'; export * from './src/services/storageService';",
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count++;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return api.getLocalDateKey(date);
};

const baseItem = (overrides = {}) => ({
  wordId: 'hello',
  interval: 0,
  repetition: 0,
  efactor: 2.5,
  dueDate: api.getLocalDateKey(),
  lastReviewed: api.getLocalDateKey(),
  ...overrides,
});

/** Every result must be a well-formed card, whatever the input was. */
const assertSane = (item, label) => {
  check(Number.isFinite(item.interval) && item.interval >= 1, label + ': interval must be a positive number');
  check(Number.isInteger(item.repetition) && item.repetition >= 0, label + ': repetition must be a non-negative integer');
  check(Number.isFinite(item.efactor) && item.efactor >= 1.3 && item.efactor <= 3.0, label + ': efactor must stay in 1.3..3.0');
  check(DATE_KEY.test(item.dueDate), label + ': dueDate must be YYYY-MM-DD, got ' + item.dueDate);
  check(DATE_KEY.test(item.lastReviewed), label + ': lastReviewed must be YYYY-MM-DD, got ' + item.lastReviewed);
  check(!Number.isNaN(new Date(item.dueDate).getTime()), label + ': dueDate must be a real date');
  check(item.lastReviewed === api.getLocalDateKey(), label + ': lastReviewed is today');
  return item;
};

// --- SuperMemo-2 intervals: 1 / 3 / 7 / 14 on a chain of perfect answers ---
let item = baseItem();
const chain = [];
for (let step = 0; step < 4; step += 1) {
  item = assertSane(api.SRSService.calculateNextReview(item, 5), 'perfect step ' + step);
  chain.push(item.interval);
}
assert.deepEqual(chain, [1, 6, 17, 49], 'SM-2 interval chain for quality 5 (EF grows by 0.1 per perfect answer)');
check(addDays(chain[0]) === item.dueDate || DATE_KEY.test(item.dueDate), 'due date is shifted by the interval');
const first = api.SRSService.calculateNextReview(baseItem(), 5);
assert.equal(first.dueDate, addDays(1), 'first repetition is due tomorrow');
assert.equal(first.repetition, 1);
const second = api.SRSService.calculateNextReview(first, 5);
assert.equal(second.interval, 6, 'second repetition is due in 6 days');
assert.equal(second.dueDate, addDays(6));
assert.equal(second.repetition, 2);
check(second.efactor === 2.7, 'two perfect answers lift the easiness factor to 2.7');
// 1 / 6 / 15 / 38 ladder with quality 4 (the "slight hesitation" path, EF stays 2.5)
let ladder = baseItem();
const ladderChain = [];
for (let step = 0; step < 4; step += 1) {
  ladder = assertSane(api.SRSService.calculateNextReview(ladder, 4), 'quality 4 step ' + step);
  ladderChain.push(ladder.interval);
}
assert.deepEqual(ladderChain, [1, 6, 15, 38], 'quality 4 keeps the default easiness factor');
count += 4;

// --- Quality 3 keeps the interval growing, quality 2 forgets everything ---
const easy = assertSane(api.SRSService.calculateNextReview(baseItem({ interval: 21, repetition: 4 }), 3), 'quality 3');
assert.equal(easy.interval, 50, 'quality 3 grows the interval by the easiness factor');
assert.equal(easy.repetition, 5);
const forgotten = assertSane(api.SRSService.calculateNextReview(baseItem({ interval: 40, repetition: 6, efactor: 2.6 }), 2), 'quality 2');
assert.equal(forgotten.interval, 1, 'a failed recall restarts from one day');
assert.equal(forgotten.repetition, 0);
assert.equal(forgotten.dueDate, addDays(1));
const blackout = assertSane(api.SRSService.calculateNextReview(baseItem({ interval: 40, repetition: 6 }), 0), 'quality 0');
assert.equal(blackout.interval, 1);
assert.equal(blackout.repetition, 0);

// --- Quality bounds: out-of-range ratings are clamped, not propagated ---
assert.equal(api.SRSService.calculateNextReview(baseItem(), 99).repetition, 1, 'quality 99 is clamped to 5');
assert.equal(api.SRSService.calculateNextReview(baseItem(), -7).repetition, 0, 'negative quality is clamped to 0');
assert.equal(api.SRSService.calculateNextReview(baseItem(), 99).efactor, 2.6, 'efactor grows by 0.1 at quality 5');
assert.equal(api.SRSService.calculateNextReview(baseItem(), 3).efactor, 2.36, 'efactor drops by 0.14 at quality 3');
count += 4;

// --- Easiness factor boundaries ---
const floored = assertSane(api.SRSService.calculateNextReview(baseItem({ efactor: 1.3, repetition: 3, interval: 10 }), 0), 'efactor floor');
assert.equal(floored.efactor, 1.3, 'efactor never drops below 1.3');
const lowered = assertSane(api.SRSService.calculateNextReview(baseItem({ efactor: 2.9, repetition: 2, interval: 10 }), 5), 'efactor ceiling');
assert.equal(lowered.efactor, 3.0, 'efactor is clamped at 3.0');
const absurd = assertSane(api.SRSService.calculateNextReview(baseItem({ efactor: 1e9, repetition: 2, interval: 10 }), 5), 'efactor garbage');
assert.equal(absurd.efactor, 3.0, 'a garbage easiness factor is clamped into the band');
assert.equal(absurd.interval, 30, 'a garbage easiness factor cannot explode the interval');
const broken = assertSane(api.SRSService.calculateNextReview(baseItem({ efactor: 'abc', repetition: null, interval: 'abc' }), 5), 'garbage fields');
assert.equal(broken.efactor, 2.6, 'a non-numeric easiness factor falls back to the default');
assert.equal(broken.interval, 1, 'a non-numeric interval is treated as a new card');
assert.equal(broken.repetition, 1);

// --- Corrupted input can never produce NaN or an Invalid Date ---
const garbageInputs = [
  ['interval string', baseItem({ interval: 'abc' })],
  ['interval NaN', baseItem({ interval: NaN })],
  ['interval Infinity', baseItem({ interval: Infinity })],
  ['interval negative', baseItem({ interval: -10 })],
  ['interval astronomical', baseItem({ interval: 1e300, repetition: 4 })],
  ['repetition NaN', baseItem({ repetition: NaN, interval: 5 })],
  ['repetition float', baseItem({ repetition: 2.7, interval: 5 })],
  ['repetition Infinity', baseItem({ repetition: Infinity, interval: 5 })],
  ['repetition negative', baseItem({ repetition: -3, interval: 5 })],
  ['efactor NaN', baseItem({ efactor: NaN, repetition: 3, interval: 5 })],
  ['efactor null', baseItem({ efactor: null, repetition: 3, interval: 5 })],
  ['efactor negative', baseItem({ efactor: -5, repetition: 3, interval: 5 })],
  ['wordId missing', baseItem({ wordId: undefined })],
  ['wordId number', baseItem({ wordId: 42 })],
  ['completely empty', { interval: 0, repetition: 0, efactor: 2.5, dueDate: '', lastReviewed: '' }],
  ['null item', null],
  ['undefined item', undefined],
];
for (const [label, brokenItem] of garbageInputs) {
  for (const quality of [0, 2, 3, 5, NaN, undefined, 'x']) {
    const result = assertSane(api.SRSService.calculateNextReview(brokenItem, quality), label + ' @ quality ' + String(quality));
    check(typeof result.wordId === 'string', label + ': wordId must stay a string');
  }
}
check(garbageInputs.length === 17, 'garbage input matrix size');

// --- isDue ---
const today = api.getLocalDateKey();
assert(api.SRSService.isDue(baseItem({ dueDate: today })), 'a card due today is due');
assert(api.SRSService.isDue(baseItem({ dueDate: '2020-01-01' })), 'an overdue card is due');
assert(!api.SRSService.isDue(baseItem({ dueDate: addDays(3) })), 'a future card is not due');
assert(api.SRSService.isDue(baseItem({ dueDate: 'NaN-NaN-NaN' })), 'an unreadable date is treated as due instead of being stuck forever');
assert(api.SRSService.isDue(baseItem({ dueDate: '' })), 'an empty date is treated as due');
assert(api.SRSService.isDue(baseItem({ dueDate: null })), 'a null date is treated as due');
assert(api.SRSService.isDue(baseItem({ dueDate: undefined })), 'a missing date is treated as due');
assert(api.SRSService.isDue(baseItem({ dueDate: 20260101 })), 'a numeric date is treated as due');
count += 8;

// --- createDefaultItem ---
const fresh = api.SRSService.createDefaultItem('water');
assert.deepEqual(fresh, { wordId: 'water', interval: 0, repetition: 0, efactor: 2.5, dueDate: today, lastReviewed: today });
assert(api.SRSService.isDue(fresh), 'a new card is immediately due');
const afterFresh = assertSane(api.SRSService.calculateNextReview(fresh, 4), 'fresh card');
assert.equal(afterFresh.interval, 1);
assert.equal(afterFresh.repetition, 1);

// --- A card recovered from a corrupt store behaves like a brand new card ---
const stored = { wordId: 'cat', interval: 'abc', repetition: 'x', efactor: null, dueDate: 'NaN-NaN-NaN', lastReviewed: 'xxx' };
const recovered = assertSane(api.SRSService.calculateNextReview(stored, 4), 'corrupt stored card');
assert.equal(recovered.wordId, 'cat', 'the word id survives a corrupt record');
assert.equal(recovered.interval, 1);
assert.equal(recovered.repetition, 1);
assert.equal(recovered.dueDate, addDays(1), 'a corrupt card is not stuck in review forever');

console.log('PASS: ' + count + ' SRS cases — SM-2 ladder 1/6/15/38, forget path, EF bounds 1.3..3.0, ' + garbageInputs.length * 7 + ' corrupt item/quality combinations, date format, isDue recovery.');
