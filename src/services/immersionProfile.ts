export interface ImmersionProfile {
  title: string;
  description: string;
  targetShare: number;
}

export const IMMERSION_PRESETS = [
  { value: 20, label: '20% · Опора' },
  { value: 40, label: '40% · Мостик' },
  { value: 60, label: '60% · Поток' },
  { value: 80, label: '80% · Среда' },
  { value: 95, label: '95% · Почти всё' },
  { value: 100, label: '100% · Полное' },
];

export const getImmersionProfile = (value: number): ImmersionProfile => {
  if (value <= 20) {
    return {
      title: 'Опора',
      description: 'Короткие знакомые островки языка внутри понятного русского текста.',
      targetShare: 20,
    };
  }
  if (value <= 40) {
    return {
      title: 'Мостик',
      description: 'Ключевые существительные и действия постепенно переходят на новый язык.',
      targetShare: 40,
    };
  }
  if (value <= 60) {
    return {
      title: 'Поток',
      description: 'Половина ключевого словаря урока звучит на изучаемом языке.',
      targetShare: 60,
    };
  }
  if (value <= 80) {
    return {
      title: 'Среда',
      description: 'Изучаемый язык становится главным, а русский остаётся опорой.',
      targetShare: 80,
    };
  }
  if (value <= 95) {
    return {
      title: 'Почти без перевода',
      description: 'Почти весь текст на изучаемом языке, русский остаётся лишь в редких связках.',
      targetShare: 95,
    };
  }
  return {
    title: 'Полное погружение',
    description: 'Все 100% ключевых слов урока читаются на изучаемом языке.',
    targetShare: 100,
  };
};
