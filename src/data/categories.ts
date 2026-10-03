import { CategoryInfo, WordCategory } from '../types';

export const CATEGORIES: Record<WordCategory, CategoryInfo> = {
  люди: { id: 'люди', emoji: '👥', icon: 'cat-people', title: 'Люди и семья' },
  основа: { id: 'основа', emoji: '💬', icon: 'cat-chat', title: 'Основы общения' },
  еда: { id: 'еда', emoji: '🍽️', icon: 'cat-food', title: 'Еда и напитки' },
  дом: { id: 'дом', emoji: '🏠', icon: 'cat-home', title: 'Дом и уют' },
  город: { id: 'город', emoji: '🏙️', icon: 'cat-city', title: 'Город и инфраструктура' },
  путешествия: { id: 'путешествия', emoji: '✈️', icon: 'cat-travel', title: 'Путешествия и транспорт' },
  работа: { id: 'работа', emoji: '💼', icon: 'cat-work', title: 'Работа и учёба' },
  природа: { id: 'природа', emoji: '🌿', icon: 'cat-nature', title: 'Природа и погода' },
  эмоции: { id: 'эмоции', emoji: '💛', icon: 'cat-emotions', title: 'Эмоции и чувства' },
  действия: { id: 'действия', emoji: '⚡', icon: 'cat-verbs', title: 'Глаголы и действия' },
  время: { id: 'время', emoji: '⏳', icon: 'cat-time', title: 'Время и жизнь' },
};
