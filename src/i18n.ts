import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { LOCALES } from './types'
import type { Translations } from './locales/schema'

import frJson from './locales/fr.json'
import arJson from './locales/ar.json'
import deJson from './locales/de.json'
import itJson from './locales/it.json'
import copJson from './locales/cop.json'

// Compile-time check: each locale must satisfy the shared schema
const fr: Translations = frJson
const ar: Translations = arJson
const de: Translations = deJson
const it: Translations = itJson
const cop: Translations = copJson

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
    supportedLngs: LOCALES.map(l => l.code),
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
