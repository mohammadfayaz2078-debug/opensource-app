import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language files
import en from './locales/en.json';
import fa from './locales/fa.json';
import ps from './locales/ps.json';

// Get saved language from localStorage
const savedLang = localStorage.getItem('lang') || 'en';

// Function to set document direction based on language
export function setDirection(lang) {
  const rtlLanguages = ['fa', 'ps', 'ar', 'he', 'ur'];
  const rtl = rtlLanguages.includes(lang);
  
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  
  // Add/remove classes for styling
  if (document.body) {
    document.body.classList.toggle('rtl', rtl);
    document.body.classList.toggle('ltr', !rtl);
  }
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa },
      ps: { translation: ps }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from XSS
    },
    react: {
      useSuspense: false // This prevents loading suspense issues
    }
  });

// Set initial direction
if (typeof document !== 'undefined') {
  setDirection(savedLang);
}

export default i18n;