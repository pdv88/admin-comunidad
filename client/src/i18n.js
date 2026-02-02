import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationESMX from './locales/es-MX/translation.json';
import translationESES from './locales/es-ES/translation.json';

const resources = {
    en: {
        translation: translationEN,
    },

    'es-MX': {
        translation: translationESMX,
    },
    'es-ES': {
        translation: translationESES,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'es-ES',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
