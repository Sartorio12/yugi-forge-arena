import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationPT from "./locales/pt/translation.json";
import translationEN from "./locales/en/translation.json";
import translationES from "./locales/es/translation.json";

const resources = {
  pt: {
    translation: translationPT,
  },
  en: {
    translation: translationEN,
  },
  es: {
    translation: translationES,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pt", // Default language if detection fails
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
