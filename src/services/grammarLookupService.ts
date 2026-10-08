import { LanguageCode } from '../types';
import { GRAMMAR_PARTICLES, GrammarParticleInfo } from '../data/grammarParticles';

export interface GrammarNote {
  text: string;
  lang: LanguageCode | 'ru';
  partOfSpeech: string;
  meaningRu: string;
  rule: string;
  contextSentence?: string;
  isGrammarOnly: boolean;
  isFallback?: boolean;
}

const normalizeWord = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,:;!?…()»«"]/g, '')
    .trim();

// Index by `${lang}:${normalizedWord}`
const PARTICLE_INDEX = new Map<string, GrammarParticleInfo>();

GRAMMAR_PARTICLES.forEach((item) => {
  const norm = normalizeWord(item.word);
  if (norm) {
    PARTICLE_INDEX.set(`${item.lang}:${norm}`, item);
  }
});

/**
 * Searches for a grammar particle or functional word explanation.
 * If not found directly, tries smart prefix stripping (e.g., Hebrew ה/ב/ל/ו or French l'/d').
 */
export function lookupGrammarNote(
  tokenText: string,
  lang: LanguageCode | 'ru',
  contextSentence?: string
): GrammarNote | null {
  const clean = normalizeWord(tokenText);
  if (!clean) return null;

  // 1. Direct match in language
  const exact = PARTICLE_INDEX.get(`${lang}:${clean}`);
  if (exact) {
    return {
      text: tokenText,
      lang,
      partOfSpeech: exact.partOfSpeech,
      meaningRu: exact.meaningRu,
      rule: exact.rule,
      contextSentence,
      isGrammarOnly: true,
    };
  }

  // 2. Direct match in Russian (if token was Russian in immersion mode)
  if (lang === 'ru') {
    const ruMatch = PARTICLE_INDEX.get(`ru:${clean}`);
    if (ruMatch) {
      return {
        text: tokenText,
        lang: 'ru',
        partOfSpeech: ruMatch.partOfSpeech,
        meaningRu: ruMatch.meaningRu,
        rule: ruMatch.rule,
        contextSentence,
        isGrammarOnly: true,
      };
    }
  }

  // 3. Hebrew prefixes: ה (the), ו (and), ב (in), ל (to), מ (from)
  if (lang === 'he' && clean.length > 2) {
    const firstChar = clean[0];
    const prefixMatch = PARTICLE_INDEX.get(`he:${firstChar}`);
    if (prefixMatch) {
      const rest = clean.slice(1);
      return {
        text: tokenText,
        lang: 'he',
        partOfSpeech: `${prefixMatch.partOfSpeech} + основа`,
        meaningRu: `Возможный префикс «${firstChar}» (${prefixMatch.meaningRu})`,
        rule: `${prefixMatch.rule} Если начальная буква здесь является префиксом, основа — «${rest}». Совпадение по первой букве не подтверждает разбор слова.`,
        contextSentence,
        isGrammarOnly: true,
      };
    }
  }

  // 4. French elision (l'homme, d'or, c'est, qu'il)
  if (lang === 'fr' && (clean.startsWith("l'") || clean.startsWith("d'") || clean.startsWith("c'") || clean.startsWith("qu'"))) {
    return {
      text: tokenText,
      lang: 'fr',
      partOfSpeech: 'Слитная форма (элизия)',
      meaningRu: 'Служебное слово с апострофом перед гласной',
      rule: 'Во французском языке артикли и местоимения (le, la, de, ce, que) теряют гласную перед гласным звуком или немым h, чтобы избежать стечения гласных.',
      contextSentence,
      isGrammarOnly: true,
    };
  }

  // 5. English contractions (don't, doesn't, didn't, isn't, aren't, won't, 's, 've, 're)
  if (lang === 'en' && clean.includes("'")) {
    if (clean.endsWith("n't")) {
      return {
        text: tokenText,
        lang: 'en',
        partOfSpeech: 'Отрицательное сокращение',
        meaningRu: 'Вспомогательный глагол с частицей not (не)',
        rule: 'Форма n\'t является сокращением от not. Присоединяется к вспомогательным глаголам в разговорной и нейтральной речи.',
        contextSentence,
        isGrammarOnly: true,
      };
    }
    if (clean.endsWith("'s")) {
      return {
        text: tokenText,
        lang: 'en',
        partOfSpeech: 'Притяжательный падеж / сокращение is/has',
        meaningRu: 'Принадлежность («чей-то») или сокращение от is / has',
        rule: 'Апостроф с -s указывает на обладание (friend\'s book — книга друга) либо на сокращение от is или has.',
        contextSentence,
        isGrammarOnly: true,
      };
    }
  }

  return null;
}

/**
 * Creates an exploratory note for an unknown token from the authentic lesson text
 * so that tapping never fails silently.
 */
export function createFallbackExplorationNote(
  tokenText: string,
  lang: LanguageCode,
  contextSentence?: string
): GrammarNote {
  return {
    text: tokenText,
    lang,
    partOfSpeech: 'Разбор пока недоступен',
    meaningRu: 'Перевод этой формы пока не найден',
    rule: 'В словаре пока нет перевода или грамматического пояснения для этой формы. Посмотрите на предложение ниже и прослушайте произношение.',
    contextSentence,
    isGrammarOnly: true,
    isFallback: true,
  };
}
