import type { Route } from '../routes';

export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'it' | 'ja' | 'sk' | 'cs' | 'he' | 'kk' | 'ba';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  speechLang: string;
  bgLetters: string[];
}

export interface GrammarExample {
  target: string;
  ru: string;
  note?: string;
  chunks?: { text: string; role: string }[];
  alternatives?: string[];
  transform?: { prompt: string; answer: string; explanation: string; alternatives?: string[] };
}

export interface GrammarLesson {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  explanation: string;
  examples: GrammarExample[];
}

export interface AlphabetGroup {
  title: string;
  description?: string;
  letters: string[];
}

export interface AlphabetGuide {
  title: string;
  note: string;
  groups: AlphabetGroup[];
}

export type WordCategory =
  | 'люди'
  | 'основа'
  | 'еда'
  | 'дом'
  | 'город'
  | 'путешествия'
  | 'работа'
  | 'природа'
  | 'эмоции'
  | 'действия'
  | 'время';

export interface CategoryInfo {
  id: WordCategory;
  emoji: string;
  icon: string;
  title: string;
}

export interface Word {
  id: string;
  ru: string;
  en: string;
  es: string;
  de: string;
  fr: string;
  it: string;
  ja: string;
  sk?: string;
  cs?: string;
  he?: string;
  kk?: string;
  ba?: string;
  lvl: 1 | 2 | 3 | 4; // 1=A1, 2=A2, 3=B1, 4=B2/C1
  cat: WordCategory;
  exampleRu?: string;
}

export interface TextPieceWord {
  id: string;
  ru?: string;
}

export type TextPiece = string | TextPieceWord;

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  lvl: 1 | 2 | 3 | 4;
  sent: TextPiece[][];
  description?: string;
  isProOnly?: boolean;
}

export interface SRSItem {
  wordId: string;
  interval: number; // in days
  repetition: number;
  efactor: number; // easiness factor (default 2.5)
  dueDate: string; // YYYY-MM-DD
  lastReviewed: string; // YYYY-MM-DD
}

export interface DailyActivity {
  sessions: number;
  minutes: number;
  reviewedWords: number;
  newWords: number;
  completedTasks: string[];
  sessionCounted: boolean;
}

export type StudyTaskType = 'review' | 'new-words' | 'lesson' | 'grammar' | 'sprint';

export interface StudyTask {
  id: string;
  type: StudyTaskType;
  title: string;
  description: string;
  minutes: number;
  route: Route;
  targetId?: string;
  itemCount?: number;
  reviewedWords?: number;
  newWords?: number;
  completed: boolean;
}

export interface StudyPlan {
  totalMinutes: number;
  completedMinutes: number;
  tasks: StudyTask[];
  completed: boolean;
}

export type ListeningItemType = 'audio' | 'video' | 'series' | 'audiobook';

export interface ListeningItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  type: ListeningItemType;
  level: 1 | 2 | 3 | 4;
  minutes: number;
  transcriptUrl?: string;
}

export interface ListeningDayActivity {
  minutes: number;
  sessions: number;
  completedItems: string[];
}

export interface UserLanguageProgress {
  /**
   * Target share of the **whole text** shown in this language: 60 means 60% of
   * every word of every lesson, not 60% of the words that happen to have a
   * translation. Words with no entry for this language cap what is reachable,
   * and the reader reports the share it actually achieved.
   */
  immersion: number;
  /**
   * Passed lessons held at the current `immersion`. The dial only advances on
   * its own once this reaches its threshold, so a depth has to be lived at for
   * a run of lessons rather than merely stepped over. Reset on any change of
   * depth.
   */
  depthLessons?: number;
  learnedWords: string[]; // word IDs
  doneLessons: Record<string, { score: number; pct: number; date: string }>;
  srsData: Record<string, SRSItem>;
  testLvl: string | null;
  dailyActivity: Record<string, DailyActivity>;
  listeningActivity: Record<string, ListeningDayActivity>;
  grammarProgress: Record<string, GrammarExerciseProgress>;
  grammarSession?: { lessonId: string; exerciseIndex: number; assisted?: boolean };
}

export interface GrammarExerciseProgress {
  attempts: number;
  correct: number;
  streak: number;
  needsReview: boolean;
  dueDate: string;
  lastRewardDate: string;
}

export type SubscriptionTier = 'free' | 'pro';

export interface UserAccount {
  email: string;
  name: string;
  /**
   * True while a Supabase session exists. Derived from the live session rather
   * than stored, and rebuilt on every pull, so a signed-out device can never be
   * left looking signed in.
   */
  isAuth: boolean;
  /**
   * The Supabase auth user id, or empty while the app is used as a guest. This
   * is the only identifier the person has: the app keeps no separate user table
   * and no password of its own.
   */
  userId?: string;
  tier: SubscriptionTier;
  subscribedDate?: string;
  subscriptionPlan?: 'monthly' | 'yearly' | 'lifetime';
}

export interface UserState {
  onboarded: boolean;
  name: string;
  avatar: string;
  currentLang: LanguageCode;
  darkMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  account: UserAccount;
  languages: Partial<Record<LanguageCode, UserLanguageProgress>>;
  xp: number;
  perfectCount: number;
  streak: {
    current: number;
    best: number;
    lastActiveDate: string;
  };
  history: string[]; // array of YYYY-MM-DD dates active
  achievements: string[];
  customLessons: Lesson[];
}

export interface Achievement {
  id: string;
  ico: string;
  iconName?: string;
  name: string;
  desc: string;
  condition: (state: UserState) => boolean;
}
