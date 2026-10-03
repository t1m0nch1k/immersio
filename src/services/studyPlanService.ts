import { GRAMMAR } from '../data/grammar';
import { LESSONS } from '../data/lessons';
import { LanguageCode, StudyPlan, StudyTask, UserState } from '../types';
import { getLocalDateKey, StorageService } from './storageService';
import { SRSService } from './srsService';

import { buildGrammarExercises, grammarLessonStats } from './grammarService';

const TASK_MINUTES = 5;

/** Cards per practice round. `PracticeView` caps a round at ten. */
const REVIEW_BATCH = 10;

/** "раунд" / "раунда" / "раундов" — the plan says how long the backlog is. */
/** Russian plural for "слово": 1 слово, 2-4 слова, 5+ слов. */
const wordWord = (n: number): string => {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'слов';
  if (mod10 === 1) return 'слово';
  if (mod10 >= 2 && mod10 <= 4) return 'слова';
  return 'слов';
};

const roundWord = (n: number): string => {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'раундов';
  if (mod10 === 1) return 'раунд';
  if (mod10 >= 2 && mod10 <= 4) return 'раунда';
  return 'раундов';
};

/**
 * How many words a day may add, given how much is already overdue.
 *
 * A flat "five a day" is actively counterproductive for someone carrying a
 * backlog: every new word is scheduled ahead of the cards they have not
 * reviewed yet, so the backlog grows instead of draining. The allowance
 * shrinks as the overdue count rises and never reaches zero — stopping
 * completely would strand words the learner has already half-learned, and the
 * minimum keeps a daily session from having nothing new in it.
 */
export const newWordAllowance = (dueCount: number): number => {
  if (!Number.isFinite(dueCount) || dueCount <= 0) return 5;
  // Bands rather than a formula, because the whole catalogue only holds ~164
  // distinct lesson words: a per-20 divisor would need 140 overdue cards before
  // anything changed, which is more than most learners will ever see. These
  // steps sit inside the range real state actually produces.
  if (dueCount <= 30) return 5;
  if (dueCount <= 70) return 4;
  if (dueCount <= 120) return 3;
  return 2;
};

/** The human-readable title of the topic with the most overdue exercises. */
const topGrammarTitle = (due: DueGrammarTopic[], lang: LanguageCode): string => {
  const match = (GRAMMAR[lang] || []).find((lesson) => lesson.id === due[0]?.topicId);
  return match?.title ?? 'грамматика';
};

/**
 * Exercises waiting to be redone, across every grammar topic of the language.
 *
 * `recordGrammarAnswer` already schedules a wrong or assisted answer for the
 * same day and `grammarLessonStats` already counts it per topic; nothing
 * gathered both into the daily plan, which is why a forgotten rule sat there
 * until the learner happened to open that screen.
 *
 * `dueDate <= today` covers both the "come back tomorrow" ladder and the
 * unparseable-empty-date case, which must not hide an item forever — the same
 * reasoning as `SRSService.isDue`.
 */
interface DueGrammarTopic {
  topicId: string;
  count: number;
  /** Overdue share of the topic's exercises: redoing two errors in a topic you
   *  already ace teaches nothing, so the plan prefers the unmastered ones. */
  priority: number;
}

const dueGrammarExercises = (state: UserState, lang: LanguageCode): DueGrammarTopic[] => {
  const today = getLocalDateKey();
  const progress = StorageService.getLangProgress(state, lang);
  const saved = progress.grammarProgress || {};
  if (Object.keys(saved).length === 0) return [];

  return (GRAMMAR[lang] || [])
    .map((lesson) => {
      // An exercise id is `${lessonId}:${exampleIndex}:${mode}`, so the topic is
      // everything before the last two colons. Counting from the built
      // exercises rather than by string surgery keeps this honest if the id
      // format ever changes.
      const due = buildGrammarExercises(lesson, lang).filter((exercise) => {
        const record = saved[exercise.id];
        if (!record) return false;
        return record.needsReview || !/^\d{4}-\d{2}-\d{2}$/.test(record.dueDate) || record.dueDate <= today;
      }).length;
      return { topicId: lesson.id, count: due, stats: grammarLessonStats(state, lesson, lang) };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ topicId, count, stats }) => ({
      topicId,
      count,
      // Prefer a topic that is both overdue and far from mastered: redoing two
      // errors in a topic you already ace teaches nothing.
      priority: count / Math.max(stats.total, 1),
    }));
};

const lessonWordIds = (lesson: typeof LESSONS[number]): string[] => {
  const ids: string[] = [];
  lesson.sent.flat().forEach((piece) => {
    if (typeof piece !== 'string' && piece.id && !ids.includes(piece.id)) ids.push(piece.id);
  });
  return ids;
};

const completedTaskIds = (state: UserState, lang: LanguageCode, date: string): string[] => {
  return StorageService.getLangProgress(state, lang).dailyActivity[date]?.completedTasks || [];
};

export const buildStudyPlan = (state: UserState, lang: LanguageCode, date = getLocalDateKey()): StudyPlan => {
  const progress = StorageService.getLangProgress(state, lang);
  const completed = new Set(completedTaskIds(state, lang, date));
  const dueIds = progress.learnedWords.filter((id) => {
    const item = progress.srsData[id] || SRSService.createDefaultItem(id);
    return SRSService.isDue(item);
  });

  const nextLesson = LESSONS.find((lesson) => !progress.doneLessons[lesson.id]);
  // A fixed 80% line is kept deliberately. Making it relative to the learner's
  // own average was tried and reverted: on a tight distribution — every lesson
  // between 83 and 88 — no lesson sits five points under the average, so the
  // rule never fires, and on a strong record it fires on a 93% lesson the learner
  // clearly knows. "Below 80" is both simpler and closer to what the score means:
  // 80% is the reader's own pass threshold, and any lesson under it is worth a
  // second pass regardless of how good the rest of the record looks.
  const weakLesson = LESSONS
    .filter((lesson) => {
      const done = progress.doneLessons[lesson.id];
      return Boolean(done) && typeof done.pct === 'number' && Number.isFinite(done.pct) && done.pct < 80;
    })
    .sort((a, b) => progress.doneLessons[a.id].pct - progress.doneLessons[b.id].pct)[0];
  const recommendedLesson = weakLesson || nextLesson;
  const lessonIds = recommendedLesson ? lessonWordIds(recommendedLesson) : [];
  const learned = new Set(progress.learnedWords);
  // Only words of the recommended lesson are offered: a hardcoded English id
  // list is meaningless for every other supported language, and an empty
  // selection is a valid plan state (the task simply shows 0 new words).
  const allowance = newWordAllowance(dueIds.length);
  const selectedNewWords = lessonIds.filter((id) => !learned.has(id)).slice(0, allowance);
  const hasReviewWords = dueIds.length > 0 || progress.learnedWords.length > 0;
  const dueGrammar = dueGrammarExercises(state, lang);
  const grammarDueTotal = dueGrammar.reduce((sum, entry) => sum + entry.count, 0);
  const grammarAvailable = (GRAMMAR[lang] || []).length > 0;
  const skillType = recommendedLesson ? 'lesson' : grammarAvailable ? 'grammar' : 'sprint';
  const skillTask: StudyTask = skillType === 'lesson'
    ? {
      id: `daily-${date}-lesson-${recommendedLesson!.id}`,
      type: 'lesson',
      title: weakLesson ? 'Закрепить слабую тему' : 'Следующий урок погружения',
      description: `${recommendedLesson!.emoji} ${recommendedLesson!.title}`,
      minutes: TASK_MINUTES,
      route: 'lessons',
      targetId: recommendedLesson!.id,
      completed: false,
    }
    : skillType === 'grammar'
      ? {
        id: `daily-${date}-grammar`,
        type: 'grammar',
        title: 'Одна грамматическая тема',
        description: 'Разбери правило и проговори пример вслух.',
        minutes: TASK_MINUTES,
        route: 'grammar',
        completed: false,
      }
      : {
        id: `daily-${date}-sprint`,
        type: 'sprint',
        title: 'Короткий спринт',
        description: '10 слов на скорость с озвучкой.',
        minutes: TASK_MINUTES,
        route: 'sprint',
        completed: false,
      };

  const tasks: StudyTask[] = [
    {
      id: `daily-${date}-review`,
      type: 'review',
      title: dueIds.length > 0 ? 'Повторить слова по SRS' : hasReviewWords ? 'Освежить знакомые слова' : 'Разогрев в спринте',
      description: dueIds.length > 0 ? `${dueIds.length} ${wordWord(dueIds.length)} готовы к повторению.` : hasReviewWords ? 'Быстрый повтор слов из личного словаря.' : 'Познакомься с первыми словами в коротком раунде.',
      minutes: TASK_MINUTES,
      route: hasReviewWords ? 'practice' : 'sprint',
      itemCount: Math.min(dueIds.length || progress.learnedWords.length || 10, 10),
      reviewedWords: Math.min(dueIds.length || progress.learnedWords.length, 10),
      // A single session can only take ten cards, so when the backlog runs past
      // that the rest has to be visible or the learner sees "10 of 154" and
      // concludes the other 144 do not exist. `PracticeView` shows up to ten per
      // round, so the number here is "how many rounds" — which is exactly what
      // tells someone the backlog is real and roughly how long it takes.
      ...(dueIds.length > REVIEW_BATCH
        ? { description: `${dueIds.length} ${wordWord(dueIds.length)} уже готовы к повторению. По ${REVIEW_BATCH} за раунд — это ${Math.ceil(dueIds.length / REVIEW_BATCH)} ${roundWord(Math.ceil(dueIds.length / REVIEW_BATCH))}.` }
        : {}),
      completed: false,
    },
    {
      id: `daily-${date}-new-words`,
      type: 'new-words',
      title: 'Добавить новые слова',
      // When the backlog is large the allowance drops below five. Saying so
      // explains a plan that looks smaller than yesterday's without anyone
      // having to guess why.
      description: selectedNewWords.length > 0
        ? `${selectedNewWords.length} слов из ближайшей темы${allowance < 5 ? ` — новых меньше, пока не разобрано ${dueIds.length}` : ''}.`
        : 'Словарь уже заполнен — повтори сложные слова.',
      minutes: TASK_MINUTES,
      route: 'dict-all',
      ...(selectedNewWords.length > 0 ? { targetId: selectedNewWords[0] } : {}),
      itemCount: selectedNewWords.length,
      newWords: selectedNewWords.length,
      completed: false,
    },
    skillTask,
  ];

  // Overdue grammar is a fourth task rather than a replacement for the lesson
  // one: a forgotten rule is overdue on its own schedule, and swapping it in
  // would silently stop offering new lessons while the backlog cleared. It is
  // appended only when something is actually waiting, so a clean plan stays at
  // three tasks and keeps its fifteen minutes.
  if (grammarDueTotal > 0 && skillTask.type !== 'grammar') {
    tasks.push({
      id: `daily-${date}-grammar-review`,
      type: 'grammar',
      title: 'Вернуть забытые правила',
      description: `${grammarDueTotal} ${grammarDueTotal === 1 ? 'ошибка ждёт повтора' : grammarDueTotal < 5 ? 'ошибки ждут повтора' : 'ошибок ждут повтора'} — начни с темы «${topGrammarTitle(dueGrammar, lang)}».`,
      minutes: TASK_MINUTES,
      route: 'grammar',
      ...(dueGrammar[0] ? { targetId: dueGrammar[0].topicId } : {}),
      itemCount: grammarDueTotal,
      completed: false,
    });
  }

  tasks.forEach((task) => { task.completed = completed.has(task.id); });
  const completedMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.minutes, 0);
  return {
    totalMinutes: tasks.reduce((total, task) => total + task.minutes, 0),
    completedMinutes,
    tasks,
    completed: tasks.every((task) => task.completed),
  };
};
