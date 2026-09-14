import { Achievement, UserState } from '../types';
import { LESSONS } from './lessons';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first',
    ico: '🚀',
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
    name: 'Искра',
    desc: 'Удерживай стрик 3 дня подряд',
    condition: (s: UserState) => s.streak.best >= 3
  },
  {
    id: 's7',
    ico: '🔥',
    name: 'Пламя',
    desc: 'Удерживай стрик 7 дней подряд',
    condition: (s: UserState) => s.streak.best >= 7
  },
  {
    id: 's14',
    ico: '🌋',
    name: 'Костёр не гаснет',
    desc: 'Удерживай стрик 14 дней подряд',
    condition: (s: UserState) => s.streak.best >= 14
  },
  {
    id: 'd50',
    ico: '🌊',
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
    name: 'Творец',
    desc: 'Создай или импортируй свой собственный текст',
    condition: (s: UserState) => s.customLessons.length >= 1
  },
  {
    id: 'perf',
    ico: '🎯',
    name: 'Без промаха',
    desc: 'Заверши любой тест без единой ошибки (100%)',
    condition: (s: UserState) => s.perfectCount >= 1
  },
  {
    id: 'x500',
    ico: '⭐',
    name: 'Пятьсот XP',
    desc: 'Заработай 500 очков опыта (XP)',
    condition: (s: UserState) => s.xp >= 500
  }
];
