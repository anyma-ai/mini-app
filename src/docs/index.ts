import privacyPolicyEn from './privacy-policy-en.md?raw';
import privacyPolicyRu from './privacy-policy-ru.md?raw';
import userAgreementEn from './user-agreement-en.md?raw';
import userAgreementRu from './user-agreement-ru.md?raw';

export const DOC_LANGS = ['ru', 'en'] as const;
export type DocLang = (typeof DOC_LANGS)[number];
export type LegalDocId = 'privacy-policy' | 'user-agreement';

type LegalDoc = { title: string; body: string };

export const LEGAL_DOCS: Record<LegalDocId, Record<DocLang, LegalDoc>> = {
  'privacy-policy': {
    ru: { title: 'Политика конфиденциальности', body: privacyPolicyRu },
    en: { title: 'Privacy Policy', body: privacyPolicyEn },
  },
  'user-agreement': {
    ru: { title: 'Пользовательское соглашение', body: userAgreementRu },
    en: { title: 'User Agreement', body: userAgreementEn },
  },
};

/** Accepts `ru`, `en` and `eng`; returns null for anything else. */
export function parseDocLang(value: string | undefined): DocLang | null {
  const lang = value?.toLowerCase();
  if (lang === 'ru') return 'ru';
  if (lang === 'en' || lang === 'eng') return 'en';
  return null;
}

export function detectDocLang(): DocLang {
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/** URL segment used when we build links: `/privacy-policy/ru`, `/privacy-policy/eng`. */
const DOC_LANG_SLUG: Record<DocLang, string> = { ru: 'ru', en: 'eng' };

export function getLegalDocPath(id: LegalDocId, lang: DocLang): string {
  return `/${id}/${DOC_LANG_SLUG[lang]}`;
}
