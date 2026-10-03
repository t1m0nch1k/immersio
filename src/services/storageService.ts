import { DailyActivity, LanguageCode, Lesson, SRSItem, StudyTask, TextPiece, UserLanguageProgress, UserState, ListeningDayActivity } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { audioService } from './audioService';
import { isValidAvatar } from '../utils/avatar';

const STORAGE_KEY = 'pogruzhenie_v2';
const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es', 'de', 'fr', 'it', 'ja', 'sk', 'cs'];
const nonNegativeNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
const finiteNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Strict `YYYY-MM-DD` check that also rejects non-existing calendar dates such
 * as `2026-02-31` or `2026-13-01` (a `new Date()` round trip would silently
 * roll them over into the next month).
 */
const isDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month - 1, day)).getUTCDate();
};

const isNumberKey = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** SuperMemo-2 easiness factor bounds kept in sync with `SRSService`. */
const EFACTOR_MIN = 1.3;
const EFACTOR_MAX = 3.0;

/**
 * A stored SRS record is either fully valid or dropped as a whole. Repairing a
 * single field would silently resurrect a card the user never reviewed.
 */
const isValidSrsItem = (value: unknown): value is SRSItem => {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.wordId)) return false;
  if (!isNumberKey(value.interval) || value.interval < 0) return false;
  if (!isNumberKey(value.repetition) || !Number.isInteger(value.repetition) || value.repetition < 0) return false;
  if (!isNumberKey(value.efactor) || value.efactor < EFACTOR_MIN || value.efactor > EFACTOR_MAX) return false;
  return isDateKey(value.dueDate) && isDateKey(value.lastReviewed);
};

/** `pct` is a percentage, so a value outside 0..100 is always corrupted data. */
const isValidDoneLesson = (value: unknown): value is { score: number; pct: number; date: string } => {
  if (!isPlainObject(value)) return false;
  if (!isNumberKey(value.score) || value.score < 0) return false;
  if (!isNumberKey(value.pct) || value.pct < 0 || value.pct > 100) return false;
  return typeof value.date === 'string';
};

const isValidTextPiece = (piece: unknown): piece is TextPiece => {
  if (typeof piece === 'string') return true;
  if (!isPlainObject(piece)) return false;
  return isNonEmptyString(piece.id) && (piece.ru === undefined || typeof piece.ru === 'string');
};

const LESSON_LEVELS = [1, 2, 3, 4];

/**
 * `Lesson.sent` is dereferenced with `.flat()` in the reader, so a single broken
 * sentence or piece would crash the whole screen. Custom lessons are user data
 * that can also come from an older export, therefore the record is rebuilt with
 * safe defaults instead of being dropped for a missing emoji.
 */
const sanitizeCustomLesson = (value: unknown): Lesson | null => {
  if (!isPlainObject(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return null;
  if (!Array.isArray(value.sent) || value.sent.length === 0) return null;
  const sentences = value.sent.filter(
    (sentence) => Array.isArray(sentence) && sentence.length > 0 && sentence.every(isValidTextPiece)
  ) as TextPiece[][];
  if (sentences.length !== value.sent.length) return null;
  return {
    id: value.id,
    title: value.title,
    emoji: typeof value.emoji === 'string' && value.emoji ? value.emoji : '📖',
    lvl: (LESSON_LEVELS.includes(value.lvl as number) ? value.lvl : 2) as Lesson['lvl'],
    sent: sentences,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(value.isProOnly === true ? { isProOnly: true } : {}),
  };
};

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInitialProgress(): UserLanguageProgress {
  return {
    immersion: 10,
    depthLessons: 0,
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
    hapticEnabled: true,
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

/**
 * Rebuilds a `UserLanguageProgress` field by field. Every value is taken from
 * an explicitly validated source, so unknown keys stored by an older build can
 * never be typed as a known field.
 */
const sanitizeLanguageProgress = (value: unknown): UserLanguageProgress => {
  const initial = getInitialProgress();
  const progress = isPlainObject(value) ? value : {};
  const rawDailyActivity = isPlainObject(progress.dailyActivity) ? progress.dailyActivity : {};
  const dailyActivity = Object.fromEntries(
    Object.entries(rawDailyActivity).map(([date, entry]) => {
      const activity = isPlainObject(entry) ? entry as Partial<DailyActivity> : {};
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
  const rawListeningActivity = isPlainObject(progress.listeningActivity) ? progress.listeningActivity : {};
  const listeningActivity = Object.fromEntries(
    Object.entries(rawListeningActivity).map(([date, entry]) => {
      const activity = isPlainObject(entry) ? entry as Partial<ListeningDayActivity> : {};
      return [date, {
        minutes: nonNegativeNumber(activity.minutes),
        sessions: nonNegativeNumber(activity.sessions),
        completedItems: Array.isArray(activity.completedItems) ? activity.completedItems.filter((id): id is string => typeof id === 'string') : [],
      } satisfies ListeningDayActivity];
    })
  );
  const rawDoneLessons = isPlainObject(progress.doneLessons) ? progress.doneLessons : {};
  const doneLessons: UserLanguageProgress['doneLessons'] = {};
  Object.entries(rawDoneLessons).forEach(([lessonId, entry]) => {
    if (!isNonEmptyString(lessonId) || !isValidDoneLesson(entry)) return;
    doneLessons[lessonId] = { score: entry.score, pct: entry.pct, date: entry.date };
  });
  const rawSrsData = isPlainObject(progress.srsData) ? progress.srsData : {};
  const srsData: UserLanguageProgress['srsData'] = {};
  Object.entries(rawSrsData).forEach(([wordId, entry]) => {
    if (!isNonEmptyString(wordId) || !isValidSrsItem(entry)) return;
    srsData[wordId] = {
      wordId: entry.wordId,
      interval: entry.interval,
      repetition: entry.repetition,
      efactor: entry.efactor,
      dueDate: entry.dueDate,
      lastReviewed: entry.lastReviewed,
    };
  });
  const rawGrammarProgress = isPlainObject(progress.grammarProgress) ? progress.grammarProgress : {};
  const grammarProgress: UserLanguageProgress['grammarProgress'] = {};
  Object.entries(rawGrammarProgress).forEach(([id, entry]) => {
    if (!isPlainObject(entry)) return;
    grammarProgress[id] = {
      attempts: nonNegativeNumber(entry.attempts),
      correct: nonNegativeNumber(entry.correct),
      streak: nonNegativeNumber(entry.streak),
      needsReview: entry.needsReview === true,
      dueDate: typeof entry.dueDate === 'string' ? entry.dueDate : '',
      lastRewardDate: typeof entry.lastRewardDate === 'string' ? entry.lastRewardDate : '',
    };
  });
  const rawSession = isPlainObject(progress.grammarSession) ? progress.grammarSession : null;

  return {
    // The immersion slider works in percent of the whole text, so anything
    // outside 0..100 is noise.
    immersion: Math.min(100, Math.max(0, finiteNumber(progress.immersion, initial.immersion))),
    // Lessons held at the current depth. A missing or corrupt value reads as 0,
    // which is simply "the run has not started", never a silent skip.
    depthLessons: nonNegativeNumber(progress.depthLessons),
    // Remove ids created by the old unknown-token fallback. They do not
    // point to a dictionary record and would otherwise inflate counts or
    // create blank practice answers after a reload.
    learnedWords: Array.isArray(progress.learnedWords)
      ? progress.learnedWords.filter((id): id is string => typeof id === 'string' && !id.startsWith('w_'))
      : [],
    doneLessons,
    srsData,
    testLvl: typeof progress.testLvl === 'string' ? progress.testLvl : null,
    dailyActivity,
    listeningActivity,
    grammarProgress,
    grammarSession: rawSession
      && typeof rawSession.lessonId === 'string'
      && Number.isInteger(rawSession.exerciseIndex)
      && (rawSession.exerciseIndex as number) >= 0
      ? rawSession as UserLanguageProgress['grammarSession']
      : undefined,
  };
};

export type SaveListener = (state: UserState) => void;

/**
 * Told about every successful save.
 *
 * The sync engine hangs off this rather than off a React effect. Twenty-four of
 * the twenty-nine save sites mutate the state in place and pass on a shallow copy
 * only to force a re-render, and `grammarService`/`listeningService` save without
 * telling React at all, so an effect keyed on the state would miss writes and
 * fail silently. A listener here sees every one of them.
 *
 * Kept as a settable hook rather than an import so this module stays free of any
 * dependency on the network layer, and so the storage tests can drive it without
 * a Supabase client.
 */
let saveListener: SaveListener | null = null;

const notifySaved = (state: UserState): void => {
  if (!saveListener) return;
  try {
    saveListener(state);
  } catch (e) {
    // A mirror that cannot be written must never take the local write down with
    // it: the state is already safely in localStorage by this point.
    console.warn('Save listener failed', e);
  }
};

export class StorageService {
  /** Registers the sync mirror. Pass `null` to detach. */
  public static onSave(listener: SaveListener | null): void {
    saveListener = listener;
  }

  public static load(): UserState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialState();
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) return getInitialState();
      const initial = getInitialState();

      // Only the languages that really exist in the state are hydrated, and only
      // for supported codes: `en` is always present because `getInitialState`
      // creates it, everything else comes from the stored progress.
      const rawLanguages = isPlainObject(parsed.languages) ? parsed.languages : {};
      const langKeys = Object.keys(rawLanguages).filter((key): key is LanguageCode =>
        (SUPPORTED_LANGUAGES as string[]).includes(key)
      );
      if (!langKeys.includes('en')) langKeys.unshift('en');
      const languages: UserState['languages'] = {};
      langKeys.forEach((lang) => {
        languages[lang] = sanitizeLanguageProgress(rawLanguages[lang]);
      });

      const parsedAccount = isPlainObject(parsed.account) ? parsed.account : {};
      const parsedStreak = isPlainObject(parsed.streak) ? parsed.streak : {};
      const subscriptionPlan = parsedAccount.subscriptionPlan;
      const storedLang = parsed.currentLang;
      const isOnboarded = parsed.onboarded === true;
      const darkMode = parsed.darkMode === true;
      const soundEnabled = parsed.soundEnabled;
      const userId = parsedAccount.userId;

      return {
        onboarded: isOnboarded,
        name: typeof parsed.name === 'string' ? parsed.name : initial.name,
        avatar: isValidAvatar(parsed.avatar) ? parsed.avatar : initial.avatar,
        currentLang: typeof storedLang === 'string' && (SUPPORTED_LANGUAGES as string[]).includes(storedLang)
          ? storedLang as LanguageCode
          : initial.currentLang,
        darkMode,
        soundEnabled: typeof soundEnabled === 'boolean' ? soundEnabled : initial.soundEnabled,
        hapticEnabled: typeof parsed.hapticEnabled === 'boolean' ? parsed.hapticEnabled : initial.hapticEnabled,
        account: {
          email: typeof parsedAccount.email === 'string' ? parsedAccount.email : initial.account.email,
          name: typeof parsedAccount.name === 'string' ? parsedAccount.name : initial.account.name,
          // A session is only believed if it names a user. Older builds wrote
          // `isAuth: true` with no id and nothing that could be re-verified, and
          // keeping the flag would promise a sign-in that cannot be checked.
          isAuth: parsedAccount.isAuth === true && typeof userId === 'string' && userId.length > 0,
          // Paid access is disabled for the free catalogue phase.
          tier: 'free',
          // Optional fields stay only when they still have the declared type.
          ...(typeof userId === 'string' && userId.length > 0 ? { userId } : {}),
          ...(isNonEmptyString(parsedAccount.subscribedDate) ? { subscribedDate: parsedAccount.subscribedDate } : {}),
          ...(subscriptionPlan === 'monthly' || subscriptionPlan === 'yearly' || subscriptionPlan === 'lifetime'
            ? { subscriptionPlan }
            : {}),
        },
        languages,
        xp: isNumberKey(parsed.xp) && parsed.xp >= 0 ? parsed.xp : initial.xp,
        perfectCount: isNumberKey(parsed.perfectCount) && parsed.perfectCount >= 0 ? parsed.perfectCount : initial.perfectCount,
        streak: {
          current: isNumberKey(parsedStreak.current) && parsedStreak.current >= 0 ? parsedStreak.current : 0,
          best: isNumberKey(parsedStreak.best) && parsedStreak.best >= 0 ? parsedStreak.best : 0,
          lastActiveDate: typeof parsedStreak.lastActiveDate === 'string' ? parsedStreak.lastActiveDate : '',
        },
        history: Array.isArray(parsed.history) ? parsed.history.filter((day): day is string => typeof day === 'string') : [],
        achievements: Array.isArray(parsed.achievements)
          ? parsed.achievements.filter((id): id is string => typeof id === 'string')
          : [],
        customLessons: Array.isArray(parsed.customLessons)
          ? parsed.customLessons
            .map(sanitizeCustomLesson)
            .filter((lesson): lesson is Lesson => lesson !== null)
          : [],
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
      return;
    }
    notifySaved(state);
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
