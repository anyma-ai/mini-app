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
    label: string;
    nativeLabel: string;
  }
> = {
  [Language.EN]: {
    label: 'English',
    nativeLabel: 'English',
  },
  [Language.Ru]: {
    label: 'Russian',
    nativeLabel: 'Русский',
  },
  [Language.Es]: {
    label: 'Spanish',
    nativeLabel: 'Español',
  },
  [Language.Fr]: {
    label: 'French',
    nativeLabel: 'Français',
  },
  [Language.De]: {
    label: 'German',
    nativeLabel: 'Deutsch',
  },
  [Language.It]: {
    label: 'Italian',
    nativeLabel: 'Italiano',
  },
  [Language.Pl]: {
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
