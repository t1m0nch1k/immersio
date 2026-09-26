export type RandomSource = () => number;

/**
 * Fisher-Yates shuffle. Returns a new array, never mutates the input.
 */
export const shuffle = <T,>(items: readonly T[], random: RandomSource = Math.random): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Takes up to `count` distinct values produced by `valueOf`, in random order.
 *
 * Uses a Set for de-duplication and stops as soon as enough values are
 * collected, so the cost is O(n) instead of the O(n^2) that
 * `values.indexOf(value) === index` produced over the full word list.
 */
export const pickDistinctValues = <T,>(
  items: readonly T[],
  count: number,
  valueOf: (item: T) => string,
  isValid?: (item: T, value: string) => boolean,
  random: RandomSource = Math.random
): string[] => {
  if (count <= 0) return [];
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const item of shuffle(items, random)) {
    const value = valueOf(item);
    if (!value || seen.has(value)) continue;
    if (isValid && !isValid(item, value)) continue;
    seen.add(value);
    picked.push(value);
    if (picked.length >= count) break;
  }
  return picked;
};
