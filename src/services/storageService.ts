import { DailyActivity, LanguageCode, StudyTask, UserLanguageProgress, UserState, ListeningDayActivity } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { audioService } from './audioService';

const STORAGE_KEY = 'pogruzhenie_v2';
const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es', 'de', 'fr', 'it', 'ja', 'sk', 'cs'];
const nonNegativeNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInitialProgress(): UserLanguageProgress {
  return {
    immersion: 10,
    learnedWords: [],
    doneLessons: {},
    srsData: {},
    testLvl: null,
    dailyActivity: {},
    listeningActivity: {},
    grammarProgress: {},
  };
}

export function getInitialState(): UserState {
  return {
    onboarded: false,
    name: '',
    avatar: '🦊',
    currentLang: 'en',
    darkMode: false,
    soundEnabled: true,
    account: {
      email: '',
      name: '',
      isAuth: false,
      tier: 'free',
    },
    languages: {
      en: getInitialProgress(),
    },
    xp: 0,
    perfectCount: 0,
    streak: {
      current: 0,
      best: 0,
      lastActiveDate: '',
    },
    history: [],
    achievements: [],
    customLessons: [],
  };
}

export class StorageService {
  public static load(): UserState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return getInitialState();
      const initial = getInitialState();

      const languages = {
        ...initial.languages,
        ...(parsed.languages && typeof parsed.languages === 'object' ? parsed.languages : {}),
      } as UserState['languages'];

      (Object.keys(languages) as LanguageCode[]).forEach((lang) => {
        const progress = languages[lang];
        const rawDailyActivity = progress?.dailyActivity && typeof progress.dailyActivity === 'object' ? progress.dailyActivity : {};
        const dailyActivity = Object.fromEntries(
          Object.entries(rawDailyActivity).map(([date, value]) => {
            const activity = value && typeof value === 'object' ? value as Partial<DailyActivity> : {};
            return [date, {
              sessions: nonNegativeNumber(activity.sessions),
              minutes: nonNegativeNumber(activity.minutes),
              reviewedWords: nonNegativeNumber(activity.reviewedWords),
              newWords: nonNegativeNumber(activity.newWords),
              completedTasks: Array.isArray(activity.completedTasks) ? activity.completedTasks : [],
              sessionCounted: activity.sessionCounted === true,
            } satisfies DailyActivity];
          })
        );
        const rawListeningActivity = progress?.listeningActivity && typeof progress.listeningActivity === 'object' ? progress.listeningActivity : {};
        const listeningActivity = Object.fromEntries(
          Object.entries(rawListeningActivity).map(([date, value]) => {
            const activity = value && typeof value === 'object' ? value as Partial<ListeningDayActivity> : {};
            return [date, {
              minutes: nonNegativeNumber(activity.minutes),
              sessions: nonNegativeNumber(activity.sessions),
              completedItems: Array.isArray(activity.completedItems) ? activity.completedItems.filter((id): id is string => typeof id === 'string') : [],
            } satisfies ListeningDayActivity];
          })
        );
        languages[lang] = {
          ...getInitialProgress(),
          ...(progress && typeof progress === 'object' ? progress : {}),
          // Remove ids created by the old unknown-token fallback. They do not
          // point to a dictionary record and would otherwise inflate counts or
          // create blank practice answers after a reload.
          learnedWords: Array.isArray(progress?.learnedWords)
            ? progress.learnedWords.filter((id): id is string => typeof id === 'string' && !id.startsWith('w_'))
            : [],
          doneLessons: progress?.doneLessons && typeof progress.doneLessons === 'object' ? progress.doneLessons : {},
          srsData: progress?.srsData && typeof progress.srsData === 'object' ? progress.srsData : {},
          dailyActivity,
          listeningActivity,
          grammarProgress: Object.fromEntries(Object.entries(progress?.grammarProgress || {}).filter(([, value]) => value && typeof value === 'object').map(([id, value]) => [id, {
            attempts: nonNegativeNumber(value.attempts),
            correct: nonNegativeNumber(value.correct),
            streak: nonNegativeNumber(value.streak),
            needsReview: value.needsReview === true,
            dueDate: typeof value.dueDate === 'string' ? value.dueDate : '',
            lastRewardDate: typeof value.lastRewardDate === 'string' ? value.lastRewardDate : '',
          }])),
          grammarSession: typeof progress?.grammarSession?.lessonId === 'string' && Number.isInteger(progress.grammarSession.exerciseIndex) && progress.grammarSession.exerciseIndex >= 0
            ? progress.grammarSession : undefined,
        };
      });

      const parsedAccount = parsed.account && typeof parsed.account === 'object' ? parsed.account : {};
      const parsedStreak = parsed.streak && typeof parsed.streak === 'object' ? parsed.streak : {};

      return {
        ...initial,
        ...parsed,
        currentLang: SUPPORTED_LANGUAGES.includes(parsed.currentLang) ? parsed.currentLang : initial.currentLang,
        xp: Number.isFinite(parsed.xp) && parsed.xp >= 0 ? parsed.xp : initial.xp,
        account: {
          ...initial.account,
          ...parsedAccount,
          // Paid access is disabled for the free catalogue phase.
          tier: 'free',
        },
        streak: {
          ...initial.streak,
          ...parsedStreak,
          current: Number.isFinite(parsedStreak.current) && parsedStreak.current >= 0 ? parsedStreak.current : 0,
          best: Number.isFinite(parsedStreak.best) && parsedStreak.best >= 0 ? parsedStreak.best : 0,
        },
        languages,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        customLessons: Array.isArray(parsed.customLessons) ? parsed.customLessons : [],
      };
    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
      return getInitialState();
    }
  }

  public static save(state: UserState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }

  public static getLangProgress(state: UserState, lang: LanguageCode): UserLanguageProgress {
    return state.languages[lang] || getInitialProgress();
  }

  public static ensureLangProgress(state: UserState, lang: LanguageCode): UserLanguageProgress {
    if (!state.languages[lang]) {
      state.languages[lang] = getInitialProgress();
    }
    return state.languages[lang]!;
  }

  public static recordDailyTask(
    state: UserState,
    lang: LanguageCode,
    task: StudyTask,
    taskIds: string[],
    date = getLocalDateKey()
  ): boolean {
    const progress = this.ensureLangProgress(state, lang);
    const current: DailyActivity = progress.dailyActivity[date] ? {
      ...progress.dailyActivity[date],
      completedTasks: Array.isArray(progress.dailyActivity[date].completedTasks) ? progress.dailyActivity[date].completedTasks : [],
    } : {
      sessions: 0,
      minutes: 0,
      reviewedWords: 0,
      newWords: 0,
      completedTasks: [],
      sessionCounted: false,
    };

    if (current.completedTasks.includes(task.id)) return false;

    current.completedTasks.push(task.id);
    current.minutes += task.minutes;
    current.reviewedWords += task.reviewedWords || 0;
    current.newWords += task.newWords || 0;
    state.xp += 3;

    if (!current.sessionCounted && taskIds.every((id) => current.completedTasks.includes(id))) {
      current.sessions += 1;
      current.sessionCounted = true;
      state.xp += 5;
      this.updateStreak(state);
    }

    progress.dailyActivity[date] = current;
    this.save(state);
    return true;
  }

  public static reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  public static updateStreak(state: UserState): { updated: boolean; current: number } {
    const today = getLocalDateKey();
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = getLocalDateKey(yesterdayObj);

    if (state.streak.lastActiveDate === today) {
      return { updated: false, current: state.streak.current };
    }

    if (state.streak.lastActiveDate === yesterday) {
      state.streak.current += 1;
    } else {
      state.streak.current = 1;
    }

    state.streak.best = Math.max(state.streak.best, state.streak.current);
    state.streak.lastActiveDate = today;

    if (!state.history.includes(today)) {
      state.history.push(today);
      if (state.history.length > 60) {
        state.history.shift();
      }
    }

    this.save(state);
    return { updated: true, current: state.streak.current };
  }

  public static checkAndUnlockAchievements(state: UserState, showToast: (msg: string) => void): string[] {
    const newlyUnlocked: string[] = [];

    ACHIEVEMENTS.forEach((ach) => {
      if (!state.achievements.includes(ach.id) && ach.condition(state)) {
        state.achievements.push(ach.id);
        newlyUnlocked.push(ach.name);
        showToast(`🏅 Достижение: ${ach.name}!`);
        audioService.playFanfare();
      }
    });

    if (newlyUnlocked.length > 0) {
      this.save(state);
    }

    return newlyUnlocked;
  }

  public static getRank(xp: number): { currentRank: string; nextRank: string | null; nextXp: number } {
    const RANKS: [number, string][] = [
      [0, 'Новичок'],
      [100, 'Ученик'],
      [250, 'Исследователь'],
      [500, 'Знаток'],
      [900, 'Полиглот'],
      [1500, 'Мастер'],
    ];

    let currentRank = RANKS[0][1];
    let nextRank: string | null = RANKS[1][1];
    let nextXp = RANKS[1][0];

    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i][0]) {
        currentRank = RANKS[i][1];
        if (i + 1 < RANKS.length) {
          nextRank = RANKS[i + 1][1];
          nextXp = RANKS[i + 1][0];
        } else {
          nextRank = null;
          nextXp = RANKS[i][0];
        }
      }
    }

    return { currentRank, nextRank, nextXp };
  }
}
