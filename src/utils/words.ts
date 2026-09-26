import { LanguageCode, Word } from '../types';
import { WORDS, WORD_MAP } from '../data/words';
import { GRAMMAR_WORD_MAP } from '../services/immersionService';
import { pickDistinctValues, RandomSource } from './array';

export const getWord = (wordId: string): Word | undefined => WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId];

export const getTargetText = (word: Word | undefined, lang: LanguageCode): string =>
  (word ? (word[lang] || word.en) : '').trim();

export const getRussianText = (word: Word | undefined): string => (word?.ru || '').trim();

/**
 * A word is only usable in exercises when both sides of the pair are known:
 * a Russian prompt and a translation in the target language.
 */
export const isUsableWord = (word: Word | undefined, lang: LanguageCode): boolean =>
  Boolean(word && getRussianText(word) && getTargetText(word, lang));

export const getUsableWord = (wordId: string, lang: LanguageCode): Word | undefined => {
  const word = getWord(wordId);
  return isUsableWord(word, lang) ? word : undefined;
};

/** Words grouped by CEFR level, computed once instead of on every render. */
export const WORDS_BY_LEVEL: Record<1 | 2 | 3 | 4, Word[]> = (() => {
  const grouped: Record<1 | 2 | 3 | 4, Word[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const word of WORDS) grouped[word.lvl].push(word);
  return grouped;
})();

/**
 * Distinct Russian translations to use as wrong answers, excluding the correct
 * one. Randomised, de-duplicated in O(n).
 */
export const buildRussianDistractors = (
  correctRu: string,
  excludeWordId: string,
  count: number,
  random?: RandomSource
): string[] =>
  pickDistinctValues(
    WORDS,
    count,
    getRussianText,
    (word, value) => word.id !== excludeWordId && value !== correctRu,
    random
  );

/**
 * Distinct target-language words to use as wrong answers, excluding the
 * correct one. Randomised, de-duplicated in O(n).
 */
export const buildTargetDistractors = (
  correctValue: string,
  excludeWordId: string,
  lang: LanguageCode,
  count: number,
  random?: RandomSource
): string[] =>
  pickDistinctValues(
    WORDS,
    count,
    (word) => getTargetText(word, lang),
    (word, value) => word.id !== excludeWordId && value !== correctValue,
    random
  );
