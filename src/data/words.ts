import { Word } from '../types';
import { SLOVAK_TRANSLATIONS } from './slovak';
import { CZECH_TRANSLATIONS } from './czech';
import { EXPANDED_WORDS } from './expandedWords';
import { LESSON_LINKED_GENERATED_IDS } from './lessonLinkedWords';

export const BASE_WORDS: Word[] = [
  // Основа & Люди
  { id: 'hello', ru: 'привет', en: 'hello', es: 'hola', de: 'hallo', fr: 'bonjour', it: 'ciao', ja: 'こんにちは', lvl: 1, cat: 'основа', exampleRu: 'Привет, как дела?' },
  { id: 'friend', ru: 'друг', en: 'friend', es: 'amigo', de: 'Freund', fr: 'ami', it: 'amico', ja: '友達', lvl: 1, cat: 'люди', exampleRu: 'Мой лучший друг.' },
  { id: 'family', ru: 'семья', en: 'family', es: 'familia', de: 'Familie', fr: 'famille', it: 'famiglia', ja: '家族', lvl: 1, cat: 'люди' },
  { id: 'mother', ru: 'мама', en: 'mother', es: 'madre', de: 'Mutter', fr: 'mère', it: 'madre', ja: 'お母さん', lvl: 1, cat: 'люди' },
  { id: 'father', ru: 'папа', en: 'father', es: 'padre', de: 'Vater', fr: 'père', it: 'padre', ja: 'お父さん', lvl: 1, cat: 'люди' },
  { id: 'name', ru: 'имя', en: 'name', es: 'nombre', de: 'Name', fr: 'nom', it: 'nome', ja: '名前', lvl: 1, cat: 'люди' },
  { id: 'person', ru: 'человек', en: 'person', es: 'persona', de: 'Person', fr: 'personne', it: 'persona', ja: '人', lvl: 2, cat: 'люди' },
  { id: 'child', ru: 'ребёнок', en: 'child', es: 'niño', de: 'Kind', fr: 'enfant', it: 'bambino', ja: '子供', lvl: 1, cat: 'люди' },
  { id: 'woman', ru: 'женщина', en: 'woman', es: 'mujer', de: 'Frau', fr: 'femme', it: 'donna', ja: '女性', lvl: 2, cat: 'люди' },
  { id: 'man', ru: 'мужчина', en: 'man', es: 'hombre', de: 'Mann', fr: 'homme', it: 'uomo', ja: '男性', lvl: 2, cat: 'люди' },
  { id: 'neighbor', ru: 'сосед', en: 'neighbor', es: 'vecino', de: 'Nachbar', fr: 'voisin', it: 'vicino', ja: '隣人', lvl: 1, cat: 'люди' },

  // Еда & Продукты
  { id: 'water', ru: 'вода', en: 'water', es: 'agua', de: 'Wasser', fr: 'eau', it: 'acqua', ja: '水', lvl: 1, cat: 'еда' },
  { id: 'coffee', ru: 'кофе', en: 'coffee', es: 'café', de: 'Kaffee', fr: 'café', it: 'caffè', ja: 'コーヒー', lvl: 1, cat: 'еда' },
  { id: 'tea', ru: 'чай', en: 'tea', es: 'té', de: 'Tee', fr: 'thé', it: 'tè', ja: 'お茶', lvl: 1, cat: 'еда' },
  { id: 'bread', ru: 'хлеб', en: 'bread', es: 'pan', de: 'Brot', fr: 'pain', it: 'pane', ja: 'パン', lvl: 1, cat: 'еда' },
  { id: 'milk', ru: 'молоко', en: 'milk', es: 'leche', de: 'Milch', fr: 'lait', it: 'latte', ja: '牛乳', lvl: 1, cat: 'еда' },
  { id: 'apple', ru: 'яблоко', en: 'apple', es: 'manzana', de: 'Apfel', fr: 'pomme', it: 'mela', ja: 'りんご', lvl: 1, cat: 'еда' },
  { id: 'cheese', ru: 'сыр', en: 'cheese', es: 'queso', de: 'Käse', fr: 'fromage', it: 'formaggio', ja: 'チーズ', lvl: 2, cat: 'еда' },
  { id: 'meat', ru: 'мясо', en: 'meat', es: 'carne', de: 'Fleisch', fr: 'viande', it: 'carne', ja: '肉', lvl: 2, cat: 'еда' },
  { id: 'breakfast', ru: 'завтрак', en: 'breakfast', es: 'desayuno', de: 'Frühstück', fr: 'petit-déjeuner', it: 'colazione', ja: '朝食', lvl: 2, cat: 'еда' },
  { id: 'dinner', ru: 'ужин', en: 'dinner', es: 'cena', de: 'Abendessen', fr: 'dîner', it: 'cena', ja: '夕食', lvl: 2, cat: 'еда' },
  { id: 'restaurant', ru: 'ресторан', en: 'restaurant', es: 'restaurante', de: 'Restaurant', fr: 'restaurant', it: 'ristorante', ja: 'レストラン', lvl: 1, cat: 'еда' },
  { id: 'hungry', ru: 'голодный', en: 'hungry', es: 'hambriento', de: 'hungrig', fr: 'affamé', it: 'affamato', ja: 'お腹が空いた', lvl: 2, cat: 'еда' },
  { id: 'cook', ru: 'готовить', en: 'to cook', es: 'cocinar', de: 'kochen', fr: 'cuisiner', it: 'cucinare', ja: '料理する', lvl: 2, cat: 'еда' },
  { id: 'supermarket', ru: 'супермаркет', en: 'supermarket', es: 'supermercado', de: 'Supermarkt', fr: 'supermarché', it: 'supermercato', ja: 'スーパー', lvl: 1, cat: 'еда' },
  { id: 'fruit', ru: 'фрукты', en: 'fruit', es: 'fruta', de: 'Obst', fr: 'fruits', it: 'frutta', ja: '果物', lvl: 1, cat: 'еда' },
  { id: 'price', ru: 'цена', en: 'price', es: 'precio', de: 'Preis', fr: 'prix', it: 'prezzo', ja: '価格', lvl: 2, cat: 'еда' },

  // Дом & Отель
  { id: 'house', ru: 'дом', en: 'house', es: 'casa', de: 'Haus', fr: 'maison', it: 'casa', ja: '家', lvl: 1, cat: 'дом' },
  { id: 'door', ru: 'дверь', en: 'door', es: 'puerta', de: 'Tür', fr: 'porte', it: 'porta', ja: 'ドア', lvl: 1, cat: 'дом' },
  { id: 'window', ru: 'окно', en: 'window', es: 'ventana', de: 'Fenster', fr: 'fenêtre', it: 'finestra', ja: '窓', lvl: 1, cat: 'дом' },
  { id: 'table', ru: 'стол', en: 'table', es: 'mesa', de: 'Tisch', fr: 'table', it: 'tavolo', ja: 'テーブル', lvl: 1, cat: 'дом' },
  { id: 'bed', ru: 'кровать', en: 'bed', es: 'cama', de: 'Bett', fr: 'lit', it: 'letto', ja: 'ベッド', lvl: 1, cat: 'дом' },
  { id: 'kitchen', ru: 'кухня', en: 'kitchen', es: 'cocina', de: 'Küche', fr: 'cuisine', it: 'cucina', ja: '台所', lvl: 2, cat: 'дом' },
  { id: 'room', ru: 'комната', en: 'room', es: 'habitación', de: 'Zimmer', fr: 'chambre', it: 'stanza', ja: '部屋', lvl: 1, cat: 'дом' },
  { id: 'key', ru: 'ключ', en: 'key', es: 'llave', de: 'Schlüssel', fr: 'clé', it: 'chiave', ja: '鍵', lvl: 2, cat: 'дом' },
  { id: 'lamp', ru: 'лампа', en: 'lamp', es: 'lámpara', de: 'Lampe', fr: 'lampe', it: 'lampada', ja: 'ランプ', lvl: 2, cat: 'дом' },
  { id: 'jacket', ru: 'куртка', en: 'jacket', es: 'chaqueta', de: 'Jacke', fr: 'veste', it: 'giacca', ja: 'ジャケット', lvl: 2, cat: 'дом' },
  { id: 'reservation', ru: 'бронь', en: 'reservation', es: 'reserva', de: 'Reservierung', fr: 'réservation', it: 'prenotazione', ja: '予約', lvl: 2, cat: 'дом' },
  { id: 'view', ru: 'вид', en: 'view', es: 'vista', de: 'Aussicht', fr: 'vue', it: 'vista', ja: '眺め', lvl: 2, cat: 'дом' },

  // Город & Путешествия
  { id: 'street', ru: 'улица', en: 'street', es: 'calle', de: 'Straße', fr: 'rue', it: 'strada', ja: '通り', lvl: 1, cat: 'город' },
  { id: 'city', ru: 'город', en: 'city', es: 'ciudad', de: 'Stadt', fr: 'ville', it: 'città', ja: '街', lvl: 1, cat: 'город' },
  { id: 'shop', ru: 'магазин', en: 'shop', es: 'tienda', de: 'Geschäft', fr: 'magasin', it: 'negozio', ja: '店', lvl: 1, cat: 'город' },
  { id: 'bus', ru: 'автобус', en: 'bus', es: 'autobús', de: 'Bus', fr: 'bus', it: 'autobus', ja: 'バス', lvl: 1, cat: 'город' },
  { id: 'car', ru: 'машина', en: 'car', es: 'coche', de: 'Auto', fr: 'voiture', it: 'auto', ja: '車', lvl: 1, cat: 'город' },
  { id: 'station', ru: 'вокзал', en: 'station', es: 'estación', de: 'Bahnhof', fr: 'gare', it: 'stazione', ja: '駅', lvl: 2, cat: 'город' },
  { id: 'bridge', ru: 'мост', en: 'bridge', es: 'puente', de: 'Brücke', fr: 'pont', it: 'ponte', ja: '橋', lvl: 2, cat: 'город' },
  { id: 'square', ru: 'площадь', en: 'square', es: 'plaza', de: 'Platz', fr: 'place', it: 'piazza', ja: '広場', lvl: 2, cat: 'город' },
  { id: 'museum', ru: 'музей', en: 'museum', es: 'museo', de: 'Museum', fr: 'musée', it: 'museo', ja: '博物館', lvl: 1, cat: 'город' },
  { id: 'pharmacy', ru: 'аптека', en: 'pharmacy', es: 'farmacia', de: 'Apotheke', fr: 'pharmacie', it: 'farmacia', ja: '薬局', lvl: 2, cat: 'город' },

  { id: 'journey', ru: 'путешествие', en: 'journey', es: 'viaje', de: 'Reise', fr: 'voyage', it: 'viaggio', ja: '旅行', lvl: 2, cat: 'путешествия' },
  { id: 'ticket', ru: 'билет', en: 'ticket', es: 'billete', de: 'Ticket', fr: 'billet', it: 'biglietto', ja: 'チケット', lvl: 2, cat: 'путешествия' },
  { id: 'hotel', ru: 'отель', en: 'hotel', es: 'hotel', de: 'Hotel', fr: 'hôtel', it: 'hotel', ja: 'ホテル', lvl: 1, cat: 'путешествия' },
  { id: 'airport', ru: 'аэропорт', en: 'airport', es: 'aeropuerto', de: 'Flughafen', fr: 'aéroport', it: 'aeroporto', ja: '空港', lvl: 2, cat: 'путешествия' },
  { id: 'train', ru: 'поезд', en: 'train', es: 'tren', de: 'Zug', fr: 'train', it: 'treno', ja: '電車', lvl: 1, cat: 'путешествия' },
  { id: 'map', ru: 'карта', en: 'map', es: 'mapa', de: 'Karte', fr: 'carte', it: 'mappa', ja: '地図', lvl: 1, cat: 'путешествия' },
  { id: 'beach', ru: 'пляж', en: 'beach', es: 'playa', de: 'Strand', fr: 'plage', it: 'spiaggia', ja: 'ビーチ', lvl: 2, cat: 'путешествия' },
  { id: 'mountain', ru: 'гора', en: 'mountain', es: 'montaña', de: 'Berg', fr: 'montagne', it: 'montagna', ja: '山', lvl: 2, cat: 'путешествия' },
  { id: 'sea', ru: 'море', en: 'sea', es: 'mar', de: 'Meer', fr: 'mer', it: 'mare', ja: '海', lvl: 1, cat: 'путешествия' },
  { id: 'suitcase', ru: 'чемодан', en: 'suitcase', es: 'maleta', de: 'Koffer', fr: 'valise', it: 'valigia', ja: 'スーツケース', lvl: 3, cat: 'путешествия' },
  { id: 'relocation', ru: 'переезд', en: 'relocation', es: 'mudanza', de: 'Umzug', fr: 'déménagement', it: 'trasferimento', ja: '引っ越し', lvl: 4, cat: 'путешествия' },
  { id: 'culture', ru: 'культура', en: 'culture', es: 'cultura', de: 'Kultur', fr: 'culture', it: 'cultura', ja: '文化', lvl: 4, cat: 'путешествия' },

  // Работа, Наука & Бизнес (PRO)
  { id: 'work', ru: 'работа', en: 'work', es: 'trabajo', de: 'Arbeit', fr: 'travail', it: 'lavoro', ja: '仕事', lvl: 1, cat: 'работа' },
  { id: 'book', ru: 'книга', en: 'book', es: 'libro', de: 'Buch', fr: 'livre', it: 'libro', ja: '本', lvl: 1, cat: 'работа' },
  { id: 'school', ru: 'школа', en: 'school', es: 'escuela', de: 'Schule', fr: 'école', it: 'scuola', ja: '学校', lvl: 1, cat: 'работа' },
  { id: 'lesson', ru: 'урок', en: 'lesson', es: 'lección', de: 'Lektion', fr: 'leçon', it: 'lezione', ja: '授業', lvl: 1, cat: 'работа' },
  { id: 'language', ru: 'язык', en: 'language', es: 'idioma', de: 'Sprache', fr: 'langue', it: 'lingua', ja: '言語', lvl: 1, cat: 'работа' },
  { id: 'word', ru: 'слово', en: 'word', es: 'palabra', de: 'Wort', fr: 'mot', it: 'parola', ja: '単語', lvl: 1, cat: 'работа' },
  { id: 'question', ru: 'вопрос', en: 'question', es: 'pregunta', de: 'Frage', fr: 'question', it: 'domanda', ja: '質問', lvl: 2, cat: 'работа' },
  { id: 'answer', ru: 'ответ', en: 'answer', es: 'respuesta', de: 'Antwort', fr: 'réponse', it: 'risposta', ja: '答え', lvl: 2, cat: 'работа' },
  { id: 'computer', ru: 'компьютер', en: 'computer', es: 'ordenador', de: 'Computer', fr: 'ordinateur', it: 'computer', ja: 'パソコン', lvl: 1, cat: 'работа' },
  { id: 'meeting', ru: 'встреча', en: 'meeting', es: 'reunión', de: 'Meeting', fr: 'réunion', it: 'riunione', ja: '会議', lvl: 3, cat: 'работа' },
  { id: 'office', ru: 'офис', en: 'office', es: 'oficina', de: 'Büro', fr: 'bureau', it: 'ufficio', ja: 'オフィス', lvl: 2, cat: 'работа' },
  { id: 'ai', ru: 'искусственный интеллект', en: 'artificial intelligence', es: 'inteligencia artificial', de: 'künstliche Intelligenz', fr: 'intelligence artificielle', it: 'intelligenza artificiale', ja: '人工知能', lvl: 3, cat: 'работа' },
  { id: 'space', ru: 'космос', en: 'space', es: 'espacio', de: 'Weltraum', fr: 'espace', it: 'spazio', ja: '宇宙', lvl: 3, cat: 'работа' },
  { id: 'science', ru: 'наука', en: 'science', es: 'ciencia', de: 'Wissenschaft', fr: 'science', it: 'scienza', ja: '科学', lvl: 3, cat: 'работа' },
  { id: 'business', ru: 'бизнес', en: 'business', es: 'negocio', de: 'Geschäft', fr: 'affaires', it: 'affari', ja: 'ビジネス', lvl: 4, cat: 'работа' },
  { id: 'deal', ru: 'сделка', en: 'deal', es: 'trato', de: 'Deal', fr: 'accord', it: 'accordo', ja: '取引', lvl: 4, cat: 'работа' },
  { id: 'strategy', ru: 'стратегия', en: 'strategy', es: 'estrategia', de: 'Strategie', fr: 'stratégie', it: 'strategia', ja: '戦略', lvl: 4, cat: 'работа' },
  { id: 'partner', ru: 'партнёр', en: 'partner', es: 'socio', de: 'Partner', fr: 'partenaire', it: 'partner', ja: 'パートナー', lvl: 4, cat: 'работа' },

  // Природа & Искусство & Экология
  { id: 'sun', ru: 'солнце', en: 'sun', es: 'sol', de: 'Sonne', fr: 'soleil', it: 'sole', ja: '太陽', lvl: 1, cat: 'природа' },
  { id: 'rain', ru: 'дождь', en: 'rain', es: 'lluvia', de: 'Regen', fr: 'pluie', it: 'pioggia', ja: '雨', lvl: 1, cat: 'природа' },
  { id: 'snow', ru: 'снег', en: 'snow', es: 'nieve', de: 'Schnee', fr: 'neige', it: 'neve', ja: '雪', lvl: 1, cat: 'природа' },
  { id: 'wind', ru: 'ветер', en: 'wind', es: 'viento', de: 'Wind', fr: 'vent', it: 'vento', ja: '風', lvl: 2, cat: 'природа' },
  { id: 'tree', ru: 'дерево', en: 'tree', es: 'árbol', de: 'Baum', fr: 'arbre', it: 'albero', ja: '木', lvl: 1, cat: 'природа' },
  { id: 'flower', ru: 'цветок', en: 'flower', es: 'flor', de: 'Blume', fr: 'fleur', it: 'fiore', ja: '花', lvl: 1, cat: 'природа' },
  { id: 'forest', ru: 'лес', en: 'forest', es: 'bosque', de: 'Wald', fr: 'forêt', it: 'foresta', ja: '森', lvl: 2, cat: 'природа' },
  { id: 'sky', ru: 'небо', en: 'sky', es: 'cielo', de: 'Himmel', fr: 'ciel', it: 'cielo', ja: '空', lvl: 2, cat: 'природа' },
  { id: 'river', ru: 'река', en: 'river', es: 'río', de: 'Fluss', fr: 'rivière', it: 'fiume', ja: '川', lvl: 2, cat: 'природа' },
  { id: 'bird', ru: 'птица', en: 'bird', es: 'pájaro', de: 'Vogel', fr: 'oiseau', it: 'uccello', ja: '鳥', lvl: 2, cat: 'природа' },
  { id: 'cat', ru: 'кот', en: 'cat', es: 'gato', de: 'Katze', fr: 'chat', it: 'gatto', ja: '猫', lvl: 1, cat: 'природа' },
  { id: 'dog', ru: 'собака', en: 'dog', es: 'perro', de: 'Hund', fr: 'chien', it: 'cane', ja: '犬', lvl: 1, cat: 'природа' },
  { id: 'art', ru: 'искусство', en: 'art', es: 'arte', de: 'Kunst', fr: 'art', it: 'arte', ja: '芸術', lvl: 3, cat: 'природа' },
  { id: 'painting', ru: 'картина', en: 'painting', es: 'pintura', de: 'Gemälde', fr: 'peinture', it: 'dipinto', ja: '絵画', lvl: 3, cat: 'природа' },
  { id: 'inspiration', ru: 'вдохновение', en: 'inspiration', es: 'inspiración', de: 'Inspiration', fr: 'inspiration', it: 'ispirazione', ja: 'インスピレーション', lvl: 3, cat: 'эмоции' },
  { id: 'ecology', ru: 'экология', en: 'ecology', es: 'ecología', de: 'Ökologie', fr: 'écologie', it: 'ecologia', ja: '生態学', lvl: 4, cat: 'природа' },
  { id: 'planet', ru: 'планета', en: 'planet', es: 'planeta', de: 'Planet', fr: 'planète', it: 'pianeta', ja: '惑星', lvl: 4, cat: 'природа' },
  { id: 'clean', ru: 'чистый', en: 'clean', es: 'limpio', de: 'sauber', fr: 'propre', it: 'pulito', ja: '清潔な', lvl: 2, cat: 'природа' },

  // Здоровье & Философия
  { id: 'doctor', ru: 'врач', en: 'doctor', es: 'médico', de: 'Arzt', fr: 'médecin', it: 'medico', ja: '医者', lvl: 2, cat: 'люди' },
  { id: 'health', ru: 'здоровье', en: 'health', es: 'salud', de: 'Gesundheit', fr: 'santé', it: 'salute', ja: '健康', lvl: 2, cat: 'люди' },
  { id: 'medicine', ru: 'лекарство', en: 'medicine', es: 'medicina', de: 'Medizin', fr: 'médicament', it: 'medicina', ja: '薬', lvl: 2, cat: 'люди' },
  { id: 'rest', ru: 'отдых', en: 'rest', es: 'descanso', de: 'Ruhe', fr: 'repos', it: 'riposo', ja: '休息', lvl: 2, cat: 'эмоции' },
  { id: 'philosophy', ru: 'философия', en: 'philosophy', es: 'filosofía', de: 'Philosophie', fr: 'philosophie', it: 'filosofia', ja: '哲学', lvl: 4, cat: 'время' },
  { id: 'wisdom', ru: 'мудрость', en: 'wisdom', es: 'sabiduría', de: 'Weisheit', fr: 'sagesse', it: 'saggezza', ja: '智慧', lvl: 4, cat: 'время' },
  { id: 'victory', ru: 'победа', en: 'victory', es: 'victoria', de: 'Sieg', fr: 'victoire', it: 'vittoria', ja: '勝利', lvl: 4, cat: 'время' },

  // Прилагательные & Действия
  { id: 'fresh', ru: 'свежий', en: 'fresh', es: 'fresco', de: 'frisch', fr: 'frais', it: 'fresco', ja: '新鮮な', lvl: 2, cat: 'природа' },
  { id: 'hot', ru: 'горячий', en: 'hot', es: 'caliente', de: 'heiß', fr: 'chaud', it: 'caldo', ja: '熱い', lvl: 1, cat: 'природа' },
  { id: 'quiet', ru: 'тихий', en: 'quiet', es: 'tranquilo', de: 'ruhig', fr: 'calme', it: 'tranquillo', ja: '静かな', lvl: 2, cat: 'природа' },
  { id: 'warm', ru: 'тёплый', en: 'warm', es: 'cálido', de: 'warm', fr: 'chaud', it: 'caldo', ja: '温かい', lvl: 1, cat: 'природа' },
  { id: 'good', ru: 'хороший', en: 'good', es: 'bueno', de: 'gut', fr: 'bon', it: 'buono', ja: '良い', lvl: 1, cat: 'основа' },
  { id: 'early', ru: 'ранний', en: 'early', es: 'temprano', de: 'früh', fr: 'tôt', it: 'presto', ja: '早朝の', lvl: 2, cat: 'время' },
  { id: 'happy', ru: 'счастливый', en: 'happy', es: 'feliz', de: 'glücklich', fr: 'heureux', it: 'felice', ja: '幸せな', lvl: 1, cat: 'эмоции' },
  { id: 'sad', ru: 'грустный', en: 'sad', es: 'triste', de: 'traurig', fr: 'triste', it: 'triste', ja: '悲しい', lvl: 2, cat: 'эмоции' },
  { id: 'love', ru: 'любить', en: 'to love', es: 'amar', de: 'lieben', fr: 'aimer', it: 'amare', ja: '愛する', lvl: 1, cat: 'эмоции' },
  { id: 'fear', ru: 'страх', en: 'fear', es: 'miedo', de: 'Angst', fr: 'peur', it: 'paura', ja: '恐怖', lvl: 2, cat: 'эмоции' },
  { id: 'tired', ru: 'уставший', en: 'tired', es: 'cansado', de: 'müde', fr: 'fatigué', it: 'stanco', ja: '疲れた', lvl: 2, cat: 'эмоции' },
  { id: 'smile', ru: 'улыбка', en: 'smile', es: 'sonrisa', de: 'Lächeln', fr: 'sourire', it: 'sorriso', ja: '笑顔', lvl: 2, cat: 'эмоции' },
  { id: 'go', ru: 'идти', en: 'to go', es: 'ir', de: 'gehen', fr: 'aller', it: 'andare', ja: '行く', lvl: 1, cat: 'действия' },
  { id: 'eat', ru: 'есть', en: 'to eat', es: 'comer', de: 'essen', fr: 'manger', it: 'mangiare', ja: '食べる', lvl: 1, cat: 'действия' },
  { id: 'drink', ru: 'пить', en: 'to drink', es: 'beber', de: 'trinken', fr: 'boire', it: 'bere', ja: '飲む', lvl: 1, cat: 'действия' },
  { id: 'read', ru: 'читать', en: 'to read', es: 'leer', de: 'lesen', fr: 'lire', it: 'leggere', ja: '読む', lvl: 1, cat: 'действия' },
  { id: 'write', ru: 'писать', en: 'to write', es: 'escribir', de: 'schreiben', fr: 'écrire', it: 'scrivere', ja: '書く', lvl: 1, cat: 'действия' },
  { id: 'speak', ru: 'говорить', en: 'to speak', es: 'hablar', de: 'sprechen', fr: 'parler', it: 'parlare', ja: '話す', lvl: 1, cat: 'действия' },
  { id: 'see', ru: 'видеть', en: 'to see', es: 'ver', de: 'sehen', fr: 'voir', it: 'vedere', ja: '見る', lvl: 1, cat: 'действия' },
  { id: 'know', ru: 'знать', en: 'to know', es: 'saber', de: 'wissen', fr: 'savoir', it: 'sapere', ja: '知る', lvl: 1, cat: 'действия' },
  { id: 'sleep', ru: 'спать', en: 'to sleep', es: 'dormir', de: 'schlafen', fr: 'dormir', it: 'dormire', ja: '寝る', lvl: 1, cat: 'действия' },
  { id: 'open', ru: 'открывать', en: 'to open', es: 'abrir', de: 'öffnen', fr: 'ouvrir', it: 'aprire', ja: '開ける', lvl: 2, cat: 'действия' },
  { id: 'buy', ru: 'покупать', en: 'to buy', es: 'comprar', de: 'kaufen', fr: 'acheter', it: 'comprare', ja: '買う', lvl: 2, cat: 'действия' },
  { id: 'help', ru: 'помогать', en: 'to help', es: 'ayudar', de: 'helfen', fr: 'aider', it: 'aiutare', ja: '助ける', lvl: 2, cat: 'действия' },
  { id: 'think', ru: 'думать', en: 'to think', es: 'pensar', de: 'denken', fr: 'penser', it: 'pensare', ja: '考える', lvl: 2, cat: 'действия' },
  { id: 'wait', ru: 'ждать', en: 'to wait', es: 'esperar', de: 'warten', fr: 'attendre', it: 'aspettare', ja: '待つ', lvl: 2, cat: 'действия' },
  { id: 'travel', ru: 'путешествовать', en: 'to travel', es: 'viajar', de: 'reisen', fr: 'voyager', it: 'viaggiare', ja: '旅行する', lvl: 2, cat: 'действия' },
  { id: 'wake', ru: 'просыпаться', en: 'to wake up', es: 'despertar', de: 'aufwachen', fr: 'se réveiller', it: 'svegliarsi', ja: '起きる', lvl: 2, cat: 'действия' },
  { id: 'exit', ru: 'выходить', en: 'to exit', es: 'salir', de: 'ausgehen', fr: 'sortir', it: 'uscire', ja: '出る', lvl: 2, cat: 'действия' },
  { id: 'feel', ru: 'чувствовать', en: 'to feel', es: 'sentir', de: 'fühlen', fr: 'sentir', it: 'sentire', ja: '感じる', lvl: 2, cat: 'действия' },

  // Время & Жизнь
  { id: 'day', ru: 'день', en: 'day', es: 'día', de: 'Tag', fr: 'jour', it: 'giorno', ja: '日', lvl: 1, cat: 'время' },
  { id: 'morning', ru: 'утро', en: 'morning', es: 'mañana', de: 'Morgen', fr: 'matin', it: 'mattina', ja: '朝', lvl: 1, cat: 'время' },
  { id: 'evening', ru: 'вечер', en: 'evening', es: 'tarde', de: 'Abend', fr: 'soir', it: 'sera', ja: '夜', lvl: 1, cat: 'время' },
  { id: 'night', ru: 'ночь', en: 'night', es: 'noche', de: 'Nacht', fr: 'nuit', it: 'notte', ja: '夜中', lvl: 1, cat: 'время' },
  { id: 'today', ru: 'сегодня', en: 'today', es: 'hoy', de: 'heute', fr: 'aujourd’hui', it: 'oggi', ja: '今日', lvl: 1, cat: 'время' },
  { id: 'tomorrow', ru: 'завтра', en: 'tomorrow', es: 'mañana', de: 'morgen', fr: 'demain', it: 'domani', ja: '明日', lvl: 2, cat: 'время' },
  { id: 'week', ru: 'неделя', en: 'week', es: 'semana', de: 'Woche', fr: 'semaine', it: 'settimana', ja: '週', lvl: 2, cat: 'время' },
  { id: 'time', ru: 'время', en: 'time', es: 'tiempo', de: 'Zeit', fr: 'temps', it: 'tempo', ja: '時間', lvl: 1, cat: 'время' },
  { id: 'money', ru: 'деньги', en: 'money', es: 'dinero', de: 'Geld', fr: 'argent', it: 'denaro', ja: 'お金', lvl: 2, cat: 'время' },
  { id: 'gift', ru: 'подарок', en: 'gift', es: 'regalo', de: 'Geschenk', fr: 'cadeau', it: 'regalo', ja: 'ギフト', lvl: 2, cat: 'время' },
  { id: 'music', ru: 'музыка', en: 'music', es: 'música', de: 'Musik', fr: 'musique', it: 'musica', ja: '音楽', lvl: 1, cat: 'время' },
  { id: 'song', ru: 'песня', en: 'song', es: 'canción', de: 'Lied', fr: 'chanson', it: 'canzone', ja: '歌', lvl: 2, cat: 'время' },
  { id: 'film', ru: 'фильм', en: 'film', es: 'película', de: 'Film', fr: 'film', it: 'film', ja: '映画', lvl: 1, cat: 'время' },
  { id: 'weather', ru: 'погода', en: 'weather', es: 'tiempo', de: 'Wetter', fr: 'météo', it: 'tempo', ja: '天気', lvl: 2, cat: 'время' },
  { id: 'dream', ru: 'мечта', en: 'dream', es: 'sueño', de: 'Traum', fr: 'rêve', it: 'sogno', ja: '夢', lvl: 3, cat: 'время' },
  { id: 'story', ru: 'история', en: 'story', es: 'historia', de: 'Geschichte', fr: 'histoire', it: 'storia', ja: '物語', lvl: 2, cat: 'время' },
  { id: 'news', ru: 'новости', en: 'news', es: 'noticias', de: 'Nachrichten', fr: 'nouvelles', it: 'notizie', ja: 'ニュース', lvl: 3, cat: 'время' },
  { id: 'phone', ru: 'телефон', en: 'phone', es: 'teléfono', de: 'Telefon', fr: 'téléphone', it: 'telefono', ja: '電話', lvl: 1, cat: 'время' },
  { id: 'letter', ru: 'письмо', en: 'letter', es: 'carta', de: 'Brief', fr: 'lettre', it: 'lettera', ja: '手紙', lvl: 2, cat: 'время' },
  { id: 'surprise', ru: 'сюрприз', en: 'surprise', es: 'sorpresa', de: 'Überraschung', fr: 'surprise', it: 'sorpresa', ja: 'サプライズ', lvl: 3, cat: 'время' },
  { id: 'decision', ru: 'решение', en: 'decision', es: 'decisión', de: 'Entscheidung', fr: 'décision', it: 'decisione', ja: '決定', lvl: 3, cat: 'время' },
  { id: 'experience', ru: 'опыт', en: 'experience', es: 'experiencia', de: 'Erfahrung', fr: 'expérience', it: 'esperienza', ja: '経験', lvl: 3, cat: 'время' },
  { id: 'knowledge', ru: 'знания', en: 'knowledge', es: 'conocimiento', de: 'Wissen', fr: 'connaissance', it: 'conoscenza', ja: '知識', lvl: 3, cat: 'время' },
  { id: 'goal', ru: 'цель', en: 'goal', es: 'objetivo', de: 'Ziel', fr: 'objectif', it: 'objectif', ja: '目標', lvl: 3, cat: 'время' },
  { id: 'success', ru: 'успех', en: 'success', es: 'éxito', de: 'Erfolg', fr: 'succès', it: 'successo', ja: '成功', lvl: 3, cat: 'время' },
  { id: 'mistake', ru: 'ошибка', en: 'mistake', es: 'error', de: 'Fehler', fr: 'erreur', it: 'erreur', ja: '間違い', lvl: 3, cat: 'время' },
  { id: 'umbrella', ru: 'зонт', en: 'umbrella', es: 'paraguas', de: 'Regenschirm', fr: 'parapluie', it: 'ombrello', ja: '傘', sk: 'dáždnik', lvl: 1, cat: 'дом' },
  { id: 'meet', ru: 'встречаться', en: 'to meet', es: 'encontrarse', de: 'sich treffen', fr: 'rencontrer', it: 'incontrarsi', ja: '会う', sk: 'stretnúť sa', lvl: 1, cat: 'действия' },
  { id: 'confidence', ru: 'уверенность', en: 'confidence', es: 'confianza', de: 'Vertrauen', fr: 'confiance', it: 'fiducia', ja: '自信', sk: 'sebadôvera', lvl: 3, cat: 'эмоции' },
  { id: 'walk', ru: 'гулять', en: 'to walk', es: 'caminar', de: 'spazieren gehen', fr: 'marcher', it: 'camminare', ja: '歩く', sk: 'prechádzať sa', lvl: 1, cat: 'действия' },
  { id: 'project', ru: 'проект', en: 'project', es: 'proyecto', de: 'Projekt', fr: 'projet', it: 'progetto', ja: 'プロジェクト', sk: 'projekt', lvl: 2, cat: 'работа' },
  { id: 'hope', ru: 'надежда', en: 'hope', es: 'esperanza', de: 'Hoffnung', fr: 'espoir', it: 'speranza', ja: '希望', sk: 'nádej', lvl: 2, cat: 'эмоции' }
];

// Only the generated entries that lesson texts actually resolve to. The rest of
// the frequency corpus is not dictionary content: it never appears in a lesson
// and a measurable slice of it has broken translations. See
// `lessonLinkedWords.ts` for the full reasoning.
const linkedGeneratedIds = new Set(LESSON_LINKED_GENERATED_IDS);
const RELEVANT_EXPANDED_WORDS = EXPANDED_WORDS.filter((word) => linkedGeneratedIds.has(word.id));

// Keep the curated translations first when the generated frequency corpus
// contains the same English headword.
const uniqueWords = new Map<string, Word>();
[...BASE_WORDS, ...RELEVANT_EXPANDED_WORDS].forEach((word) => {
  const key = word.en.trim().toLowerCase();
  if (!uniqueWords.has(key)) uniqueWords.set(key, word);
});

export const WORDS: Word[] = Array.from(uniqueWords.values());

// Keep the dictionary data in one place while adding Slovak translations
// without duplicating every existing word record.
WORDS.forEach((word) => {
  if (!word.sk) word.sk = SLOVAK_TRANSLATIONS[word.id] || word.en;
  if (!word.cs) word.cs = CZECH_TRANSLATIONS[word.id] || word.en;
});

export const WORD_MAP = Object.fromEntries(WORDS.map((w) => [w.id, w]));
