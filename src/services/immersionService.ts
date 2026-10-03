import { LanguageCode, TextPiece, Word } from '../types';
import { WORD_MAP, WORDS } from '../data/words';

export interface ImmersionToken {
  key: string;
  text: string;
  kind: 'word' | 'separator';
  wordId?: string;
  target?: string;
  sentenceIndex: number;
  tokenIndex: number;
  isConcept?: boolean;
  isPunctuation?: boolean;
}

export interface ImmersionStats {
  /** Words in the lesson that have a translation in the target language. */
  totalConcepts: number;
  /** Of those, how many were actually shown translated. */
  immersedConcepts: number;
  /** `immersedConcepts / totalWords` — the share a reader can check by eye. */
  actualShare: number;
  /** What the slider asked for. May exceed what the lesson can deliver. */
  targetShare: number;
  learnedCount: number;
  newCount: number;
  /** Every word in the lesson, translated or not. The denominator. */
  totalWords: number;
}

const tokenWordPattern = /[\p{L}\p{M}\d]+(?:[-'’][\p{L}\p{M}\d]+)*/gu;

export const normalizeRussian = (value: string): string =>
  value
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[«»„“”"']/g, '')
    .trim();

// Grammatical helper words and inflections for natural translation of string pieces
const GRAMMAR_EXTENSIONS: Array<{ forms: string[]; word: Word }> = [
  {
    forms: ['моя', 'мое', 'мои', 'моей', 'моего'],
    word: {
      id: 'g_my',
      ru: 'моя',
      en: 'my',
      es: 'mi',
      de: 'meine',
      fr: 'mon',
      it: 'mio',
      ja: '私の',
      sk: 'moja',
      cs: 'moje',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['меня', 'мне', 'мной'],
    word: {
      id: 'g_me',
      ru: 'меня',
      en: 'me',
      es: 'me',
      de: 'mich',
      fr: 'moi',
      it: 'me',
      ja: '私を',
      sk: 'mňa',
      cs: 'mě',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['у', 'возле', 'около'],
    word: {
      id: 'g_by',
      ru: 'у',
      en: 'by',
      es: 'cerca de',
      de: 'bei',
      fr: 'près de',
      it: 'da',
      ja: 'のそばに',
      sk: 'pri',
      cs: 'u',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['такие', 'такой', 'такая', 'такое'],
    word: {
      id: 'g_such',
      ru: 'такие',
      en: 'such',
      es: 'tales',
      de: 'solche',
      fr: 'tels',
      it: 'tali',
      ja: 'そのような',
      sk: 'takéto',
      cs: 'takové',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['беру', 'берет', 'берём', 'взять'],
    word: {
      id: 'g_take',
      ru: 'беру',
      en: 'take',
      es: 'tomo',
      de: 'nehme',
      fr: 'prends',
      it: 'prendo',
      ja: '取る',
      sk: 'beriem',
      cs: 'vezmu',
      lvl: 1,
      cat: 'действия',
    },
  },
  {
    forms: ['надеваю', 'надевает', 'надеваем', 'надеть'],
    word: {
      id: 'g_wear',
      ru: 'надеваю',
      en: 'put on',
      es: 'me pongo',
      de: 'ziehe an',
      fr: 'mets',
      it: 'metto',
      ja: '着る',
      sk: 'obliekam si',
      cs: 'obléknu si',
      lvl: 2,
      cat: 'действия',
    },
  },
  {
    forms: ['это', 'этот', 'эта', 'эти'],
    word: {
      id: 'g_this',
      ru: 'это',
      en: 'this',
      es: 'esto',
      de: 'das',
      fr: 'ce',
      it: 'questo',
      ja: 'これ',
      sk: 'to',
      cs: 'to',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['будет', 'будут', 'буду'],
    word: {
      id: 'g_will_be',
      ru: 'будет',
      en: 'will be',
      es: 'será',
      de: 'wird sein',
      fr: 'sera',
      it: 'sarà',
      ja: 'になる',
      sk: 'bude',
      cs: 'bude',
      lvl: 1,
      cat: 'время',
    },
  },
  {
    forms: ['из', 'ото'],
    word: {
      id: 'g_from',
      ru: 'из',
      en: 'from',
      es: 'de',
      de: 'aus',
      fr: 'de',
      it: 'da',
      ja: 'から',
      sk: 'z',
      cs: 'z',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['к', 'ко'],
    word: {
      id: 'g_to',
      ru: 'к',
      en: 'to',
      es: 'a',
      de: 'zu',
      fr: 'à',
      it: 'a',
      ja: 'へ',
      sk: 'k',
      cs: 'k',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['с', 'со'],
    word: {
      id: 'g_with',
      ru: 'с',
      en: 'with',
      es: 'con',
      de: 'mit',
      fr: 'avec',
      it: 'con',
      ja: 'と',
      sk: 's',
      cs: 's',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['не'],
    word: {
      id: 'g_not',
      ru: 'не',
      en: 'not',
      es: 'no',
      de: 'nicht',
      fr: 'pas',
      it: 'non',
      ja: 'ない',
      sk: 'nie',
      cs: 'ne',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['я'],
    word: {
      id: 'g_i',
      ru: 'я',
      en: 'I',
      es: 'yo',
      de: 'ich',
      fr: 'je',
      it: 'io',
      ja: '私',
      sk: 'ja',
      cs: 'já',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['мы'],
    word: {
      id: 'g_we',
      ru: 'мы',
      en: 'we',
      es: 'nosotros',
      de: 'wir',
      fr: 'nous',
      it: 'noi',
      ja: '私たち',
      sk: 'my',
      cs: 'my',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['а'],
    word: {
      id: 'g_and_but',
      ru: 'а',
      en: 'and',
      es: 'y',
      de: 'und',
      fr: 'et',
      it: 'e',
      ja: 'そして',
      sk: 'a',
      cs: 'a',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['и'],
    word: {
      id: 'g_and',
      ru: 'и',
      en: 'and',
      es: 'y',
      de: 'und',
      fr: 'et',
      it: 'e',
      ja: 'と',
      sk: 'a',
      cs: 'a',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['на'],
    word: {
      id: 'g_on',
      ru: 'на',
      en: 'on',
      es: 'en',
      de: 'auf',
      fr: 'sur',
      it: 'su',
      ja: 'の上',
      sk: 'na',
      cs: 'na',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['в', 'во'],
    word: {
      id: 'g_in',
      ru: 'в',
      en: 'in',
      es: 'en',
      de: 'in',
      fr: 'dans',
      it: 'in',
      ja: 'の中',
      sk: 'v',
      cs: 'v',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['еще', 'ещё'],
    word: {
      id: 'g_still',
      ru: 'ещё',
      en: 'still',
      es: 'todavía',
      de: 'noch',
      fr: 'encore',
      it: 'ancora',
      ja: 'まだ',
      sk: 'ešte',
      cs: 'ještě',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['но'],
    word: {
      id: 'g_but',
      ru: 'но',
      en: 'but',
      es: 'pero',
      de: 'aber',
      fr: 'mais',
      it: 'ma',
      ja: 'でも',
      sk: 'ale',
      cs: 'ale',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['уже'],
    word: {
      id: 'g_already',
      ru: 'уже',
      en: 'already',
      es: 'ya',
      de: 'schon',
      fr: 'déjà',
      it: 'già',
      ja: 'すでに',
      sk: 'už',
      cs: 'už',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['за'],
    word: {
      id: 'g_behind',
      ru: 'за',
      en: 'behind',
      es: 'detrás de',
      de: 'hinter',
      fr: 'derrière',
      it: 'dietro',
      ja: 'の後ろ',
      sk: 'za',
      cs: 'za',
      lvl: 1,
      cat: 'город',
    },
  },
  {
    forms: ['где'],
    word: {
      id: 'g_where',
      ru: 'где',
      en: 'where',
      es: 'donde',
      de: 'wo',
      fr: 'où',
      it: 'dove',
      ja: 'どこ',
      sk: 'kde',
      cs: 'kde',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['что'],
    word: {
      id: 'g_that',
      ru: 'что',
      en: 'that',
      es: 'que',
      de: 'dass',
      fr: 'que',
      it: 'che',
      ja: 'こと',
      sk: 'že',
      cs: 'že',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['потом'],
    word: {
      id: 'g_then',
      ru: 'потом',
      en: 'then',
      es: 'luego',
      de: 'dann',
      fr: 'ensuite',
      it: 'poi',
      ja: 'それから',
      sk: 'potom',
      cs: 'potom',
      lvl: 1,
      cat: 'время',
    },
  },
  {
    forms: ['очень'],
    word: {
      id: 'g_very',
      ru: 'очень',
      en: 'very',
      es: 'muy',
      de: 'sehr',
      fr: 'très',
      it: 'molto',
      ja: 'とても',
      sk: 'veľmi',
      cs: 'velmi',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['он', 'его', 'ему', 'им'],
    word: {
      id: 'g_he',
      ru: 'он',
      en: 'he',
      es: 'él',
      de: 'er',
      fr: 'il',
      it: 'lui',
      ja: '彼',
      sk: 'on',
      cs: 'on',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['она', 'ее', 'её', 'ей'],
    word: {
      id: 'g_she',
      ru: 'она',
      en: 'she',
      es: 'ella',
      de: 'sie',
      fr: 'elle',
      it: 'lei',
      ja: '彼女',
      sk: 'ona',
      cs: 'ona',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['они', 'их', 'им', 'ими'],
    word: {
      id: 'g_they',
      ru: 'они',
      en: 'they',
      es: 'ellos',
      de: 'sie',
      fr: 'ils',
      it: 'loro',
      ja: '彼ら',
      sk: 'oni',
      cs: 'oni',
      lvl: 1,
      cat: 'люди',
    },
  },
  {
    forms: ['свой', 'своя', 'свое', 'своё', 'свои', 'свой'],
    word: {
      id: 'g_own',
      ru: 'свой',
      en: 'own',
      es: 'propio',
      de: 'eigen',
      fr: 'propre',
      it: 'proprio',
      ja: '自分の',
      sk: 'svoj',
      cs: 'svůj',
      lvl: 1,
      cat: 'основа',
    },
  },
  {
    forms: ['себя', 'себе', 'ся'],
    word: {
      id: 'g_reflexive',
      ru: 'себя / -ся',
      en: 'self',
      es: 'se',
      de: 'sich',
      fr: 'se',
      it: 'si',
      ja: '自分',
      sk: 'sa',
      cs: 'se',
      lvl: 1,
      cat: 'основа',
    },
  },
];

// Extra word dictionary for grammar entries
export const GRAMMAR_WORD_MAP: Record<string, Word> = {};
GRAMMAR_EXTENSIONS.forEach((entry) => {
  GRAMMAR_WORD_MAP[entry.word.id] = entry.word;
});

// Index of Russian base words for discovering vocabulary in plain text pieces
const buildRussianIndex = (): Map<string, Word> => {
  const index = new Map<string, Word>();

  // 1. Add base words
  WORDS.forEach((word) => {
    const source = normalizeRussian(word.ru);
    if (source && !source.includes(' ') && !index.has(source)) {
      index.set(source, word);
    }
  });

  // 2. Add grammar extensions (pronouns, prepositions, forms)
  GRAMMAR_EXTENSIONS.forEach((entry) => {
    entry.forms.forEach((form) => {
      const norm = normalizeRussian(form);
      if (norm) {
        index.set(norm, entry.word);
      }
    });
  });

  return index;
};

const RUSSIAN_INDEX = buildRussianIndex();

/**
 * Precomputed lookup tables used by `tokenizeForeignSentence`.
 *
 * The tokenizer used to run up to three linear `WORDS.find()` scans per token
 * (~3.7k string comparisons each), which is ~600k comparisons for a single
 * 7-sentence lesson. The maps below are built once per language on first use
 * and reproduce the previous searches exactly:
 *
 * - `EXACT_WORD_INDEX` — the first record of `WORDS` wins, `GRAMMAR_WORD_MAP`
 *   only answers for keys the main dictionary does not know
 *   (`WORDS.find(...) || Object.values(GRAMMAR_WORD_MAP).find(...)`).
 * - `PREFIX_WORD_INDEX` — `foreign.startsWith(head) || head.startsWith(foreign)`
 *   with both heads cut to 4 characters collapses to plain 4-character
 *   equality, so a `Map` keyed by that prefix is equivalent to the old scan.
 *
 * Both keep the original `word[lang] || word.en || ''` fallback per record, so
 * the resolved `wordId` is bit-for-bit the same as before.
 */
const foreignSurface = (word: Word, lang: LanguageCode): string => (word[lang] || word.en || '').toLowerCase();

const EXACT_WORD_INDEX = new Map<LanguageCode, Map<string, Word>>();
const PREFIX_WORD_INDEX = new Map<LanguageCode, Map<string, Word>>();

const buildExactWordIndex = (lang: LanguageCode): Map<string, Word> => {
  const index = new Map<string, Word>();
  WORDS.forEach((word) => {
    const foreign = foreignSurface(word, lang);
    if (foreign && !index.has(foreign)) index.set(foreign, word);
  });
  Object.values(GRAMMAR_WORD_MAP).forEach((word) => {
    const foreign = foreignSurface(word, lang);
    if (foreign && !index.has(foreign)) index.set(foreign, word);
  });
  return index;
};

const buildPrefixWordIndex = (lang: LanguageCode): Map<string, Word> => {
  const index = new Map<string, Word>();
  WORDS.forEach((word) => {
    const foreign = foreignSurface(word, lang);
    if (foreign.length < 4) return;
    const prefix = foreign.slice(0, 4);
    if (!index.has(prefix)) index.set(prefix, word);
  });
  return index;
};

const getExactWordIndex = (lang: LanguageCode): Map<string, Word> => {
  const cached = EXACT_WORD_INDEX.get(lang);
  if (cached) return cached;
  const index = buildExactWordIndex(lang);
  EXACT_WORD_INDEX.set(lang, index);
  return index;
};

const getPrefixWordIndex = (lang: LanguageCode): Map<string, Word> => {
  const cached = PREFIX_WORD_INDEX.get(lang);
  if (cached) return cached;
  const index = buildPrefixWordIndex(lang);
  PREFIX_WORD_INDEX.set(lang, index);
  return index;
};

/**
 * Clean verbs for natural bilingual reading (e.g. English "to wait" -> "wait",
 * Spanish "caminar" stays as is, etc.)
 */
export const cleanTargetWord = (rawTarget: string, lang: LanguageCode): string => {
  if (!rawTarget) return '';
  let trimmed = rawTarget.trim();

  // For English, strip leading "to " for cleaner in-sentence flow
  if (lang === 'en' && trimmed.toLowerCase().startsWith('to ') && trimmed.length > 3) {
    trimmed = trimmed.slice(3).trim();
  }
  return trimmed;
};

export const getTargetText = (word: Word, lang: LanguageCode): string => {
  const value = word[lang];
  const raw = typeof value === 'string' && value.trim() ? value : word.en;
  return cleanTargetWord(raw, lang);
};

export const preserveCapitalization = (source: string, target: string): string => {
  if (!source || !target) return target;
  if (source.length > 1 && source === source.toLocaleUpperCase('ru-RU')) {
    return target.toLocaleUpperCase();
  }
  if (source[0] === source[0].toLocaleUpperCase('ru-RU')) {
    return target.charAt(0).toLocaleUpperCase() + target.slice(1).toLocaleLowerCase();
  }
  return target;
};

/**
 * Returns true if string starts with punctuation that attaches to preceding word
 */
const startsWithAttachingPunctuation = (str: string): boolean => {
  return /^[.,:;!?…\)»”%]/.test(str.trimStart());
};

/**
 * Tokenizes a lesson sentence with smart whitespace and full vocabulary awareness.
 * Guarantees no glued words and no unwanted spaces before punctuation.
 */
export const tokenizeLessonSentence = (
  sentence: TextPiece[],
  sentenceIndex: number,
  lang: LanguageCode,
): ImmersionToken[] => {
  const result: ImmersionToken[] = [];
  let tokenIndex = 0;

  const pushSeparator = (text: string) => {
    if (!text) return;
    const isPunct = /^[.,:;!?…\)»”%]/.test(text.trim());
    // Merge with previous separator if adjacent
    const last = result[result.length - 1];
    if (last && last.kind === 'separator') {
      last.text += text;
      if (isPunct) last.isPunctuation = true;
    } else {
      result.push({
        key: `${sentenceIndex}:${tokenIndex++}`,
        text,
        kind: 'separator',
        sentenceIndex,
        tokenIndex: tokenIndex - 1,
        isPunctuation: isPunct,
      });
    }
  };

  const pushWord = (
    surfaceText: string,
    wordId?: string,
    isExplicitConcept: boolean = false,
  ) => {
    const word = wordId ? WORD_MAP[wordId] : RUSSIAN_INDEX.get(normalizeRussian(surfaceText));
    const finalWordId = wordId || word?.id;
    const target = word ? preserveCapitalization(surfaceText, getTargetText(word, lang)) : undefined;

    result.push({
      key: `${sentenceIndex}:${tokenIndex++}`,
      text: surfaceText,
      kind: 'word',
      wordId: finalWordId,
      target,
      sentenceIndex,
      tokenIndex: tokenIndex - 1,
      isConcept: isExplicitConcept || Boolean(finalWordId),
    });
  };

  sentence.forEach((piece, pieceIdx) => {
    // Check if we need to insert a space before this piece
    if (pieceIdx > 0 && result.length > 0) {
      const prevToken = result[result.length - 1];
      const nextPieceStr = typeof piece === 'string' ? piece : (piece.ru || WORD_MAP[piece.id]?.ru || '');

      const prevEndsWithSpace = prevToken.kind === 'separator' && /\s$/.test(prevToken.text);
      const nextStartsWithPunct = startsWithAttachingPunctuation(nextPieceStr);

      if (!prevEndsWithSpace && !nextStartsWithPunct && prevToken.kind === 'word') {
        pushSeparator(' ');
      }
    }

    // 1. Explicit word piece: { id: '...', ru?: '...' }
    if (typeof piece !== 'string') {
      const word = WORD_MAP[piece.id];
      const surfaceText = piece.ru || word?.ru || piece.id;
      pushWord(surfaceText, piece.id, true);
      return;
    }

    // 2. String piece: can contain words, spaces, punctuation
    const pieceStr = piece;
    let lastOffset = 0;

    let match: RegExpExecArray | null;
    tokenWordPattern.lastIndex = 0;

    while ((match = tokenWordPattern.exec(pieceStr)) !== null) {
      const matchIndex = match.index;
      const matchedWord = match[0];

      if (matchIndex > lastOffset) {
        pushSeparator(pieceStr.slice(lastOffset, matchIndex));
      }

      pushWord(matchedWord, undefined, false);
      lastOffset = matchIndex + matchedWord.length;
    }

    if (lastOffset < pieceStr.length) {
      pushSeparator(pieceStr.slice(lastOffset));
    }
  });

  return result;
};

/**
 * Evenly distributes items across an array
 */
const pickEvenly = <T,>(items: T[], count: number): T[] => {
  if (count <= 0) return [];
  if (count >= items.length) return items;
  return Array.from({ length: count }, (_, index) => items[Math.floor((index * items.length) / count)]);
};

/**
 * Selects which word tokens should be shown in the target language.
 *
 * The share is a share of the **whole text**, not of the translatable part of
 * it: a text of 50 words at 60% puts 30 words in the target language. Counting
 * only the words that happen to have a translation made the dial mean something
 * quite different from what it says, and a page could claim 100% while reading
 * mostly Russian — which is exactly what it did.
 *
 * A word that has no dictionary entry for this language can never be shown
 * translated, so the reachable share has a ceiling of
 * `translatable / totalWords`. The caller is expected to report the measured
 * result rather than the requested one.
 *
 * Rules:
 * 1. The number of words shown in the target language is EXACTLY the rounded
 *    share of the whole text, never more. A dial set to 60% reads 60%.
 * 2. Words the user has already learned (learnedWords) are shown in the target
 *    language in preference to unlearned ones — but they only ever take a slot
 *    *inside* the budget. Adding them on top of it was what made a 60% dial
 *    report 69%, which is a dial that lies about its own meaning.
 * 3. At 100%, every word that *can* be translated is.
 * 4. Below 100% the remaining slots are spread evenly across the lesson and
 *    stay stable: learning one word must not make another visible word suddenly
 *    change from Russian into a new target-language word.
 */
export const selectImmersionTokenKeys = (
  sentences: ImmersionToken[][],
  targetShare: number,
  learnedWords: Set<string>,
): Set<string> => {
  const allTokens = sentences.flat();
  const wordTokens = allTokens.filter((token) => token.kind === 'word');
  const conceptTokens = wordTokens.filter((token) => token.wordId && token.target);

  if (conceptTokens.length === 0) return new Set();

  // Full immersion target: every translatable word, whatever the text contains.
  if (targetShare >= 100) {
    return new Set(conceptTokens.map((t) => t.key));
  }

  const share = Math.max(5, Math.min(99, targetShare));
  // Rounded to the nearest whole word, which is what the slider promises.
  const requested = Math.round((wordTokens.length * share) / 100);
  // Never more than can actually be translated, never zero when the learner
  // asked for any immersion at all.
  const budget = Math.max(1, Math.min(conceptTokens.length, requested));

  // There used to be one more cap here — "below 100% keep one word in Russian" —
  // and it quietly broke the promise the dial makes. On a 29-word lesson with 17
  // translatable ones, 60% asked for 17 words, the cap cut it to 16, and the
  // page then reported 55% while the slider said 60%. A cap the user cannot see
  // and did not ask for is worse than the thing it protects: below 100% the
  // remaining Russian words are the ones the quota deliberately left out
  // anyway, and once the dial is above the reachable ceiling the stats panel
  // already explains why it stopped short.

  // Learned words take a slot inside the budget, in document order, so the
  // result stays deterministic. When the learner has learned more words than
  // the budget allows the budget wins — an exact dial beats a promise the page
  // cannot keep — and the stats panel reports the real count instead.
  const mandatoryKeys = new Set(
    conceptTokens
      .filter((token) => token.wordId && learnedWords.has(token.wordId))
      .slice(0, budget)
      .map((token) => token.key),
  );

  // The spread comes from the complete ordered list, not from "still unlearned"
  // tokens, so it does not move around when the user learns something.
  const base = pickEvenly(conceptTokens, budget);

  // Fast path: everything already learned is on screen, so the set is exactly
  // the stable spread. Learning a visible word must change nothing at all.
  if ([...mandatoryKeys].every((key) => base.some((token) => token.key === key))) {
    return new Set(base.map((token) => token.key));
  }

  // A learned word was hidden, so it swaps in. Pay for the new slot by evicting
  // an unlearned one from the end of the spread — one word out, never a
  // reshuffle of the whole page.
  const selected = new Set(base.map((token) => token.key));
  let overflow = 0;
  mandatoryKeys.forEach((key) => {
    if (!selected.has(key)) {
      selected.add(key);
      overflow += 1;
    }
  });

  if (overflow > 0) {
    const removable = base.filter((token) => !mandatoryKeys.has(token.key));
    for (let index = removable.length - 1; index >= 0 && overflow > 0; index -= 1) {
      selected.delete(removable[index].key);
      overflow -= 1;
    }
  }

  return selected;
};

/**
 * Honest, clear statistics on how much of the lesson vocabulary is immersed.
 *
 * `actualShare` is measured against **every word in the text**, matching the
 * slider: 60% of a 50-word text means 30 words read in the target language. The
 * pair `translatableWords / totalWords` is the ceiling that share can reach, so
 * the UI can say why it stopped short instead of overstating the result.
 */
export const getImmersionStats = (
  sentences: ImmersionToken[][],
  selectedKeys: Set<string>,
  targetShare: number,
  learnedWords: Set<string>,
): ImmersionStats => {
  const allTokens = sentences.flat();
  const wordTokens = allTokens.filter((t) => t.kind === 'word');
  const conceptTokens = wordTokens.filter((t) => t.wordId && t.target);

  const immersedTokens = conceptTokens.filter((t) => selectedKeys.has(t.key));
  const learnedCount = immersedTokens.filter((t) => t.wordId && learnedWords.has(t.wordId)).length;
  const newCount = immersedTokens.length - learnedCount;

  const totalConcepts = conceptTokens.length;
  const immersedConcepts = immersedTokens.length;
  const totalWords = wordTokens.length;

  const actualShare = totalWords > 0 ? Math.round((immersedConcepts / totalWords) * 100) : 0;

  return {
    totalConcepts,
    immersedConcepts,
    actualShare,
    targetShare,
    learnedCount,
    newCount,
    totalWords,
  };
};

/**
 * Inflection and conjugated forms mapping for target languages in lessons.
 * Maps inflected forms back to base concept word IDs or grammar word IDs.
 */
const FOREIGN_INFLECTIONS: Record<string, string> = {
  // Czech verb forms and inflected words used by the authored immersion pack
  otevírám: 'open',
  otevírá: 'open',
  otevřu: 'open',
  dívá: 'see',
  čeká: 'wait',
  fouká: 'wind',
  jdu: 'go',
  jdeme: 'go',
  připravuji: 'cook',
  probudí: 'wake',
  miluji: 'love',
  vezmu: 'g_take',
  obléknu: 'g_wear',
  vyjdu: 'exit',
  cítím: 'feel',
  koupit: 'buy',
  kupuji: 'buy',
  piju: 'drink',
  čte: 'read',
  čteme: 'read',
  snídani: 'breakfast',
  mluvíme: 'speak',
  mluvit: 'speak',
  povídáme: 'speak',
  schůzka: 'meeting',
  posloucháme: 'listen',
  rozjíždí: 'move',
  kočka: 'cat',
  kočku: 'cat',
  dveře: 'door',
  dveří: 'door',
  kuchyně: 'kitchen',
  chléb: 'bread',
  sýr: 'cheese',
  dny: 'day',
  den: 'day',
  ulice: 'street',
  vítr: 'wind',
  slunce: 'sun',
  telefon: 'phone',
  město: 'city',
  města: 'city',
  městě: 'city',
  nádraží: 'station',
  jízdenku: 'ticket',
  lístek: 'ticket',
  dítě: 'child',
  řeka: 'river',
  obchodů: 'shop',
  náměstí: 'square',
  muzeu: 'museum',
  kamarád: 'friend',
  kamarádem: 'friend',
  restaurace: 'restaurant',
  hladu: 'hungry',
  hlad: 'hungry',
  hudbě: 'music',
  peníze: 'money',
  člověk: 'person',
  mléko: 'milk',
  ovoce: 'fruit',
  pokladní: 'person',
  soused: 'neighbor',
  hotelu: 'hotel',
  letiště: 'airport',
  moře: 'sea',
  dopis: 'letter',
  mamince: 'mother',
  lékař: 'doctor',
  lékárny: 'pharmacy',
  se: 'g_reflexive',
  si: 'g_reflexive',
  můj: 'g_my',
  mě: 'g_me',
  u: 'g_by',
  k: 'g_to',
  ne: 'g_not',
  já: 'g_i',
  my: 'g_we',
  čerstvou: 'fresh',
  horkou: 'hot',
  novém: 'good',
  brzy: 'early',
  ještě: 'g_still',
  velmi: 'g_very',

  // Slovak verb forms
  otváram: 'open',
  otvára: 'open',
  otvoriť: 'open',
  otvorím: 'open',
  vidím: 'see',
  vidí: 'see',
  pozerá: 'see',
  spí: 'sleep',
  spia: 'sleep',
  čaká: 'wait',
  čakám: 'wait',
  čakajú: 'wait',
  idem: 'go',
  ideme: 'go',
  pripravujem: 'cook',
  varím: 'cook',
  zobudí: 'wake',
  milujem: 'love',
  vezmem: 'g_take',
  beriem: 'g_take',
  oblečiem: 'g_wear',
  obúvam: 'g_wear',
  vyjdem: 'exit',
  vychádzam: 'exit',
  vystúpim: 'exit',
  cítim: 'feel',
  kúpiť: 'buy',
  kupujem: 'buy',
  pijem: 'drink',
  pije: 'drink',
  číta: 'read',
  čítame: 'read',
  platíme: 'pay',
  chcem: 'want',
  potrebujeme: 'need',
  objednávam: 'order',
  hovoríme: 'speak',
  hovoriť: 'speak',
  rozprávame: 'speak',
  stretnutie: 'meeting',
  pracujem: 'work',
  práce: 'work',
  počúvame: 'listen',
  brieždi: 'morning',
  leží: 'table',

  // Slovak nouns & adjectives with endings
  kocúr: 'cat',
  mačka: 'cat',
  mačky: 'cat',
  stole: 'table',
  stôl: 'table',
  dverách: 'door',
  dvere: 'door',
  kuchyne: 'kitchen',
  kuchyňa: 'kitchen',
  kávu: 'coffee',
  káva: 'coffee',
  chlieb: 'bread',
  syr: 'cheese',
  rodina: 'family',
  rodinou: 'family',
  dni: 'day',
  deň: 'day',
  tiché: 'quiet',
  tichá: 'quiet',
  ticho: 'quiet',
  teplé: 'warm',
  teplý: 'warm',
  bunda: 'jacket',
  bundu: 'jacket',
  domu: 'house',
  dom: 'house',
  ulici: 'street',
  ulica: 'street',
  vietor: 'wind',
  slnko: 'sun',
  okno: 'window',
  okna: 'window',
  oknom: 'window',
  knihu: 'book',
  kniha: 'book',
  telefón: 'phone',
  pes: 'dog',
  psa: 'dog',
  meste: 'city',
  mesta: 'city',
  mesto: 'city',
  stanici: 'station',
  lístok: 'ticket',
  vlak: 'train',
  žena: 'woman',
  dieťa: 'child',
  stromy: 'tree',
  rieka: 'river',
  obchodoch: 'shop',
  most: 'bridge',
  námestie: 'square',
  múzeu: 'museum',
  priateľ: 'friend',
  priateľom: 'friend',
  reštaurácie: 'restaurant',
  reštaurácia: 'restaurant',
  hladný: 'hungry',
  hudbou: 'music',
  hudbe: 'music',
  hudba: 'music',
  mapu: 'map',
  čaj: 'tea',
  čaju: 'tea',
  vodu: 'water',
  voda: 'water',
  peniaze: 'money',
  človek: 'person',
  jablko: 'apple',
  mlieko: 'milk',
  ovocie: 'fruit',
  cena: 'price',
  cenu: 'price',
  pokladník: 'person',
  sused: 'neighbor',
  hotel: 'hotel',
  hoteli: 'hotel',
  letisko: 'airport',
  more: 'sea',
  pláž: 'beach',
  list: 'letter',
  mama: 'mother',
  mame: 'mother',
  počítač: 'computer',
  lekár: 'doctor',
  lieky: 'medicine',

  // Slovak pronouns & grammar
  môj: 'g_my',
  moja: 'g_my',
  moje: 'g_my',
  mňa: 'g_me',
  ma: 'g_me',
  mi: 'g_me',
  pri: 'g_by',
  na: 'g_on',
  v: 'g_in',
  vo: 'g_in',
  do: 'g_in',
  z: 'g_from',
  zo: 'g_from',
  a: 'g_and',
  ale: 'g_but',
  to: 'g_this',
  bude: 'g_will_be',
  čerstvý: 'fresh',
  čerstvú: 'fresh',
  horúcu: 'hot',
  horúci: 'hot',
  nový: 'good',
  novom: 'good',
  skoro: 'early',
  ráno: 'morning',
  ešte: 'g_still',
  už: 'g_already',
  za: 'g_behind',
  kde: 'g_where',
  že: 'g_that',
  potom: 'g_then',
  veľmi: 'g_very',
  takéto: 'g_such',

  // English common inflected forms
  sleeping: 'sleep',
  sleeps: 'sleep',
  waiting: 'wait',
  waits: 'wait',
  going: 'go',
  goes: 'go',
  prepare: 'cook',
  prepares: 'cook',
  leaves: 'exit',
  leave: 'exit',
  takes: 'g_take',
  take: 'g_take',
  reading: 'read',
  reads: 'read',
  looking: 'see',
  looks: 'see',
  drinks: 'drink',
  feels: 'feel',
  smiles: 'smile',
  starts: 'start',
  moves: 'move',
  shops: 'shop',
  trees: 'tree',
  days: 'day',
};

/**
 * Tokenizes a full target-language sentence (for Original and 100% Immersion mode) making EVERY word interactive.
 */
export const tokenizeForeignSentence = (
  sentenceText: string,
  sentenceIndex: number,
  lang: LanguageCode,
): ImmersionToken[] => {
  const result: ImmersionToken[] = [];
  let tokenIndex = 0;
  let lastOffset = 0;
  const exactIndex = getExactWordIndex(lang);
  const prefixIndex = getPrefixWordIndex(lang);

  tokenWordPattern.lastIndex = 0;
  let match: RegExpExecArray | null;

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
      ? (WORD_MAP[matchedWordId] || GRAMMAR_WORD_MAP[matchedWordId])
      : undefined;

    // 2. Exact match in WORDS or GRAMMAR_WORD_MAP
    if (!matchedWord) {
      matchedWord = exactIndex.get(lowerWord);
    }

    // 3. Substring / base match
    if (!matchedWord && lowerWord.length >= 4) {
      matchedWord = prefixIndex.get(lowerWord.slice(0, 4));
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
