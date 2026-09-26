import { RandomSource } from '../utils';

/** FNV-1a, so a stable string key always produces the same 32-bit seed. */
const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Deterministic `Math.random` replacement (mulberry32) derived from a string key.
 *
 * Multiple-choice option sets are built inside `useMemo`. A plain
 * `Math.random()` there means the whole set is re-rolled whenever any
 * dependency changes, so the option a learner already picked no longer lines up
 * with the button under the cursor. Seeding by lesson + language + word id makes
 * the set a pure function of its inputs: it survives re-computations and stays
 * different per lesson, per language and per word.
 */
export const createSeededRandom = (seed: string): RandomSource => {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
