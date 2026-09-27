// src/i18n.ts
// Локализация i18n административной панели Ijarauz (RU, UZ, EN)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './messages/ru.json';
import uz from './messages/uz.json';
import en from './messages/en.json';

export const resources = {
  ru: { translation: ru },
  uz: { translation: uz },
  en: { translation: en },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
