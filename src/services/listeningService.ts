import { LanguageCode, ListeningDayActivity, ListeningItem, UserState } from '../types';
import { getLocalDateKey, StorageService } from './storageService';

export const DAILY_LISTENING_MINUTES = 15;

// These are links to the original publishers. We do not mirror or download
// their media, so the catalog stays lightweight and respects each source's
// own access and copyright rules.
export const LISTENING_LIBRARY: Record<LanguageCode, ListeningItem[]> = {
  en: [
    {
      id: 'en-voa-lets-learn',
      title: "Let's Learn English · Level 1",
      description: 'Короткие видеоуроки с сюжетом, диалогами и понятной речью для начинающих.',
      source: 'VOA Learning English',
      url: 'https://learningenglish.voanews.com/p/5644.html',
      type: 'series',
      level: 1,
      minutes: 5,
    },
    {
      id: 'en-bbc-6-minute',
      title: '6 Minute English',
      description: 'Небольшой разговорный выпуск о реальной теме с расшифровкой и словарём.',
      source: 'BBC Learning English',
      url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
      type: 'audio',
      level: 2,
      minutes: 6,
    },
    {
      id: 'en-librivox',
      title: 'Аудиокниги и рассказы на английском',
      description: 'Классические произведения в записях волонтёров: выбирай фрагмент на 10–15 минут.',
      source: 'LibriVox',
      url: 'https://librivox.org/',
      type: 'audiobook',
      level: 3,
      minutes: 15,
    },
  ],
  es: [
    {
      id: 'es-easy-spanish-school',
      title: 'Memorias de la escuela',
      description: 'Разговор о школе и воспоминаниях носителей испанского, выпуск примерно на 17 минут.',
      source: 'Easy Spanish',
      url: 'https://www.easyspanish.fm/2',
      type: 'audio',
      level: 2,
      minutes: 17,
      transcriptUrl: 'https://www.easyspanish.fm/2',
    },
    {
      id: 'es-podcasts-in-spanish',
      title: 'Real conversations in Spanish',
      description: 'Подборка живых разговоров с заданиями для самостоятельной практики.',
      source: 'Podcasts in Spanish',
      url: 'https://www.podcastsinspanish.org/',
      type: 'audio',
      level: 2,
      minutes: 15,
    },
    {
      id: 'es-librivox',
      title: 'Рассказы и аудиокниги на испанском',
      description: 'Бесплатная библиотека классики: выбери книгу на испанском и слушай один фрагмент.',
      source: 'LibriVox',
      url: 'https://librivox.org/',
      type: 'audiobook',
      level: 3,
      minutes: 15,
    },
  ],
  de: [
    {
      id: 'de-nicos-weg',
      title: 'Nicos Weg',
      description: 'Сюжетный видеокурс DW: короткие сцены из жизни Нико и постепенное усложнение речи.',
      source: 'Deutsche Welle',
      url: 'https://amp.dw.com/de/nicos-weg-einfach-deutsch-lernen/video-40876596',
      type: 'series',
      level: 1,
      minutes: 5,
    },
    {
      id: 'de-dw-learn-german',
      title: 'DW Learn German',
      description: 'Видео, аудио и новости для изучающих немецкий на разных уровнях.',
      source: 'Deutsche Welle',
      url: 'https://learngerman.dw.com/',
      type: 'video',
      level: 2,
      minutes: 10,
    },
    {
      id: 'de-librivox',
      title: 'Аудиокниги на немецком',
      description: 'Классические тексты в общественном достоянии — хороши для спокойного длинного слушания.',
      source: 'LibriVox',
      url: 'https://librivox.org/',
      type: 'audiobook',
      level: 3,
      minutes: 15,
    },
  ],
  fr: [
    {
      id: 'fr-rfi-journal-facile',
      title: 'Journal en français facile',
      description: 'Около 10 минут международных новостей с транскрипцией и упражнениями.',
      source: 'RFI Français facile',
      url: 'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-francais-facile/',
      type: 'audio',
      level: 2,
      minutes: 10,
      transcriptUrl: 'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-francais-facile/',
    },
    {
      id: 'fr-rfi-un-mot-une-histoire',
      title: 'Un mot, une histoire',
      description: 'Короткие истории вокруг одного слова, выражения или культурной темы.',
      source: 'RFI Français facile',
      url: 'https://francaisfacile.rfi.fr/fr/podcasts/un-mot-une-histoire/',
      type: 'audio',
      level: 3,
      minutes: 8,
    },
    {
      id: 'fr-librivox',
      title: 'Рассказы и аудиокниги на французском',
      description: 'Выбирай классический текст и слушай один небольшой отрывок с постепенным повтором.',
      source: 'LibriVox',
      url: 'https://librivox.org/',
      type: 'audiobook',
      level: 3,
      minutes: 15,
    },
  ],
  it: [
    {
      id: 'it-podcast-italiano-barista',
      title: 'Una super barista',
      description: 'История о римской бариста для начинающих: естественная речь, транскрипция и глоссарий.',
      source: 'Podcast Italiano',
      url: 'https://www.podcastitaliano.com/podcast-episode/una-super-barista',
      type: 'audio',
      level: 1,
      minutes: 12,
      transcriptUrl: 'https://www.podcastitaliano.com/podcast-episode/una-super-barista',
    },
    {
      id: 'it-podcast-italiano-video',
      title: 'Видео о языке и культуре',
      description: 'Аутентичные видео полностью на итальянском с материалами для самостоятельной работы.',
      source: 'Podcast Italiano',
      url: 'https://www.podcastitaliano.com/video',
      type: 'video',
      level: 2,
      minutes: 10,
    },
    {
      id: 'it-librivox',
      title: 'Аудиокниги на итальянском',
      description: 'Классические тексты и рассказы в бесплатных записях волонтёров.',
      source: 'LibriVox',
      url: 'https://librivox.org/',
      type: 'audiobook',
      level: 3,
      minutes: 15,
    },
  ],
  ja: [
    {
      id: 'ja-irodori-starter-02',
      title: 'いろどり · 入門 第2課',
      description: 'Официальные MP3-диалоги Japan Foundation: короткие бытовые сцены для начинающих.',
      source: 'Irodori / Japan Foundation',
      url: 'https://www.irodori.jpf.go.jp/starter/audio/lesson02.html',
      type: 'audio',
      level: 1,
      minutes: 10,
    },
    {
      id: 'ja-irodori-elementary-09',
      title: 'いろどり · 初級1 第9課',
      description: 'Диалоги о японском языке, чтении и повседневном общении с MP3-файлами.',
      source: 'Irodori / Japan Foundation',
      url: 'https://www.irodori.jpf.go.jp/elementary01/audio/lesson09.html',
      type: 'audio',
      level: 2,
      minutes: 12,
    },
    {
      id: 'ja-nhk-easier',
      title: 'NHK Easier',
      description: 'Короткие новости на упрощённом японском с фуриганой и аудио/текстовой опорой.',
      source: 'NHK Easier',
      url: 'https://nhkeasier.com/',
      type: 'audio',
      level: 3,
      minutes: 10,
    },
    {
      id: 'ja-librivox',
      title: 'Японские аудиокниги',
      description: 'Классические японские тексты в открытых записях LibriVox.',
      source: 'LibriVox',
      url: 'https://librivox.org/japanese-fairy-world-by-william-elliot-griffis/',
      type: 'audiobook',
      level: 4,
      minutes: 15,
    },
  ],
  cs: [
    {
      id: 'cs-slowczech-beginners',
      title: 'SlowCzech · Czech Podcast for Beginners',
      description: 'Бесплатные короткие выпуски с медленной естественной речью, бытовыми фразами и материалами для начинающих.',
      source: 'SlowCzech',
      url: 'https://slowczech.com/czech-podcast/',
      type: 'audio',
      level: 1,
      minutes: 10,
    },
    {
      id: 'cs-sound-czech',
      title: 'Sound Czech · Radio Prague',
      description: 'Короткие выпуски Radio Prague с полезными чешскими фразами и живым контекстом.',
      source: 'Radio Prague International',
      url: 'https://english.radio.cz/czech-language',
      type: 'audio',
      level: 2,
      minutes: 10,
    },
    {
      id: 'cs-slowczech-stories',
      title: 'SlowCzech · Real Czech for real life',
      description: 'Истории и разговоры о жизни и культуре Чехии: слушай один выпуск или отрывок около 15 минут.',
      source: 'SlowCzech',
      url: 'https://slowczech.com/',
      type: 'audio',
      level: 3,
      minutes: 15,
    },
  ],
  sk: [
    {
      id: 'sk-slovakforu',
      title: 'SlovakforU · Slovenčina na každý deň',
      description: 'Подкаст о повседневной словацкой речи: транспорт, семья, покупки, врач и работа.',
      source: 'SlovakforU',
      url: 'https://www.slovakforu.sk/',
      type: 'audio',
      level: 1,
      minutes: 10,
    },
    {
      id: 'sk-e-slovak-katherine',
      title: 'Katherine in Slovakia',
      description: 'Бесплатный 12-серийный видеосюжет о жизни и адаптации в Словакии.',
      source: 'e-slovak / Comenius University',
      url: 'https://www.e-slovak.sk/',
      type: 'series',
      level: 2,
      minutes: 10,
    },
    {
      id: 'sk-learn-slovak-filip',
      title: 'Learn Slovak with Filip',
      description: 'Короткие бесплатные видеоуроки с живыми фразами и понятным темпом.',
      source: 'Learn Slovak with Filip',
      url: 'https://www.learnslovak.net/index.html',
      type: 'video',
      level: 1,
      minutes: 8,
    },
    {
      id: 'sk-slovakforu-transcript',
      title: 'Ako počúvať podcast?',
      description: 'Выпуск SlovakforU о том, как слушать подкасты и окружать себя словацким языком.',
      source: 'SlovakforU',
      url: 'https://www.slovakforu.sk/',
      type: 'audio',
      level: 1,
      minutes: 8,
      transcriptUrl: 'https://www.slovakforu.sk/materials/sk/002_SK_transkript.pdf',
    },
  ],
};

const emptyDayActivity = (): ListeningDayActivity => ({
  minutes: 0,
  sessions: 0,
  completedItems: [],
});

export const getListeningDayActivity = (
  state: UserState,
  lang: LanguageCode,
  date = getLocalDateKey(),
): ListeningDayActivity => {
  const activity = StorageService.getLangProgress(state, lang).listeningActivity?.[date];
  return activity ? {
    minutes: Math.max(0, activity.minutes || 0),
    sessions: Math.max(0, activity.sessions || 0),
    completedItems: Array.isArray(activity.completedItems) ? activity.completedItems : [],
  } : emptyDayActivity();
};

export const getListeningProgress = (state: UserState, lang: LanguageCode, date = getLocalDateKey()) => {
  const activity = getListeningDayActivity(state, lang, date);
  return {
    ...activity,
    targetMinutes: DAILY_LISTENING_MINUTES,
    completed: activity.minutes >= DAILY_LISTENING_MINUTES,
  };
};

export const getRecommendedListeningItem = (
  lang: LanguageCode,
  date = getLocalDateKey(),
): ListeningItem => {
  const items = LISTENING_LIBRARY[lang] || LISTENING_LIBRARY.en;
  const dayNumber = Number(date.replace(/-/g, '')) || 0;
  return items[dayNumber % items.length];
};

export const recordListeningMinutes = (
  state: UserState,
  lang: LanguageCode,
  itemId: string,
  minutes: number,
  date = getLocalDateKey(),
): boolean => {
  const progress = StorageService.ensureLangProgress(state, lang);
  if (!progress.listeningActivity) progress.listeningActivity = {};
  const current = getListeningDayActivity(state, lang, date);
  const remaining = Math.max(0, DAILY_LISTENING_MINUTES - current.minutes);
  const addedMinutes = Math.min(remaining, Math.max(0, Math.round(minutes)));
  if (addedMinutes === 0) return false;

  const next: ListeningDayActivity = {
    minutes: current.minutes + addedMinutes,
    sessions: current.sessions,
    completedItems: current.completedItems.includes(itemId)
      ? current.completedItems
      : [...current.completedItems, itemId],
  };

  state.xp += next.minutes >= DAILY_LISTENING_MINUTES && current.minutes < DAILY_LISTENING_MINUTES ? 5 : 1;
  if (next.minutes >= DAILY_LISTENING_MINUTES && current.minutes < DAILY_LISTENING_MINUTES) {
    next.sessions += 1;
    StorageService.updateStreak(state);
  }

  progress.listeningActivity[date] = next;
  StorageService.save(state);
  return true;
};
