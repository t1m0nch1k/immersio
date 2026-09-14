import { Language, LanguageCode } from '../types';

export const LANGUAGES: Record<LanguageCode, Language> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    speechLang: 'en-US',
    bgLetters: ['A', 'B', 'C', 'D', 'E', 'G', 'L', 'N', 'R', 'S', 'T', 'W', 'Y', 'Z']
  },
  es: {
    code: 'es',
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    speechLang: 'es-ES',
    bgLetters: ['A', 'E', 'Ñ', 'Ó', 'R', 'S', 'Ú', '¿', 'J', 'L', 'Z', 'C']
  },
  de: {
    code: 'de',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    speechLang: 'de-DE',
    bgLetters: ['A', 'Ä', 'B', 'E', 'Ö', 'S', 'Ü', 'ß', 'Z', 'R', 'K', 'M']
  },
  fr: {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    speechLang: 'fr-FR',
    bgLetters: ['A', 'Ç', 'É', 'È', 'Ê', 'L', 'M', 'O', 'R', 'S', 'T', 'V']
  },
  it: {
    code: 'it',
    name: 'Italiano',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    speechLang: 'it-IT',
    bgLetters: ['A', 'B', 'C', 'E', 'G', 'I', 'L', 'M', 'O', 'P', 'R', 'S', 'T', 'V', 'Z']
  },
  ja: {
    code: 'ja',
    name: '日本語',
    nativeName: 'Japanese',
    flag: '🇯🇵',
    speechLang: 'ja-JP',
    bgLetters: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ']
  },
  sk: {
    code: 'sk',
    name: 'Slovenčina',
    nativeName: 'Slovak',
    flag: '🇸🇰',
    speechLang: 'sk-SK',
    bgLetters: ['A', 'Á', 'Ä', 'B', 'Č', 'D', 'Ď', 'E', 'É', 'Í', 'L', 'Ľ', 'Ň', 'O', 'Ô', 'Š', 'Ť', 'Ú', 'Ž']
  },
  cs: {
    code: 'cs',
    name: 'Čeština',
    nativeName: 'Czech',
    flag: '🇨🇿',
    speechLang: 'cs-CZ',
    bgLetters: ['A', 'Á', 'B', 'C', 'Č', 'D', 'Ď', 'E', 'É', 'Ě', 'F', 'G', 'H', 'Ch', 'I', 'Í', 'J', 'K', 'L', 'M', 'N', 'Ň', 'O', 'Ó', 'P', 'R', 'Ř', 'S', 'Š', 'T', 'Ť', 'U', 'Ú', 'Ů', 'V', 'Y', 'Ý', 'Z', 'Ž']
  }
};
