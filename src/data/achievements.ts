import { Achievement, UserState } from '../types';
import { LESSONS } from './lessons';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first',
    ico: '🚀',
    iconName: 'rocket',
    name: 'Первый шаг',
    desc: 'Пройди свой самый первый урок',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? Object.keys(curProg.doneLessons).length >= 1 : false;
    }
  },
  {
    id: 'l5',
    ico: '📚',
    iconName: 'book-open',
    name: 'Разгон',
    desc: 'Успешно заверши 5 уроков',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? Object.keys(curProg.doneLessons).length >= 5 : false;
    }
  },
  {
    id: 'lall',
    ico: '🏆',
    iconName: 'trophy',
    name: 'Полное погружение',
    desc: 'Пройди все уроки текущего курса',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? Object.keys(curProg.doneLessons).length >= LESSONS.length : false;
    }
  },
  {
    id: 'w10',
    ico: '📗',
    iconName: 'book-bookmark',
    name: 'Первая десятка',
    desc: 'Накопи 10 слов в личной копилке',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? curProg.learnedWords.length >= 10 : false;
    }
  },
  {
    id: 'w25',
    ico: '📘',
    iconName: 'book-closed',
    name: 'Четверть сотни',
    desc: 'В твоем словаре уже 25 слов',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? curProg.learnedWords.length >= 25 : false;
    }
  },
  {
    id: 'w50',
    ico: '🧠',
    iconName: 'brain',
    name: 'Живой словарь',
    desc: 'Выучи 50 слов на изучаемом языке',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? curProg.learnedWords.length >= 50 : false;
    }
  },
  {
    id: 's3',
    ico: '✨',
    iconName: 'sparkles',
    name: 'Искра',
    desc: 'Удерживай стрик 3 дня подряд',
    condition: (s: UserState) => s.streak.best >= 3
  },
  {
    id: 's7',
    ico: '🔥',
    iconName: 'flame',
    name: 'Пламя',
    desc: 'Удерживай стрик 7 дней подряд',
    condition: (s: UserState) => s.streak.best >= 7
  },
  {
    id: 's14',
    ico: '🌋',
    iconName: 'bolt-circle',
    name: 'Костёр не гаснет',
    desc: 'Удерживай стрик 14 дней подряд',
    condition: (s: UserState) => s.streak.best >= 14
  },
  {
    id: 'd50',
    ico: '🌊',
    iconName: 'waves',
    name: 'На глубине',
    desc: 'Достигни 50% уровня погружения',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? curProg.immersion >= 50 : false;
    }
  },
  {
    id: 'd90',
    ico: '🐬',
    iconName: 'target',
    name: 'Как рыба в воде',
    desc: 'Достигни 90% уровня погружения',
    condition: (s: UserState) => {
      const curProg = s.languages[s.currentLang];
      return curProg ? curProg.immersion >= 90 : false;
    }
  },
  {
    id: 'custom',
    ico: '✨',
    iconName: 'pencil',
    name: 'Творец',
    desc: 'Создай или импортируй свой собственный текст',
    condition: (s: UserState) => s.customLessons.length >= 1
  },
  {
    id: 'perf',
    ico: '🎯',
    iconName: 'check-double',
    name: 'Без промаха',
    desc: 'Заверши любой тест без единой ошибки (100%)',
    condition: (s: UserState) => s.perfectCount >= 1
  },
  {
    id: 'x500',
    ico: '⭐',
    iconName: 'medal',
    name: 'Пятьсот XP',
    desc: 'Заработай 500 очков опыта (XP)',
    condition: (s: UserState) => s.xp >= 500
  }
];
