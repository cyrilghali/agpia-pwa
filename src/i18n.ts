import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import fr from './locales/fr.json'
import ar from './locales/ar.json'
import de from './locales/de.json'
import it from './locales/it.json'
import cop from './locales/cop.json'

export const SUPPORTED_LOCALES = ['fr', 'ar', 'de', 'it', 'cop'] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
      de: { translation: de },
      it: { translation: it },
      cop: { translation: cop },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'agpia-locale',
      caches: ['localStorage'],
    },
  })

export default i18n
