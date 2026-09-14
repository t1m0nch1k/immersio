import { CategoryInfo, WordCategory } from '../types';

export const CATEGORIES: Record<WordCategory, CategoryInfo> = {
  люди: { id: 'люди', emoji: '👥', title: 'Люди и семья' },
  основа: { id: 'основа', emoji: '💬', title: 'Основы общения' },
  еда: { id: 'еда', emoji: '🍽️', title: 'Еда и напитки' },
  дом: { id: 'дом', emoji: '🏠', title: 'Дом и уют' },
  город: { id: 'город', emoji: '🏙️', title: 'Город и инфраструктура' },
  путешествия: { id: 'путешествия', emoji: '✈️', title: 'Путешествия и транспорт' },
  работа: { id: 'работа', emoji: '💼', title: 'Работа и учёба' },
  природа: { id: 'природа', emoji: '🌿', title: 'Природа и погода' },
  эмоции: { id: 'эмоции', emoji: '💛', title: 'Эмоции и чувства' },
  действия: { id: 'действия', emoji: '⚡', title: 'Глаголы и действия' },
  время: { id: 'время', emoji: '⏳', title: 'Время и жизнь' },
};
