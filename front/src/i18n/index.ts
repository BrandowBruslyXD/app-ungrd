import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '@/locales/es.json';

export const i18nReady = i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  initImmediate: false,
  resources: {
    es: { translation: es },
  },
});

export default i18n;
