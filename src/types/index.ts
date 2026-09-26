import type { Route } from '../routes';

export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'it' | 'ja' | 'sk' | 'cs';

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
  immersion: number; // 5 to 90%
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

/**
 * PBKDF2-HMAC-SHA256 record persisted in `UserAccount.passwordHash`.
 * `salt` and `hash` are base64, `iterations` is the PBKDF2 work factor that was
 * actually used, so the cost can be raised later without invalidating records.
 */
export interface StoredPasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

/**
 * A `string` here is the legacy unsalted SHA-256 hex digest written by older
 * builds. It is never verified: `AuthModal` discards it and asks the user to
 * sign in again. The union keeps `StorageService`, which still forwards stored
 * values verbatim and only checks `typeof === 'string'`, type-safe.
 */
export type PasswordHash = StoredPasswordHash | string;

export interface UserAccount {
  email: string;
  name: string;
  isAuth: boolean;
  tier: SubscriptionTier;
  passwordHash?: PasswordHash;
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
  name: string;
  desc: string;
  condition: (state: UserState) => boolean;
}
