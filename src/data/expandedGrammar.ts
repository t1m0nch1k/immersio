import { GrammarLesson, LanguageCode } from '../types';

const lesson = (
  id: string,
  title: string,
  level: 1 | 2 | 3 | 4,
  explanation: string,
  examples: GrammarLesson['examples']
): GrammarLesson => ({ id, title, level, explanation, examples });

export const EXPANDED_GRAMMAR: Record<LanguageCode, GrammarLesson[]> = {
  en: [
    lesson('en-present-continuous', 'Действие прямо сейчас', 1, 'Present Continuous строится с am/is/are и формой глагола на -ing.', [
      { target: 'I am learning English.', ru: 'Я учу английский сейчас.' },
      { target: 'They are waiting outside.', ru: 'Они ждут снаружи.' }
    ]),
    lesson('en-countable', 'Множественное число', 1, 'Большинство существительных получает -s, но некоторые формы нужно запомнить: child — children, man — men.', [
      { target: 'one book — two books', ru: 'одна книга — две книги' },
      { target: 'one child — two children', ru: 'один ребёнок — двое детей' }
    ]),
    lesson('en-comparatives', 'Сравнение', 2, 'Короткие прилагательные получают -er, а длинные используют more.', [
      { target: 'This road is longer.', ru: 'Эта дорога длиннее.' },
      { target: 'This lesson is more useful.', ru: 'Этот урок полезнее.' }
    ]),
    lesson('en-modal', 'Модальные can и should', 2, 'После can и should глагол не изменяется: can go, should read.', [
      { target: 'You can speak slowly.', ru: 'Ты можешь говорить медленно.' },
      { target: 'You should practice every day.', ru: 'Тебе стоит практиковаться каждый день.' }
    ])
  ],
  es: [
    lesson('es-gender-adjectives', 'Согласование прилагательных', 1, 'Прилагательное меняет окончание по роду и числу существительного: bueno, buena, buenos, buenas.', [
      { target: 'un día bueno', ru: 'хороший день' },
      { target: 'una idea buena', ru: 'хорошая идея' }
    ]),
    lesson('es-questions', 'Вопросительные слова', 1, 'Qué, quién, dónde, cuándo и cómo помогают строить точные вопросы.', [
      { target: '¿Dónde está la estación?', ru: 'Где находится вокзал?' },
      { target: '¿Cuándo empieza la clase?', ru: 'Когда начинается занятие?' }
    ]),
    lesson('es-future', 'Ближайшее будущее', 2, 'Конструкция ir a + infinitivo описывает запланированное действие.', [
      { target: 'Voy a estudiar mañana.', ru: 'Я буду учиться завтра.' },
      { target: 'Vamos a viajar en verano.', ru: 'Мы будем путешествовать летом.' }
    ]),
    lesson('es-object', 'Прямое дополнение', 2, 'Местоимения lo, la, los, las заменяют уже известный объект.', [
      { target: 'Leo el libro. Lo leo.', ru: 'Я читаю книгу. Я её читаю.' },
      { target: 'Compro la fruta. La compro.', ru: 'Я покупаю фрукты. Я их покупаю.' }
    ])
  ],
  de: [
    lesson('de-plural', 'Множественное число', 1, 'У немецких существительных несколько моделей множественного числа: -e, -er, -en, -s и нулевая.', [
      { target: 'der Tag — die Tage', ru: 'день — дни' },
      { target: 'das Kind — die Kinder', ru: 'ребёнок — дети' }
    ]),
    lesson('de-separable', 'Отделяемые приставки', 2, 'В главном предложении приставка отделяется и уходит в конец: aufstehen — Ich stehe auf.', [
      { target: 'Ich stehe um sieben Uhr auf.', ru: 'Я встаю в семь часов.' },
      { target: 'Wir kaufen heute ein.', ru: 'Мы сегодня делаем покупки.' }
    ]),
    lesson('de-modal', 'Модальные глаголы', 2, 'После können, müssen и wollen смысловой глагол стоит в конце в инфинитиве.', [
      { target: 'Ich kann Deutsch sprechen.', ru: 'Я могу говорить по-немецки.' },
      { target: 'Wir müssen heute arbeiten.', ru: 'Мы должны сегодня работать.' }
    ]),
    lesson('de-subordinate', 'Придаточное с weil', 3, 'После weil спрягаемый глагол обычно уходит в конец придаточного предложения.', [
      { target: 'Ich lerne, weil ich reisen möchte.', ru: 'Я учусь, потому что хочу путешествовать.' },
      { target: 'Sie bleibt zu Hause, weil es regnet.', ru: 'Она остаётся дома, потому что идёт дождь.' }
    ])
  ],
  fr: [
    lesson('fr-present', 'Настоящее время', 1, 'В Présent окончания глаголов зависят от группы. Для parler: je parle, tu parles, nous parlons.', [
      { target: 'Je parle français.', ru: 'Я говорю по-французски.' },
      { target: 'Nous habitons en ville.', ru: 'Мы живём в городе.' }
    ]),
    lesson('fr-questions', 'Вопросы', 1, 'В разговорной речи вопрос часто строится интонацией, а est-ce que делает его нейтральным и ясным.', [
      { target: 'Tu viens demain ?', ru: 'Ты придёшь завтра?' },
      { target: "Est-ce que vous avez le temps ?", ru: 'У вас есть время?' }
    ]),
    lesson('fr-futur', 'Ближайшее будущее', 2, 'Конструкция aller + infinitif обозначает намерение или ближайший план.', [
      { target: 'Je vais lire ce soir.', ru: 'Я буду читать сегодня вечером.' },
      { target: 'Ils vont arriver bientôt.', ru: 'Они скоро приедут.' }
    ]),
    lesson('fr-adjectives', 'Позиция прилагательного', 2, 'Большинство прилагательных стоит после существительного, но частые короткие прилагательные могут быть перед ним.', [
      { target: 'une maison blanche', ru: 'белый дом' },
      { target: 'un petit livre', ru: 'маленькая книга' }
    ])
  ],
  it: [
    lesson('it-plural', 'Множественное число', 1, 'Существительные на -o часто меняют окончание на -i, а слова на -a — на -e.', [
      { target: 'il libro — i libri', ru: 'книга — книги' },
      { target: 'la casa — le case', ru: 'дом — дома' }
    ]),
    lesson('it-questions', 'Вопросы', 1, 'В итальянском вопрос часто образуется интонацией; порядок слов может оставаться обычным.', [
      { target: 'Parli italiano?', ru: 'Ты говоришь по-итальянски?' },
      { target: 'Dove abiti?', ru: 'Где ты живёшь?' }
    ]),
    lesson('it-future', 'Ближайший план', 2, 'Для намерения часто используют stare per + infinitive или настоящее время с указанием времени.', [
      { target: 'Sto per uscire.', ru: 'Я сейчас выйду.' },
      { target: 'Domani parto presto.', ru: 'Завтра я уезжаю рано.' }
    ]),
    lesson('it-past', 'Passato prossimo', 2, 'Завершённое действие строится с avere или essere и причастием прошедшего времени.', [
      { target: 'Ho letto il libro.', ru: 'Я прочитал книгу.' },
      { target: 'Siamo arrivati ieri.', ru: 'Мы приехали вчера.' }
    ])
  ],
  ja: [
    lesson('ja-desu', 'Вежливая связка です', 1, 'です делает именную или прилагательную фразу вежливой и часто завершает предложение.', [
      { target: 'これは本です。', ru: 'Это книга.' },
      { target: '今日は静かです。', ru: 'Сегодня тихо.' }
    ]),
    lesson('ja-adjectives', 'Прилагательные い', 1, 'Прилагательные на い могут быть сказуемым без отдельного глагола.', [
      { target: 'この本は面白いです。', ru: 'Эта книга интересная.' },
      { target: '水は冷たいです。', ru: 'Вода холодная.' }
    ]),
    lesson('ja-location', 'あります и います', 1, 'あります используется для неодушевлённых предметов, います — для людей и животных.', [
      { target: '机の上に本があります。', ru: 'На столе есть книга.' },
      { target: '公園に猫がいます。', ru: 'В парке есть кошка.' }
    ]),
    lesson('ja-te-form', 'Форма て', 2, 'Форма て соединяет действия и используется в просьбах с ください.', [
      { target: '本を読んで、寝ます。', ru: 'Я читаю книгу и ложусь спать.' },
      { target: 'ゆっくり話してください。', ru: 'Пожалуйста, говорите медленно.' }
    ])
  ],
  cs: [
    lesson('cs-gender-adjectives', 'Род и согласование', 1, 'Чешское прилагательное согласуется с существительным: dobrý den, dobrá káva, dobré ráno.', [
      { target: 'dobrý den', ru: 'добрый день' },
      { target: 'dobrá káva', ru: 'хороший кофе' }
    ]),
    lesson('cs-questions', 'Вопросительные слова', 1, 'Kdo, co, kde, kdy и jak помогают уточнить участника, предмет, место, время и способ действия.', [
      { target: 'Kde bydlíš?', ru: 'Где ты живёшь?' },
      { target: 'Kdy přijdeš?', ru: 'Когда ты придёшь?' }
    ]),
    lesson('cs-future', 'Будущее время', 2, 'Будущее несовершенного глагола строится с формой být и инфинитивом: budu pracovat.', [
      { target: 'Zítra budu pracovat.', ru: 'Завтра я буду работать.' },
      { target: 'Večer budeme číst.', ru: 'Вечером мы будем читать.' }
    ]),
    lesson('cs-past', 'Прошедшее время', 2, 'В прошедшем времени причастие согласуется с родом и числом: četl, četla, četli.', [
      { target: 'Včera jsem četl knihu.', ru: 'Вчера я читал книгу.' },
      { target: 'Byli jsme doma.', ru: 'Мы были дома.' }
    ])
  ],
  sk: [
    lesson('sk-articles', 'Определённость без артиклей', 1, 'В словацком нет артиклей как в английском или немецком. Определённость часто понятна из контекста или порядка слов.', [
      { target: 'To je kniha.', ru: 'Это книга.' },
      { target: 'Kniha je na stole.', ru: 'Книга на столе.' }
    ]),
    lesson('sk-negation', 'Отрицание ne- и nie', 1, 'У обычных глаголов отрицание пишется слитно с приставкой ne-: pracujem → nepracujem. В настоящем времени byť используется отдельное nie: nie som, nie si, nie je.', [
      { target: 'Nerozumiem.', ru: 'Я не понимаю.' },
      { target: 'Dnes nepracujem.', ru: 'Сегодня я не работаю.' }
    ]),
    lesson('sk-questions', 'Вопросы', 1, 'Вопрос часто строится интонацией. Вопросительное слово обычно стоит в начале или перед нужной частью фразы.', [
      { target: 'Kde bývaš?', ru: 'Где ты живёшь?' },
      { target: 'Kedy prídeš?', ru: 'Когда ты придёшь?' }
    ]),
    lesson('sk-future', 'Будущее время', 2, 'Будущее несовершенного глагола строится с byť и инфинитивом: budem pracovať.', [
      { target: 'Zajtra budem pracovať.', ru: 'Завтра я буду работать.' },
      { target: 'Večer budeme čítať.', ru: 'Вечером мы будем читать.' }
    ])
  ],
  he: [
    lesson('he-gender', 'Род в иврите', 1, 'В иврите все существительные имеют мужской или женский род. Глаголы в настоящем времени также изменяются по родам: קורא (читает он), קוראת (читает она).', [
      { target: 'הוא קורא.', ru: 'Он читает.' },
      { target: 'היא קוראת.', ru: 'Она читает.' }
    ]),
    lesson('he-plural', 'Множественное число (-им / -от)', 1, 'Мужской род во множественном числе обычно получает окончание ים- (-им), а женский — ות- (-от).', [
      { target: 'ספר — ספרים', ru: 'книга — книги' },
      { target: 'מילה — מילים', ru: 'слово — слова' }
    ])
  ],
  kk: [
    lesson('kk-plural', 'Множественное число (-лар/-лер)', 1, 'Множественное число образуется аффиксами -лар/-лер, -дар/-дер, -тар/-тер в зависимости от последнего звука основы.', [
      { target: 'кітап — кітаптар', ru: 'книга — книги' },
      { target: 'бала — балалар', ru: 'ребёнок — дети' }
    ]),
    lesson('kk-question', 'Вопросительные частицы', 1, 'Общие вопросы образуются с помощью частиц -ма/-ме, -ба/-бе, -па/-пе: Бұл кітап па? (Это книга?).', [
      { target: 'Бұл кітап па?', ru: 'Это книга?' },
      { target: 'Сен келесің бе?', ru: 'Ты придёшь?' }
    ])
  ],
  ba: [
    lesson('ba-plural', 'Множественное число', 1, 'Множественное число образуется аффиксами -лар/-ләр, -дар/-дәр, -тар/-тәр, -ҙар/-ҙәр по закону сингармонизма.', [
      { target: 'китап — китаптар', ru: 'книга — книги' },
      { target: 'бала — балалар', ru: 'ребёнок — дети' }
    ]),
    lesson('ba-question', 'Вопросительные частицы', 1, 'Вопрос образуется частицами -мы/-ме, -мы/-ме: Был китапмы? (Это книга?).', [
      { target: 'Был китапмы?', ru: 'Это книга?' },
      { target: 'Һин киләһеңме?', ru: 'Ты придёшь?' }
    ])
  ]
};
