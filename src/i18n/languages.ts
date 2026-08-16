import { Language } from '@/common/types';

export const DEFAULT_LANGUAGE = Language.EN;

export const SUPPORTED_UI_LANGUAGES = [
  Language.EN,
  Language.Ru,
  Language.Es,
  Language.Fr,
  Language.De,
  Language.It,
  Language.Pl,
] as const;

export type SupportedLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

export const LANGUAGE_OPTIONS: Record<
  SupportedLanguage,
  {
    emoji: string;
    label: string;
    nativeLabel: string;
  }
> = {
  [Language.EN]: {
    emoji: '🇺🇸',
    label: 'English',
    nativeLabel: 'English',
  },
  [Language.Ru]: {
    emoji: '🇷🇺',
    label: 'Russian',
    nativeLabel: 'Русский',
  },
  [Language.Es]: {
    emoji: '🇪🇸',
    label: 'Spanish',
    nativeLabel: 'Español',
  },
  [Language.Fr]: {
    emoji: '🇫🇷',
    label: 'French',
    nativeLabel: 'Français',
  },
  [Language.De]: {
    emoji: '🇩🇪',
    label: 'German',
    nativeLabel: 'Deutsch',
  },
  [Language.It]: {
    emoji: '🇮🇹',
    label: 'Italian',
    nativeLabel: 'Italiano',
  },
  [Language.Pl]: {
    emoji: '🇵🇱',
    label: 'Polish',
    nativeLabel: 'Polski',
  },
};

export function normalizeLanguage(value?: string | null): SupportedLanguage {
  if (!value) return DEFAULT_LANGUAGE;

  const normalized = value.toLowerCase().replace('_', '-').split('-')[0];

  return SUPPORTED_UI_LANGUAGES.includes(normalized as SupportedLanguage)
    ? (normalized as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}
