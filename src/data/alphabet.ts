import { AlphabetGuide, LanguageCode } from '../types';

const letters = (value: string) => value.split(' ');

export const ALPHABETS: Record<LanguageCode, AlphabetGuide> = {
  en: {
    title: 'English alphabet',
    note: '26 букв. В английском одна и та же буква может иметь разные звуки в разных словах.',
    groups: [
      { title: 'Основной алфавит', letters: letters('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z') }
    ]
  },
  es: {
    title: 'Alfabeto español',
    note: 'В испанском 27 букв: Ñ считается отдельной буквой. Ударение обычно отмечается знаком ´.',
    groups: [
      { title: 'Основной алфавит', letters: letters('A B C D E F G H I J K L M N Ñ O P Q R S T U V W X Y Z') },
      { title: 'Частые знаки', description: 'Á, É, Í, Ó, Ú обозначают ударную гласную.', letters: letters('Á É Í Ó Ú Ü ¿ ¡') }
    ]
  },
  de: {
    title: 'Deutsches Alphabet',
    note: 'К 26 базовым буквам добавляются Ä, Ö, Ü и ß. Буква ß называется Eszett.',
    groups: [
      { title: 'Основной алфавит', letters: letters('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z') },
      { title: 'Особые знаки', description: 'Умлауты меняют звучание гласной; ß обычно передаёт долгий звук s.', letters: letters('Ä Ö Ü ß') }
    ]
  },
  fr: {
    title: "Alphabet français",
    note: 'Во французском 26 букв. Диакритика помогает читать и различать слова, но не создаёт новые буквы.',
    groups: [
      { title: 'Основной алфавит', letters: letters('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z') },
      { title: 'Диакритика', description: 'Наиболее частые варианты букв с акцентами.', letters: letters('À Â Ç É È Ê Ë Î Ï Ô Ù Û Ü Œ') }
    ]
  },
  it: {
    title: 'Alfabeto italiano',
    note: 'В традиционном итальянском алфавите 21 буква. J, K, W, X и Y встречаются в заимствованиях.',
    groups: [
      { title: 'Основной алфавит', letters: letters('A B C D E F G H I L M N O P Q R S T U V Z') },
      { title: 'Буквы заимствований', description: 'Используются в иностранных словах и именах.', letters: letters('J K W X Y') }
    ]
  },
  ja: {
    title: '日本語の文字',
    note: 'В японском используются слоговые азбуки хирагана и катакана. Каждый знак обычно обозначает слог, а не отдельный звук.',
    groups: [
      {
        title: 'ひらがな · Хирагана',
        description: 'Основная азбука для японских слов и грамматических окончаний.',
        letters: letters('あ い う え お か き く け こ さ し す せ そ た ち つ て と な に ぬ ね の は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ を ん')
      },
      {
        title: 'カタカナ · Катакана',
        description: 'Чаще используется для иностранных слов, названий и звукоподражаний.',
        letters: letters('ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ ヲ ン')
      }
    ]
  },
  sk: {
    title: 'Slovenská abeceda',
    note: 'В словацком 46 букв, включая диграфы Dz, Dž и Ch. Долгие гласные отмечаются ´, мягкость — ˇ.',
    groups: [
      {
        title: 'Словацкий алфавит',
        description: 'Порядок букв важен для словарей и сортировки.',
        letters: letters('A Á Ä B C Č D Ď Dz Dž E É F G H Ch I Í J K L Ĺ Ľ M N Ň O Ó Ô P Q R Ŕ S Š T Ť U Ú V W X Y Ý Z Ž')
      }
    ]
  },
  cs: {
    title: 'Česká abeceda',
    note: 'В чешском 42 буквы, включая Á, Č, Ď, É, Ě, Í, Ň, Ó, Ř, Š, Ť, Ú, Ů, Ý, Ž. Ch считается отдельной буквой в алфавитном порядке.',
    groups: [
      {
        title: 'Чешский алфавит',
        description: 'Диакритика меняет букву и произношение; Ě, Ř и Ů особенно характерны для чешского.',
        letters: letters('A Á B C Č D Ď E É Ě F G H Ch I Í J K L M N Ň O Ó P Q R Ř S Š T Ť U Ú Ů V W X Y Ý Z Ž')
      }
    ]
  }
};
