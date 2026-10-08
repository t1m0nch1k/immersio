import { LanguageCode } from '../types';

/**
 * Natural sentence packs for lessons in target languages.
 * Used for the "Original" reading mode and advanced immersion.
 */
const SLOVAK_LESSONS: Record<string, string[]> = {
  l1: [
    'Skoro ráno otváram okno a vidím slnko.',
    'Môj kocúr ešte spí na stole, ale pes už na mňa čaká pri dverách.',
    'Idem do kuchyne a pripravujem raňajky: čerstvý chlieb, syr a horúcu kávu.',
    'Moja rodina sa čoskoro zobudí.',
    'Milujem takéto tiché a teplé dni.',
    'Potom si vezmem knihu a telefón, oblečiem si bundu a vyjdem z domu.',
    'Na ulici je čerstvý vietor a cítim, že to bude dobrý deň.',
  ],
  l2: [
    'Dnes idem do mesta.',
    'Na stanici je veľa ľudí: kupujem si lístok a čakám na svoj vlak.',
    'Vedľa mňa žena číta správy a dieťa sa pozerá z okna.',
    'Vlak sa rozbieha a za sklom sa mihajú stromy a malá rieka.',
    'O hodinu vystúpim a idem pešo: popri obchodoch, cez starý most na hlavné námestie.',
    'Pri múzeu na mňa čaká priateľ.',
    'Ideme do reštaurácie, pretože som už hladný.',
    'Mesto ma víta hlukom a hudbou. Vyťahujem mapu, aby som sa nestratil.',
  ],
  l3: [
    '— Ahoj! — usmieva sa čašník.',
    'Večer ideme s priateľom do malej reštaurácie.',
    'Čašník prináša jedálny lístok a ja si uvedomujem, že som veľmi hladný.',
    'Objednávam si mäso, trochu syra a čerstvý chlieb.',
    'Môj priateľ pije čaj a ja prosím o vodu s ľadom.',
    'Potom sa rozprávame o hudbe, znie tichá pieseň a večera prebieha ako oslava.',
    'Platíme účet — a peniaze dnes nie sú dôležité, keď je vedľa nás dobrý človek.',
  ],
  l4: [
    'Dnes ideme do veľkého supermarketu.',
    'Potrebujeme kúpiť ovocie, chlieb a mlieko.',
    'Pri vchode leží šťavnaté jablko a čerstvý syr.',
    'Pozerám sa na cenu a počítam peniaze.',
    'Pokladník nás pozdraví a pomôže nám všetko uložiť.',
  ],
  l5: [
    'Môj nový sused otvára dvere.',
    'Pozdraví ma a pozve ma dnu.',
    'Pijeme horúci čaj a rozprávame sa o našom dome.',
    'Má dobrého psa a veselú mačku.',
    'Som rád, že mám takých úprimných priateľov.',
  ],
  l6: [
    'Dnes mám nezvyčajnú lekciu: učím sa nový jazyk.',
    'Najprv je to ťažké: každé slovo sa zdá cudzie, ale opakujem si ho znova a znova.',
    'Učiteľ kladie otázku a ja hľadám odpoveď.',
    'Čítame jednoduchý príbeh, počúvame pieseň a učíme sa hovoriť bez strachu.',
    'Robím chyby, ale nevzdávam sa: skúsenosť je dôležitejšia než dokonalosť.',
    'Mojím cieľom je hovoriť plynulo.',
    'Lekcia sa končí, ale zostávam ešte hodinu: páči sa mi pocit malého úspechu.',
  ],
  l7: [
    'Toto leto sa vydávam na veľkú cestu.',
    'Ráno si balím kufor, kontrolujem lístok a idem na letisko.',
    'Je tam rušno: ľudia sa ponáhľajú a niekto sa lúči s rodinou objatím.',
    'Lietadlo stúpa k oblohe a pode mnou zostávajú hory a les.',
    'O niekoľko hodín je pode mnou už more!',
    'Ubytujem sa v hoteli a idem na pláž.',
    'Večer píšem mame list: je tu nádherne a som veľmi šťastný.',
  ],
  l8: [
    'Ráno ma budí telefón: dnes máme dôležité stretnutie.',
    'Otvorím počítač a skontrolujem e-maily — opäť ich je veľa.',
    'Kolega posiela otázku k projektu a ja rýchlo napíšem odpoveď.',
    'V kancelárii je rušno: niekto telefonuje, niekto kreslí schému.',
    'Cez prestávku pijem kávu a premýšľam o novom cieli tímu.',
    'Viem: úspech prichádza k tým, ktorí sa neboja práce.',
    'Večer sa cítim unavený, ale spokojný: práca je hotová.',
  ],
  l9: [
    'Dnes ma trápi moje zdravie.',
    'Dobrý lekár ma vyšetrí a poradí mi.',
    'Idem do lekárne kúpiť potrebné lieky.',
    'Najdôležitejší je kvalitný spánok a poriadny oddych.',
    'Zajtra sa budem cítiť sviežo a šťastne.',
  ],
  l10: [
    'Prišli sme do mesta a vchádzame do krásneho hotela.',
    'Recepčný kontroluje našu rezerváciu a vydáva nám kľúč.',
    'Naša izba je veľmi svetlá: na stole horí lampa a z okna sa otvára výhľad na hory.',
    'Položíme veľký kufor a ponáhľame sa na prechádzku.',
  ],
};

const CZECH_LESSONS: Record<string, string[]> = {
  l1: [
    'Brzy ráno otevírám okno a vidím slunce.',
    'Moje kočka ještě spí na stole, ale pes už na mě čeká u dveří.',
    'Jdu do kuchyně a připravuji snídani: čerstvý chléb, sýr a horkou kávu.',
    'Moje rodina se brzy probudí.',
    'Miluji takové tiché a teplé dny.',
    'Potom si vezmu knihu a telefon, obléknu si bundu a vyjdu z domu.',
    'Na ulici fouká čerstvý vítr a cítím, že to bude dobrý den.',
  ],
  l2: [
    'Dnes jdu do města.',
    'Na nádraží je mnoho lidí: kupuji si jízdenku a čekám na svůj vlak.',
    'Vedle mě žena čte zprávy a dítě se dívá z okna.',
    'Vlak se rozjíždí a za sklem se míhají stromy a malá řeka.',
    'Za hodinu vystoupím a půjdu pěšky kolem obchodů přes starý most na hlavní náměstí.',
    'U muzea na mě čeká kamarád.',
    'Jdeme do restaurace, protože už mám hlad.',
    'Město mě vítá hlukem a hudbou. Vytahuji mapu, abych se neztratil.',
  ],
  l3: [
    '— Ahoj! — usmívá se číšník.',
    'Večer jdeme s kamarádem do malé restaurace.',
    'Číšník přináší jídelní lístek a já si uvědomuji, že mám velký hlad.',
    'Objednávám si maso, trochu sýra a čerstvý chléb.',
    'Můj kamarád pije čaj a já prosím o vodu s ledem.',
    'Potom si povídáme o hudbě, zní tichá píseň a večeře probíhá jako oslava.',
    'Platíme účet — a peníze dnes nejsou důležité, když je vedle nás dobrý člověk.',
  ],
  l4: [
    'Dnes jdeme do velkého supermarketu.',
    'Potřebujeme koupit ovoce, chléb a mléko.',
    'U vchodu leží šťavnaté jablko a čerstvý sýr.',
    'Dívám se na cenu a počítám peníze.',
    'Pokladní nás pozdraví a pomůže nám všechno uklidit.',
  ],
  l5: [
    'Můj nový soused otevírá dveře.',
    'Pozdraví mě a pozve mě dovnitř.',
    'Pijeme horký čaj a povídáme si o našem domě.',
    'Má hodného psa a veselou kočku.',
    'Jsem rád, že mám tak upřímné přátele.',
  ],
  l6: [
    'Dnes mám neobvyklou lekci: učím se nový jazyk.',
    'Nejdřív je to těžké: každé slovo se zdá cizí, ale opakuji si ho znovu a znovu.',
    'Učitel pokládá otázku a já hledám odpověď.',
    'Čteme jednoduchý příběh, posloucháme píseň a učíme se mluvit beze strachu.',
    'Dělám chyby, ale nevzdávám se: zkušenost je důležitější než dokonalost.',
    'Mým cílem je mluvit plynně.',
    'Lekce končí, ale zůstávám ještě hodinu: líbí se mi pocit malého úspěchu.',
  ],
  l7: [
    'Toto léto se vydávám na velkou cestu.',
    'Ráno si balím kufr, kontroluji jízdenku a jedu na letiště.',
    'Je tam rušno: lidé spěchají a někdo se loučí s rodinou objetím.',
    'Letadlo stoupá k obloze a pode mnou zůstávají hory a les.',
    'O několik hodin později je pode mnou už moře!',
    'Ubytuji se v hotelu a jdu na pláž.',
    'Večer píšu mamince dopis: je tu nádherně a jsem velmi šťastný.',
  ],
  l8: [
    'Ráno mě budí telefon: dnes máme důležitou schůzku.',
    'Otevřu počítač a zkontroluji e-maily — zase jich je hodně.',
    'Kolega posílá otázku k projektu a já rychle napíšu odpověď.',
    'V kanceláři je rušno: někdo telefonuje, někdo kreslí schéma.',
    'O přestávce piju kávu a přemýšlím o novém cíli týmu.',
    'Vím: úspěch přichází k těm, kteří se nebojí práce.',
    'Večer se cítím unavený, ale spokojený: práce je hotová.',
  ],
  l9: [
    'Dnes mě trápí moje zdraví.',
    'Dobrý lékař mě vyšetří a poradí mi.',
    'Jdu do lékárny koupit potřebné léky.',
    'Nejdůležitější je kvalitní spánek a pořádný odpočinek.',
    'Zítra se budu cítit svěže a šťastně.',
  ],
  l10: [
    'Přišli jsme do města a vstupujeme do krásného hotelu.',
    'Recepční kontroluje naši rezervaci a vydává nám klíč.',
    'Náš pokoj je velmi světlý: na stole hoří lampa a z okna se otevírá výhled na hory.',
    'Položíme velký kufr a spěcháme na procházku.',
  ],
};

const ENGLISH_LESSONS: Record<string, string[]> = {
  l1: [
    'Early in the morning, I open the window and see the sun.',
    'My cat is still sleeping on the table, but the dog is already waiting for me at the door.',
    'I go to the kitchen and prepare breakfast: fresh bread, cheese, and hot coffee.',
    'My family will wake up soon.',
    'I love such quiet and warm days.',
    'Then I take a book and my phone, put on my jacket, and leave the house.',
    'There is a fresh wind on the street, and I feel that it will be a good day.',
  ],
  l2: [
    'Today I am going to the city.',
    'There are many people at the station: I buy a ticket and wait for my train.',
    'Next to me, a woman is reading the news, and a child is looking out the window.',
    'The train starts moving, and trees and a small river flash past the glass.',
    'In an hour I get off and walk: past shops, across an old bridge, to the main square.',
    'A friend is waiting for me near the museum.',
    'We are going to a restaurant because I am already hungry.',
    'The city welcomes me with noise and music. I take out a map so as not to get lost.',
  ],
  l3: [
    '— Hello! — smiles the waiter.',
    'In the evening, my friend and I go to a small restaurant.',
    'The waiter brings the menu, and I realize that I am very hungry.',
    'I order meat, a little cheese, and fresh bread.',
    'My friend drinks tea, and I ask for water with ice.',
    'Then we talk about music, a quiet song plays, and dinner goes like a celebration.',
    'We pay the bill — and money is not important today when a good person is nearby.',
  ],
  l4: [
    'Today we are going to a big supermarket.',
    'We need to buy fruit, bread, and milk.',
    'At the entrance lies a juicy apple and fresh cheese.',
    'I look at the price and count my money.',
    'The cashier greets us and helps us pack everything.',
  ],
  l5: [
    'My new neighbor opens the door.',
    'He greets me and invites me inside.',
    'We drink hot tea and talk about our house.',
    'He has a good dog and a cheerful cat.',
    'I am glad to have such sincere friends.',
  ],
  l6: [
    'Today I have an unusual lesson: I am learning a new language.',
    'At first it is difficult: every word seems foreign, but I repeat it again and again.',
    'The teacher asks a question, and I look for an answer.',
    'We read a simple story, listen to a song, and learn to speak without fear.',
    'I make mistakes, but I do not give up: experience is more important than perfection.',
    'My goal is to speak fluently.',
    'The lesson ends, but I stay for another hour: I love the feeling of a small success.',
  ],
  l7: [
    'This summer I am embarking on a big journey.',
    'In the morning I pack my suitcase, check my ticket, and go to the airport.',
    'It is busy there: people are rushing, and someone is saying goodbye to family with a hug.',
    'The plane rises into the sky, and mountains and forest remain beneath me.',
    'A few hours later, the sea is already below me!',
    'I check into the hotel and head to the beach.',
    'In the evening I write a letter to my mother: it is wonderful here and I am very happy.',
  ],
  l8: [
    'In the morning the phone wakes me up: today we have an important meeting.',
    'I open my computer and check emails — there are many again.',
    'A colleague sends a question about the project, and I quickly write an answer.',
    'The office is busy: someone is calling, someone is drawing a diagram.',
    'During the break I drink coffee and think about the team\'s new goal.',
    'I know: success comes to those who are not afraid of work.',
    'In the evening I feel tired but satisfied: the work is done.',
  ],
  l9: [
    'Today my health worries me.',
    'A good doctor examines me and gives advice.',
    'I go to the pharmacy to buy necessary medicine.',
    'Quality sleep and proper rest are the most important.',
    'Tomorrow I will feel fresh and happy.',
  ],
  l10: [
    'We arrived in the city and enter a beautiful hotel.',
    'The receptionist checks our reservation and gives us the key.',
    'Our room is very bright: a lamp is lit on the table, and a mountain view opens from the window.',
    'We put down our big suitcase and hurry for a walk.',
  ],
};

const HEBREW_LESSONS: Record<string, string[]> = {
  l1: [
    'מוקדם בבוקר אני פותח את החלון ורואה את השמש.',
    'החתול שלי עדיין ישן על השולחן, אבל הכלב כבר מחכה לי ליד הדלת.',
    'אני הולך למטבח ומכין ארוחת בוקר: לחם טרי, גבינה וקפה חם.',
    'בקרוב המשפחה שלי תתעורר.',
    'אני אוהב ימים שקטים וחמימים כאלה.',
    'אחר כך אני לוקח ספר וטלפון, לובש מעיל ויוצא מהבית.',
    'ברחוב יש רוח רעננה ואני מרגיש שזה יהיה יום טוב.',
  ],
};

const KAZAKH_LESSONS: Record<string, string[]> = {
  l1: [
    'Таңертең ерте терезені ашып, күнді көремін.',
    'Мысығым әлі үстелде ұйықтап жатыр, бірақ ит мені есік алдында күтуде.',
    'Мен ас үйге барып, таңғы ас дайындаймын: жаңа піскен нан, ірімшік және ыстық кофе.',
    'Жақында отбасым оянады.',
    'Мен осындай тыныш әрі жылы күндерді жақсы көремін.',
    'Содан кейін мен кітап пен телефонды алып, күртеше киіп, үйден шығамын.',
    'Далада таза жел соғып тұр, және мен сеземін: бұл жақсы күн болады.',
  ],
};

const BASHKIR_LESSONS: Record<string, string[]> = {
  l1: [
    'Иртән иртә мен тәҙрәне асам һәм ҡояшты күрәм.',
    'Бесәйем әле өҫтәлдә йоҡлай, әммә эт мине ишек янында көтә.',
    'Мин аш-һыу бүлмәһенә барам һәм иртәнге аш әҙерләйем: яңы икмәк, сыр һәм ҡайнар кофе.',
    'Тиҙҙән ғаиләм уяныр.',
    'Мин бындай тыныс һәм йылы көндәрҙе яратам.',
    'Аҙаҡ китап менән телефонды алам, куртка кейәм һәм өйҙән сығам.',
    'Урамда саф ел, һәм мин һиҙәм: был яҡшы көн буласаҡ.',
  ],
};

export const getImmersiveLessonText = (lessonId: string, lang: LanguageCode): string[] | null => {
  if (lang === 'sk') {
    return SLOVAK_LESSONS[lessonId] || null;
  }
  if (lang === 'en') {
    return ENGLISH_LESSONS[lessonId] || null;
  }
  if (lang === 'cs') {
    return CZECH_LESSONS[lessonId] || null;
  }
  if (lang === 'he') {
    return HEBREW_LESSONS[lessonId] || null;
  }
  if (lang === 'kk') {
    return KAZAKH_LESSONS[lessonId] || null;
  }
  if (lang === 'ba') {
    return BASHKIR_LESSONS[lessonId] || null;
  }
  return null;
};
