import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, SUPPORTED_UI_LANGUAGES } from './languages';
import { resources } from './resources';

i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LANGUAGE,
  lng: DEFAULT_LANGUAGE,
  resources,
  supportedLngs: SUPPORTED_UI_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
