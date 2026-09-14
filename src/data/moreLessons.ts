import { Lesson, TextPiece } from '../types';

type LessonTopic = {
  title: string;
  emoji: string;
  level: 1 | 2 | 3 | 4;
  description: string;
  words: [string, string, string, string];
};

const word = (id: string): TextPiece => ({ id });

const makeLesson = (topic: LessonTopic, index: number): Lesson => {
  const [first, second, third, fourth] = topic.words;
  const patterns: TextPiece[][][] = [
    [
      ['В этой теме встречаются', word(first), 'и', word(second), '.'],
      ['Свяжи', word(third), 'с', word(fourth), 'в одной истории.'],
      ['Произнеси вслух:', word(first), ',', word(third), '.'],
      ['Повтори', word(second), 'и', word(fourth), 'через несколько минут.'],
    ],
    [
      ['Начни с понятия', word(first), 'и добавь к нему', word(second), '.'],
      ['В реальном разговоре пригодятся', word(third), 'и', word(fourth), '.'],
      ['Составь короткую фразу со словом', word(first), '.'],
      ['Проверь себя: можешь ли ты быстро вспомнить', word(second), '?'],
    ],
    [
      ['Запомни пару:', word(first), '—', word(second), '.'],
      ['Теперь расширь контекст словами', word(third), 'и', word(fourth), '.'],
      ['Скажи эту связку сначала медленно, потом естественно.'],
      ['В конце урока повтори все четыре слова: ', word(first), ',', word(second), ',', word(third), ',', word(fourth), '.'],
    ],
  ];

  return {
    id: `l${index}`,
    title: topic.title,
    emoji: topic.emoji,
    lvl: topic.level,
    description: topic.description,
    sent: patterns[(index - 39) % patterns.length],
  };
};

const TOPICS: LessonTopic[] = [
  { title: 'Знакомство и small talk', emoji: '🤝', level: 1, description: 'Первый разговор: имя, интересы и простые вопросы.', words: ['hello', 'name', 'friend', 'question'] },
  { title: 'Моя семья', emoji: '👨‍👩‍👧', level: 1, description: 'Расскажи о близких и семейных привычках.', words: ['family', 'mother', 'father', 'child'] },
  { title: 'Люди вокруг нас', emoji: '🧑‍🤝‍🧑', level: 1, description: 'Люди, соседи и роли в повседневной жизни.', words: ['person', 'woman', 'man', 'neighbor'] },
  { title: 'Утренний ритуал', emoji: '🌄', level: 1, description: 'Утро от пробуждения до выхода из дома.', words: ['wake', 'morning', 'coffee', 'exit'] },
  { title: 'Домашние дела', emoji: '🧹', level: 1, description: 'Комнаты, порядок и небольшие дела по дому.', words: ['house', 'room', 'door', 'window'] },
  { title: 'На кухне', emoji: '🍳', level: 1, description: 'Продукты, посуда и простой домашний рецепт.', words: ['kitchen', 'cook', 'bread', 'water'] },
  { title: 'Завтрак без спешки', emoji: '🥐', level: 1, description: 'Завтракаем, обсуждаем планы и собираемся.', words: ['breakfast', 'milk', 'apple', 'tea'] },
  { title: 'Покупки в магазине', emoji: '🛒', level: 1, description: 'Найти товар, спросить цену и оплатить покупку.', words: ['shop', 'supermarket', 'price', 'buy'] },
  { title: 'В кафе', emoji: '🍽️', level: 1, description: 'Заказ, просьбы официанту и разговор за столом.', words: ['restaurant', 'dinner', 'hungry', 'cheese'] },
  { title: 'Мой обычный день', emoji: '📅', level: 1, description: 'Последовательно описываем день от утра до вечера.', words: ['day', 'today', 'work', 'evening'] },
  { title: 'Городской автобус', emoji: '🚌', level: 1, description: 'Маршрут, остановка и поездка по городу.', words: ['bus', 'street', 'city', 'station'] },
  { title: 'Ориентируемся в городе', emoji: '🗺️', level: 1, description: 'Как спросить дорогу и найти нужное место.', words: ['map', 'square', 'bridge', 'street'] },
  { title: 'На вокзале', emoji: '🚉', level: 2, description: 'Билет, расписание и ожидание поезда.', words: ['train', 'ticket', 'station', 'wait'] },
  { title: 'Поездка на машине', emoji: '🚗', level: 2, description: 'Дорога, навигация и безопасное движение.', words: ['car', 'go', 'map', 'journey'] },
  { title: 'Бронирование отеля', emoji: '🏨', level: 2, description: 'Заселение, бронь и просьбы к персоналу.', words: ['hotel', 'reservation', 'room', 'key'] },
  { title: 'В аэропорту', emoji: '🛫', level: 2, description: 'Регистрация, багаж и посадка на рейс.', words: ['airport', 'suitcase', 'ticket', 'travel'] },
  { title: 'Море и пляж', emoji: '🏖️', level: 2, description: 'Погода, отдых у воды и планы на день.', words: ['beach', 'sea', 'sun', 'weather'] },
  { title: 'В горах', emoji: '⛰️', level: 2, description: 'Маршрут, природа и впечатления от похода.', words: ['mountain', 'forest', 'walk', 'fresh'] },
  { title: 'Планы на неделю', emoji: '🗓️', level: 2, description: 'Договариваемся о встречах и распределяем время.', words: ['week', 'tomorrow', 'meet', 'time'] },
  { title: 'Вечер с друзьями', emoji: '🎶', level: 2, description: 'Приглашение, музыка и приятная беседа.', words: ['friend', 'music', 'song', 'happy'] },
  { title: 'Учёба и расписание', emoji: '📚', level: 2, description: 'Уроки, задания и прогресс в изучении языка.', words: ['school', 'lesson', 'book', 'language'] },
  { title: 'Рабочий день', emoji: '💼', level: 2, description: 'Офис, задачи и общение с коллегами.', words: ['work', 'office', 'meeting', 'project'] },
  { title: 'Первый рабочий проект', emoji: '🧩', level: 2, description: 'Цели, сроки и распределение ответственности.', words: ['project', 'goal', 'time', 'success'] },
  { title: 'Телефонный разговор', emoji: '📞', level: 2, description: 'Позвонить, уточнить информацию и попрощаться.', words: ['phone', 'question', 'answer', 'speak'] },
  { title: 'Сообщение и письмо', emoji: '✉️', level: 2, description: 'Короткие сообщения, просьбы и важные детали.', words: ['letter', 'write', 'read', 'word'] },
  { title: 'Погода меняется', emoji: '🌦️', level: 2, description: 'Солнце, дождь, ветер и подходящая одежда.', words: ['weather', 'rain', 'wind', 'jacket'] },
  { title: 'Здоровье и отдых', emoji: '🩺', level: 2, description: 'Самочувствие, врач и восстановление.', words: ['health', 'doctor', 'medicine', 'rest'] },
  { title: 'В аптеке', emoji: '💊', level: 2, description: 'Объяснить симптомы и попросить совет.', words: ['pharmacy', 'medicine', 'help', 'doctor'] },
  { title: 'Сон и энергия', emoji: '🌙', level: 2, description: 'Режим сна, усталость и полезные привычки.', words: ['sleep', 'tired', 'night', 'early'] },
  { title: 'Одежда по погоде', emoji: '🧥', level: 2, description: 'Выбрать одежду для дождя, холода или солнца.', words: ['jacket', 'umbrella', 'warm', 'snow'] },
  { title: 'Домашний ремонт', emoji: '🔧', level: 3, description: 'Обсуждаем проблему, инструменты и результат.', words: ['house', 'door', 'window', 'help'] },
  { title: 'Новый район', emoji: '🏙️', level: 3, description: 'Познакомиться с районом, магазинами и соседями.', words: ['city', 'street', 'shop', 'neighbor'] },
  { title: 'Культура и музей', emoji: '🖼️', level: 3, description: 'Картины, история и личные впечатления.', words: ['museum', 'art', 'painting', 'culture'] },
  { title: 'Кино и сюжет', emoji: '🎬', level: 3, description: 'Рассказать о фильме, героях и финале.', words: ['film', 'story', 'person', 'see'] },
  { title: 'Книга, которую я читаю', emoji: '📖', level: 3, description: 'Жанр, автор и мысли после чтения.', words: ['book', 'read', 'story', 'think'] },
  { title: 'Музыка и настроение', emoji: '🎧', level: 3, description: 'Описываем музыку и связываем её с эмоциями.', words: ['music', 'song', 'feel', 'inspiration'] },
  { title: 'Природа рядом', emoji: '🌳', level: 3, description: 'Деревья, река и прогулка на свежем воздухе.', words: ['forest', 'tree', 'river', 'fresh'] },
  { title: 'Животные и забота', emoji: '🐾', level: 3, description: 'Домашние животные, привычки и ответственность.', words: ['cat', 'dog', 'person', 'help'] },
  { title: 'Экология в городе', emoji: '♻️', level: 3, description: 'Чистота, переработка и забота о планете.', words: ['ecology', 'planet', 'clean', 'city'] },
  { title: 'Планы и решения', emoji: '🧭', level: 3, description: 'Сравниваем варианты и выбираем следующий шаг.', words: ['decision', 'goal', 'experience', 'success'] },
  { title: 'Ошибки и опыт', emoji: '🧠', level: 3, description: 'Говорим о прошлом и делаем выводы.', words: ['mistake', 'experience', 'know', 'success'] },
  { title: 'Уверенность в разговоре', emoji: '🎤', level: 3, description: 'Как говорить спокойнее и не бояться ошибок.', words: ['confidence', 'speak', 'question', 'answer'] },
  { title: 'Встреча с новым человеком', emoji: '🌍', level: 3, description: 'Поддержать разговор и найти общие интересы.', words: ['meet', 'person', 'language', 'friend'] },
  { title: 'Маленькое путешествие', emoji: '🎒', level: 3, description: 'Подготовка маршрута, дорога и неожиданные моменты.', words: ['journey', 'map', 'suitcase', 'surprise'] },
  { title: 'Планы на отпуск', emoji: '🌴', level: 3, description: 'Мечты о поездке, бюджет и выбор места.', words: ['travel', 'dream', 'money', 'beach'] },
  { title: 'Работа в команде', emoji: '🤜🤛', level: 3, description: 'Роли, сотрудничество и общий результат.', words: ['partner', 'meeting', 'project', 'success'] },
  { title: 'Переговоры о задаче', emoji: '🤝', level: 3, description: 'Предложение, уточнение условий и договорённость.', words: ['meeting', 'question', 'deal', 'answer'] },
  { title: 'Идея для бизнеса', emoji: '📈', level: 4, description: 'Проблема, решение и ценность для клиента.', words: ['business', 'dream', 'strategy', 'partner'] },
  { title: 'Научное открытие', emoji: '🔬', level: 4, description: 'Наблюдение, гипотеза и новые знания.', words: ['science', 'space', 'question', 'answer'] },
  { title: 'Технологии будущего', emoji: '🤖', level: 4, description: 'Искусственный интеллект, данные и перемены.', words: ['ai', 'computer', 'dream', 'knowledge'] },
  { title: 'Новости и источники', emoji: '📰', level: 4, description: 'Понять новость, проверить факт и выразить мнение.', words: ['news', 'read', 'think', 'decision'] },
  { title: 'Обсуждаем общество', emoji: '🏛️', level: 4, description: 'Мнения, аргументы и уважительный диалог.', words: ['person', 'culture', 'question', 'answer'] },
  { title: 'Эмоции без фильтров', emoji: '🎭', level: 4, description: 'Точно описывать чувства и их причины.', words: ['happy', 'sad', 'fear', 'love'] },
  { title: 'Цели и мотивация', emoji: '🚀', level: 4, description: 'Поставить цель, сохранить темп и увидеть прогресс.', words: ['goal', 'hope', 'confidence', 'success'] },
  { title: 'Сложный выбор', emoji: '⚖️', level: 4, description: 'Взвесить последствия и объяснить принятое решение.', words: ['decision', 'mistake', 'experience', 'tomorrow'] },
  { title: 'История из жизни', emoji: '📚', level: 4, description: 'Связный рассказ с началом, поворотом и выводом.', words: ['story', 'experience', 'surprise', 'knowledge'] },
  { title: 'Мой взгляд на мир', emoji: '🌐', level: 4, description: 'Формулируем личную позицию и приводим аргументы.', words: ['philosophy', 'wisdom', 'dream', 'planet'] },
  { title: 'Переезд и адаптация', emoji: '🛂', level: 4, description: 'Новая страна, культура и первые шаги.', words: ['relocation', 'culture', 'language', 'hope'] },
  { title: 'Баланс работы и жизни', emoji: '⚖️', level: 4, description: 'Границы, отдых и устойчивый ритм.', words: ['work', 'rest', 'time', 'health'] },
  { title: 'Разговор о будущем', emoji: '🔭', level: 4, description: 'Предположения, планы и осторожные прогнозы.', words: ['tomorrow', 'dream', 'goal', 'hope'] },
  { title: 'Финальный марафон', emoji: '🏁', level: 4, description: 'Повторяем ключевые темы и соединяем их в живую речь.', words: ['word', 'language', 'speak', 'success'] },
  { title: 'Большой разговор', emoji: '🗣️', level: 4, description: 'Комплексная практика: спросить, объяснить и поддержать диалог.', words: ['question', 'answer', 'confidence', 'friend'] },
  { title: 'Путешествие без переводчика', emoji: '🧳', level: 4, description: 'Самостоятельно пройти путь от билета до заселения.', words: ['ticket', 'airport', 'hotel', 'speak'] },
  { title: 'Рабочая презентация', emoji: '📊', level: 4, description: 'Представить идею, цифры и ожидаемый результат.', words: ['project', 'business', 'strategy', 'goal'] },
  { title: 'Финальная история', emoji: '🌟', level: 4, description: 'Собираем весь активный словарь в личный рассказ.', words: ['experience', 'story', 'dream', 'tomorrow'] },
];

export const MORE_LESSONS: Lesson[] = TOPICS.map((topic, index) => makeLesson(topic, index + 39));
