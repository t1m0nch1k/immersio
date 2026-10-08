import { GrammarLesson, LanguageCode } from '../types';
import { EXPANDED_GRAMMAR } from './expandedGrammar';
import { MORE_GRAMMAR } from './moreGrammar';
import { SENTENCE_GRAMMAR } from './sentenceGrammar';

const lesson = (
  id: string,
  title: string,
  level: 1 | 2 | 3 | 4,
  explanation: string,
  examples: GrammarLesson['examples']
): GrammarLesson => ({ id, title, level, explanation, examples });

const BASE_GRAMMAR: Record<LanguageCode, GrammarLesson[]> = {
  en: [
    lesson('en-word-order', 'Порядок слов', 1, 'Базовая английская фраза строится как Subject + Verb + Object: кто-то делает что-то.', [
      { target: 'I read a book.', ru: 'Я читаю книгу.' },
      { target: 'My friend drinks tea.', ru: 'Мой друг пьёт чай.' }
    ]),
    lesson('en-be', 'Глагол to be', 1, 'В настоящем времени to be меняется: am с I, is с he/she/it, are с you/we/they.', [
      { target: 'I am ready.', ru: 'Я готов.' },
      { target: 'They are at home.', ru: 'Они дома.' }
    ]),
    lesson('en-questions', 'Вопросы с do', 2, 'Для вопросов и отрицаний в Present Simple используется do/does. После does глагол остаётся в начальной форме.', [
      { target: 'Do you speak English?', ru: 'Ты говоришь по-английски?' },
      { target: "She doesn't drive.", ru: 'Она не водит машину.' }
    ]),
    lesson('en-past', 'Простое прошедшее время', 2, 'У правильных глаголов добавляется -ed, а неправильные формы нужно запоминать отдельно.', [
      { target: 'I worked yesterday.', ru: 'Я работал вчера.' },
      { target: 'We went to the city.', ru: 'Мы поехали в город.' }
    ])
  ],
  es: [
    lesson('es-articles', 'Род и артикли', 1, 'Существительные бывают мужского и женского рода. Артикль согласуется с существительным: el/la, un/una.', [
      { target: 'el libro', ru: 'книга (м. р.)' },
      { target: 'una casa', ru: 'один дом / дом (ж. р.)' }
    ]),
    lesson('es-ser-estar', 'Ser и estar', 1, 'Ser используется для идентичности, профессии и характеристики, estar — для состояния и местонахождения людей и предметов. Деление на «постоянное/временное» работает не всегда: выбор зависит от смысла.', [
      { target: 'Soy estudiante.', ru: 'Я студент.' },
      { target: 'Estoy en casa.', ru: 'Я дома.' }
    ]),
    lesson('es-present', 'Настоящее время', 1, 'Окончание глагола меняется вместе с лицом. Для hablar: hablo, hablas, habla.', [
      { target: 'Hablo español.', ru: 'Я говорю по-испански.' },
      { target: '¿Trabajas hoy?', ru: 'Ты работаешь сегодня?' }
    ]),
    lesson('es-past', 'Прошедшее время', 2, 'Для завершённых действий часто используется Pretérito indefinido: comí, hablaste, vivieron.', [
      { target: 'Ayer comí en casa.', ru: 'Вчера я ел дома.' },
      { target: 'Viajamos en verano.', ru: 'Мы путешествовали летом.' }
    ])
  ],
  de: [
    lesson('de-cases', 'Nominativ и Akkusativ', 1, 'Nominativ обозначает исполнителя действия, Akkusativ — прямой объект. Артикль der меняется на den.', [
      { target: 'Der Mann sieht den Hund.', ru: 'Мужчина видит собаку.' },
      { target: 'Die Frau liest ein Buch.', ru: 'Женщина читает книгу.' }
    ]),
    lesson('de-word-order', 'Глагол на втором месте', 1, 'В обычном утверждении спрягаемый глагол стоит на втором месте, даже если первым идёт обстоятельство.', [
      { target: 'Heute lerne ich Deutsch.', ru: 'Сегодня я учу немецкий.' },
      { target: 'Am Morgen trinke ich Kaffee.', ru: 'Утром я пью кофе.' }
    ]),
    lesson('de-sein-haben', 'Sein и haben', 1, 'Sein означает «быть», haben — «иметь». Это два главных вспомогательных глагола.', [
      { target: 'Ich bin müde.', ru: 'Я устал.' },
      { target: 'Wir haben Zeit.', ru: 'У нас есть время.' }
    ]),
    lesson('de-perfect', 'Прошедшее Perfekt', 2, 'Разговорное прошедшее строится с haben или sein и Partizip II в конце предложения.', [
      { target: 'Ich habe gestern gearbeitet.', ru: 'Я вчера работал.' },
      { target: 'Sie ist nach Hause gegangen.', ru: 'Она пошла домой.' }
    ])
  ],
  fr: [
    lesson('fr-articles', 'Род и артикли', 1, 'Перед существительным обычно стоит артикль. Мужской род: un/le, женский: une/la.', [
      { target: 'un ami', ru: 'друг' },
      { target: 'une amie', ru: 'подруга' }
    ]),
    lesson('fr-etre-avoir', 'Être и avoir', 1, 'Être используется для состояния и описания, avoir — для обладания и многих устойчивых конструкций.', [
      { target: 'Je suis prêt.', ru: 'Я готов.' },
      { target: "J'ai un livre.", ru: 'У меня есть книга.' }
    ]),
    lesson('fr-negation', 'Отрицание ne...pas', 1, 'В нейтральной речи отрицание окружает спрягаемый глагол: ne + глагол + pas.', [
      { target: 'Je ne parle pas vite.', ru: 'Я не говорю быстро.' },
      { target: "Nous n'avons pas le temps.", ru: 'У нас нет времени.' }
    ]),
    lesson('fr-passe-compose', 'Passé composé', 2, 'Завершённое действие в прошлом обычно строится с avoir/être и причастием прошедшего времени.', [
      { target: "J'ai fini le travail.", ru: 'Я закончил работу.' },
      { target: 'Elle est arrivée hier.', ru: 'Она приехала вчера.' }
    ])
  ],
  it: [
    lesson('it-articles', 'Род и артикли', 1, 'Мужской род часто получает il/un, женский — la/una. Артикль зависит также от начального звука слова.', [
      { target: 'il libro', ru: 'книга (м. р.)' },
      { target: 'la casa', ru: 'дом (ж. р.)' }
    ]),
    lesson('it-essere-avere', 'Essere и avere', 1, 'Essere — «быть», avere — «иметь». Они также используются как вспомогательные глаголы.', [
      { target: 'Sono a casa.', ru: 'Я дома.' },
      { target: 'Ho tempo.', ru: 'У меня есть время.' }
    ]),
    lesson('it-present', 'Настоящее время', 1, 'Глаголы на -are, -ere и -ire получают разные окончания. Лицо часто понятно по окончанию без местоимения.', [
      { target: 'Parlo italiano.', ru: 'Я говорю по-итальянски.' },
      { target: 'Noi leggiamo insieme.', ru: 'Мы читаем вместе.' }
    ]),
    lesson('it-negation', 'Отрицание', 1, 'Частица non ставится перед спрягаемым глаголом.', [
      { target: 'Non capisco.', ru: 'Я не понимаю.' },
      { target: 'Non abbiamo tempo.', ru: 'У нас нет времени.' }
    ])
  ],
  ja: [
    lesson('ja-sov', 'Порядок SOV', 1, 'В японском сказуемое обычно стоит в конце. Частицы показывают роль слов в предложении.', [
      { target: '私は学生です。', ru: 'Я студент.' },
      { target: '私は本を読みます。', ru: 'Я читаю книгу.' }
    ]),
    lesson('ja-particles', 'Частицы は и を', 1, 'は обозначает тему высказывания, を — прямой объект действия.', [
      { target: '猫はかわいいです。', ru: 'Кошка милая.' },
      { target: '水を飲みます。', ru: 'Я пью воду.' }
    ]),
    lesson('ja-ni', 'Частица に', 1, 'に обозначает направление, время или место существования.', [
      { target: '学校に行きます。', ru: 'Я иду в школу.' },
      { target: '七時に起きます。', ru: 'Я встаю в семь часов.' }
    ]),
    lesson('ja-past', 'Прошедшее время', 2, 'Вежливая форма глагола меняет ます на ました для прошедшего утверждения.', [
      { target: '昨日、映画を見ました。', ru: 'Вчера я смотрел фильм.' },
      { target: '朝ご飯を食べました。', ru: 'Я позавтракал.' }
    ])
  ],
  cs: [
    lesson('cs-word-order', 'Порядок слов', 1, 'В нейтральном чешском предложении обычно идут подлежащее, сказуемое и дополнение. Порядок можно менять ради акцента.', [
      { target: 'Já čtu knihu.', ru: 'Я читаю книгу.' },
      { target: 'Moje kamarádka pije čaj.', ru: 'Моя подруга пьёт чай.' }
    ]),
    lesson('cs-cases', 'Падежи и окончания', 1, 'В чешском семь падежей. Форма существительного меняется в зависимости от его роли: kniha → knihu.', [
      { target: 'To je kniha.', ru: 'Это книга.' },
      { target: 'Vidím knihu.', ru: 'Я вижу книгу.' }
    ]),
    lesson('cs-present', 'Настоящее время', 1, 'Окончание глагола показывает лицо: pracuji, pracuješ, pracuje.', [
      { target: 'Já pracuji.', ru: 'Я работаю.' },
      { target: 'Ty pracuješ.', ru: 'Ты работаешь.' }
    ]),
    lesson('cs-negation', 'Отрицание ne-', 1, 'Отрицательная частица ne- обычно пишется слитно с глаголом: pracuji → nepracuji. У být: nejsem, nejsi, není.', [
      { target: 'Dnes nepracuji.', ru: 'Сегодня я не работаю.' },
      { target: 'Nejsem doma.', ru: 'Я не дома.' }
    ])
  ],
  sk: [
    lesson('sk-cases', 'Падежи и окончания', 1, 'В словацком окончания существительных меняются по падежу. В роли объекта часто появляется винительный падеж.', [
      { target: 'To je kniha.', ru: 'Это книга.' },
      { target: 'Vidím knihu.', ru: 'Я вижу книгу.' }
    ]),
    lesson('sk-present', 'Настоящее время', 1, 'Окончание глагола показывает лицо: pracujem, pracuješ, pracuje.', [
      { target: 'Ja pracujem.', ru: 'Я работаю.' },
      { target: 'Ty pracuješ.', ru: 'Ты работаешь.' }
    ]),
    lesson('sk-gender', 'Род и согласование', 1, 'Прилагательное согласуется с существительным в роде и числе. У мужского, женского и среднего рода свои окончания.', [
      { target: 'dobrý deň', ru: 'добрый день (м. р.)' },
      { target: 'dobrá káva', ru: 'хороший кофе (ж. р.)' }
    ]),
    lesson('sk-past', 'Прошедшее время', 2, 'В первом и втором лице прошедшее строится с som/si/sme/ste и причастием; в третьем лице вспомогательный глагол опускается. Причастие согласуется по роду и числу: čítal, čítala, čítali.', [
      { target: 'Včera som čítal knihu.', ru: 'Вчера я читал книгу.' },
      { target: 'Boli sme doma.', ru: 'Мы были дома.' }
    ])
  ],
  he: [
    lesson('he-present', 'Настоящее время глагола', 1, 'Глаголы в настоящем времени имеют всего 4 формы: мужской и женский род в единственном и множественном числе.', [
      { target: 'אני עובד.', ru: 'Я работаю (мужчина).' },
      { target: 'אני עובדת.', ru: 'Я работаю (женщина).' }
    ]),
    lesson('he-preposition-et', 'Предлог прямого дополнения את', 1, 'Если прямое дополнение определено (с артиклем ה- или собственное имя), перед ним обязательно ставится предлог את.', [
      { target: 'אני רואה את הספר.', ru: 'Я вижу (эту) книгу.' },
      { target: 'הוא אוהב את המוזיקה.', ru: 'Он любит музыку.' }
    ])
  ],
  kk: [
    lesson('kk-present', 'Настоящее время глаголов', 1, 'Окончания настоящего времени согласуются с лицом: мен жұмыс істеймін (я работаю), сен жұмыс істейсің (ты работаешь).', [
      { target: 'Мен жұмыс істеймін.', ru: 'Я работаю.' },
      { target: 'Сен жұмыс істейсің.', ru: 'Ты работаешь.' }
    ]),
    lesson('kk-possession', 'Категория притяжательности', 1, 'Принадлежность выражается специальными аффиксами: менің кітабым (моя книга), менің досым (мой друг).', [
      { target: 'менің кітабым', ru: 'моя книга' },
      { target: 'менің досым', ru: 'мой друг' }
    ])
  ],
  ba: [
    lesson('ba-present', 'Настоящее время глагола', 1, 'Личные окончания настоящего времени: мин эшләйем (я работаю), һин эшләйһең (ты работаешь).', [
      { target: 'Мин эшләйем.', ru: 'Я работаю.' },
      { target: 'Һин эшләйһең.', ru: 'Ты работаешь.' }
    ]),
    lesson('ba-possession', 'Категория притяжательности', 1, 'Принадлежность выражается притяжательными аффиксами: минең китабым (моя книга), минең дуҫым (мой друг).', [
      { target: 'минең китабым', ru: 'моя книга' },
      { target: 'минең дуҫым', ru: 'мой друг' }
    ])
  ]
};

export const GRAMMAR: Record<LanguageCode, GrammarLesson[]> = (Object.keys(BASE_GRAMMAR) as LanguageCode[]).reduce(
  (result, code) => {
    // Merge repeated topic ids (e.g. Japanese particles/past) before tracking progress.
    const topics = new Map<string, GrammarLesson>();
    [...SENTENCE_GRAMMAR[code], ...BASE_GRAMMAR[code], ...EXPANDED_GRAMMAR[code], ...MORE_GRAMMAR[code]].forEach((item) => {
      const existing = topics.get(item.id);
      topics.set(item.id, existing ? {
        ...existing,
        examples: [...existing.examples, ...item.examples.filter((example) => !existing.examples.some((old) => old.target === example.target))],
      } : item);
    });
    result[code] = [...topics.values()].sort((a, b) => a.level - b.level);
    return result;
  },
  {} as Record<LanguageCode, GrammarLesson[]>
);
