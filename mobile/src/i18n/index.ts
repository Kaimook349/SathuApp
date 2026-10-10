import th, { TranslationKey } from './th';
import en from './en';

export type Lang = 'th' | 'en';
export type { TranslationKey };

export const translations: Record<Lang, Record<TranslationKey, string>> = {
  th,
  en,
};