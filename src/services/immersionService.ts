import { LanguageCode, TextPiece, TextPieceWord, Word } from '../types';
import { BASE_WORDS, WORD_MAP, WORDS } from '../data/words';

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
  totalConcepts: number;
  immersedConcepts: number;
  actualShare: number;
  targetShare: number;
  learnedCount: number;
  newCount: number;
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
 * Rules:
 * 1. Any word the user has already learned (learnedWords) is ALWAYS shown in the target language.
 * 2. If targetShare is >= 95%, ALL available concept words are shown in target language.
 * 3. Otherwise, the initial target-language set is picked evenly across the
 *    lesson and stays stable. Learning one word must not make another visible
 *    word suddenly change from Russian into a new target-language word.
 */
export const selectImmersionTokenKeys = (
  sentences: ImmersionToken[][],
  targetShare: number,
  learnedWords: Set<string>,
): Set<string> => {
  const allTokens = sentences.flat();
  const conceptTokens = allTokens.filter((token) => token.kind === 'word' && token.wordId && token.target);

  if (conceptTokens.length === 0) return new Set();

  // Full immersion target: only at 100% are all concept tokens immersed.
  if (targetShare >= 100) {
    return new Set(conceptTokens.map((t) => t.key));
  }

  const requestedTotal = Math.min(
    conceptTokens.length,
    Math.max(1, Math.round((conceptTokens.length * Math.max(5, Math.min(99, targetShare))) / 100)),
  );

  // Guarantee that at targetShare < 100, if there are unlearned concepts, at least one remains in Russian
  const hasUnlearned = conceptTokens.some((token) => !token.wordId || !learnedWords.has(token.wordId));
  const stableTotal = hasUnlearned && requestedTotal >= conceptTokens.length
    ? conceptTokens.length - 1
    : requestedTotal;

  // Pick from the complete ordered list, not from "still unlearned" tokens.
  // That makes the visible set deterministic across a learn action.
  const stableTokens = pickEvenly(conceptTokens, stableTotal);
  const selected = new Set(stableTokens.map((token) => token.key));

  // Learned words are never hidden, even if they are outside the initial quota.
  conceptTokens.forEach((token) => {
    if (token.wordId && learnedWords.has(token.wordId)) {
      selected.add(token.key);
    }
  });

  return selected;
};

/**
 * Honest, clear statistics on how much of the lesson vocabulary is immersed
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

  const actualShare = totalConcepts > 0 ? Math.round((immersedConcepts / totalConcepts) * 100) : 0;

  return {
    totalConcepts,
    immersedConcepts,
    actualShare,
    targetShare,
    learnedCount,
    newCount,
    totalWords: wordTokens.length,
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
      matchedWord =
        WORDS.find((w) => {
          const foreign = (w[lang] || w.en || '').toLowerCase();
          return foreign === lowerWord;
        }) ||
        Object.values(GRAMMAR_WORD_MAP).find((w) => {
          const foreign = (w[lang] || w.en || '').toLowerCase();
          return foreign === lowerWord;
        });
    }

    // 3. Substring / base match
    if (!matchedWord && lowerWord.length >= 4) {
      matchedWord = WORDS.find((w) => {
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
