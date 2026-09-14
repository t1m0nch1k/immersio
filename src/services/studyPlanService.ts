import { GRAMMAR } from '../data/grammar';
import { LESSONS } from '../data/lessons';
import { LanguageCode, StudyPlan, StudyTask, UserState } from '../types';
import { getLocalDateKey, StorageService } from './storageService';
import { SRSService } from './srsService';

const TASK_MINUTES = 5;

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
  const weakLesson = LESSONS
    .filter((lesson) => progress.doneLessons[lesson.id] && progress.doneLessons[lesson.id].pct < 80)
    .sort((a, b) => progress.doneLessons[a.id].pct - progress.doneLessons[b.id].pct)[0];
  const recommendedLesson = weakLesson || nextLesson;
  const lessonIds = recommendedLesson ? lessonWordIds(recommendedLesson) : [];
  const learned = new Set(progress.learnedWords);
  const newWordIds = lessonIds.filter((id) => !learned.has(id)).slice(0, 5);
  const fallbackNewWords = ['hello', 'friend', 'language', 'question', 'answer'].filter((id) => !learned.has(id)).slice(0, 5);
  const selectedNewWords = newWordIds.length > 0 ? newWordIds : fallbackNewWords;
  const hasReviewWords = dueIds.length > 0 || progress.learnedWords.length > 0;
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
      description: dueIds.length > 0 ? `${dueIds.length} слов уже готовы к повторению.` : hasReviewWords ? 'Быстрый повтор слов из личного словаря.' : 'Познакомься с первыми словами в коротком раунде.',
      minutes: TASK_MINUTES,
      route: hasReviewWords ? 'practice' : 'sprint',
      itemCount: Math.min(dueIds.length || progress.learnedWords.length || 10, 10),
      reviewedWords: Math.min(dueIds.length || progress.learnedWords.length, 10),
      completed: false,
    },
    {
      id: `daily-${date}-new-words`,
      type: 'new-words',
      title: 'Добавить новые слова',
      description: selectedNewWords.length > 0 ? `${selectedNewWords.length} слов из ближайшей темы.` : 'Словарь уже заполнен — повтори сложные слова.',
      minutes: TASK_MINUTES,
      route: 'dict-all',
      targetId: selectedNewWords[0],
      itemCount: selectedNewWords.length,
      newWords: selectedNewWords.length,
      completed: false,
    },
    skillTask,
  ];

  tasks.forEach((task) => { task.completed = completed.has(task.id); });
  const completedMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.minutes, 0);
  return {
    totalMinutes: tasks.reduce((total, task) => total + task.minutes, 0),
    completedMinutes,
    tasks,
    completed: tasks.every((task) => task.completed),
  };
};
