import { GrammarExample, GrammarLesson, LanguageCode, UserState } from '../types';
import { getLocalDateKey, StorageService } from './storageService';

export type GrammarMode = 'build' | 'gap' | 'write' | 'transform';
export interface GrammarExercise {
  id: string;
  mode: GrammarMode;
  example: GrammarExample;
  tokens: string[];
  gapIndex: number;
  answer: string;
  alternatives: string[];
  explanation: string;
}

export function normalizeGrammarAnswer(value: string, lang: LanguageCode): string {
  const clean = value.normalize('NFC').toLocaleLowerCase(lang)
    .replace(/[’‘ʼ]/g, "'").replace(/[.,!?;:。、「」！？¿¡"“”]/g, '').trim();
  return lang === 'ja' ? clean.replace(/\s+/g, '') : clean.replace(/\s+/g, ' ');
}

export function grammarTokens(example: GrammarExample, lang: LanguageCode): string[] {
  if (example.chunks) return example.chunks.map((chunk) => chunk.text);
  if (lang !== 'ja') return example.target.trim().split(/\s+/);
  if (typeof Intl.Segmenter !== 'function') return [example.target];
  const tokens: string[] = [];
  for (const part of new Intl.Segmenter('ja', { granularity: 'word' }).segment(example.target)) {
    if (part.isWordLike || tokens.length === 0) tokens.push(part.segment);
    else tokens[tokens.length - 1] += part.segment;
  }
  return tokens;
}

export function buildGrammarExercises(lesson: GrammarLesson, lang: LanguageCode): GrammarExercise[] {
  const exercises: GrammarExercise[] = [];
  for (const mode of ['build', 'gap', 'write', 'transform'] as const) {
    lesson.examples.forEach((example, i) => {
      const tokens = grammarTokens(example, lang);
      if ((mode === 'build' || mode === 'gap') && tokens.length < 2) return;
      if (mode === 'transform' && !example.transform) return;
      const gapIndex = Math.floor(tokens.length / 2);
      exercises.push({
        id: `${lesson.id}:${i}:${mode}`, mode, example, tokens, gapIndex,
        answer: mode === 'gap' ? tokens[gapIndex] : mode === 'transform' ? example.transform!.answer : example.target,
        alternatives: mode === 'gap' ? [] : mode === 'transform' ? example.transform!.alternatives || [] : example.alternatives || [],
        explanation: mode === 'transform' ? example.transform!.explanation : example.note || lesson.explanation,
      });
    });
  }
  return exercises;
}

export function checkGrammarAnswer(exercise: GrammarExercise, input: string, lang: LanguageCode) {
  const actual = normalizeGrammarAnswer(input, lang);
  const answers = [exercise.answer, ...exercise.alternatives].map((answer) => normalizeGrammarAnswer(answer, lang));
  if (answers.includes(actual)) return { correct: true, message: 'Верно! ' + exercise.explanation };
  const expected = answers[0];
  const withoutMarks = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');
  if (withoutMarks(actual) === withoutMarks(expected)) {
    return { correct: false, message: 'Проверь диакритику: долгота и надстрочные знаки здесь значимы. ' + exercise.explanation };
  }
  const actualWords = actual.split(' ');
  const expectedWords = expected.split(' ');
  const sameWords = lang !== 'ja' && [...actualWords].sort().join(' ') === [...expectedWords].sort().join(' ');
  return {
    correct: false,
    message: (sameWords ? 'Слова совпадают. Такой порядок не входит в варианты этого задания — попробуй воспроизвести учебный образец. ' : 'Ответ не совпал с учебными вариантами. Сверь форму глагола, служебные слова и окончания с образцом. ') + exercise.explanation,
  };
}

export function shuffledTokenIndices(tokens: string[]): number[] {
  const indices = tokens.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (indices.every((value, i) => tokens[value] === tokens[i])) indices.push(indices.shift()!);
  return indices;
}

export function recordGrammarAnswer(state: UserState, lang: LanguageCode, id: string, correct: boolean, assisted: boolean) {
  const next = structuredClone(state);
  const progress = StorageService.ensureLangProgress(next, lang);
  progress.grammarProgress ||= {};
  const previous = progress.grammarProgress[id] || { attempts: 0, correct: 0, streak: 0, needsReview: false, dueDate: '', lastRewardDate: '' };
  const independent = correct && !assisted;
  const today = getLocalDateKey();
  // Repeating an already successful item on the same day cannot inflate mastery or XP.
  const newSuccess = independent && previous.lastRewardDate !== today;
  const streak = independent ? Math.max(1, previous.streak + (newSuccess ? 1 : 0)) : 0;
  const due = new Date();
  due.setDate(due.getDate() + (independent ? [1, 3, 7, 14][Math.min(Math.max(streak - 1, 0), 3)] : 0));
  progress.grammarProgress[id] = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    streak, needsReview: !independent,
    dueDate: getLocalDateKey(due),
    lastRewardDate: newSuccess ? today : previous.lastRewardDate,
  };
  if (newSuccess) {
    next.xp += 2;
    StorageService.updateStreak(next);
  }
  StorageService.save(next);
  return next;
}

export function grammarLessonStats(state: UserState, lesson: GrammarLesson, lang: LanguageCode) {
  const exercises = buildGrammarExercises(lesson, lang);
  const saved = StorageService.getLangProgress(state, lang).grammarProgress || {};
  const learned = exercises.filter((ex) => saved[ex.id]?.streak > 0 && !saved[ex.id].needsReview).length;
  const due = exercises.filter((ex) => saved[ex.id] && (saved[ex.id].needsReview || saved[ex.id].dueDate <= getLocalDateKey())).length;
  return { total: exercises.length, learned, due, percent: exercises.length ? Math.round(learned / exercises.length * 100) : 0 };
}
