import { LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';

export const AVATARS = [
  '🦊', '🐼', '🦉', '🐸', '🐙', '🦄', '🐯', '🐨',
  '🦁', '🐹', '🐳', '🦜', '🐢', '🦋', '🐝', '🤖',
];

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export const LEVEL_LABELS = ['A1', 'A2', 'B1', 'B2/C1'];
