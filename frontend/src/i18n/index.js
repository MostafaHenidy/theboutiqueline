import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';
import boutiqueAr from './boutique.ar.json';
import boutiqueEn from './boutique.en.json';

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: { ...ar, ...boutiqueAr } },
    en: { translation: { ...en, ...boutiqueEn } },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
