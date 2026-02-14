// ---- Data types (schéma canonique book.json) ----
// Pour toute langue/traduction : même structure et mêmes ids (TOC + chapters) ;
// seuls title et contenu des blocks sont traduits. Voir schemas/agpia-book.schema.json et schemas/README.md.

/** Entrée de la table des matières. id et arborescence (children) identiques dans toutes les langues ; seul title est traduit. */
export interface TocEntry {
  id: string
  title: string
  children?: TocEntry[]
}

/** Find the TOC entry title for a given chapter id (searches recursively). */
export function getTocTitle(toc: TocEntry[], id: string): string | null {
  for (const e of toc) {
    if (e.id === id) return e.title
    if (e.children) {
      const t = getTocTitle(e.children, id)
      if (t) return t
    }
  }
  return null
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'verse' | 'instruction' | 'doxology' | 'doxology_block' | 'image' | 'figure' | 'separator' | 'blank'
  level?: number
  text?: string
  src?: string
  caption?: string
  children?: ContentBlock[]
}

/** Chapitre. id et hourId identiques dans toutes les langues ; title et blocks sont traduits. */
export interface Chapter {
  id: string
  title: string
  hourId: string | null
  blocks: ContentBlock[]
}

/** Livre (book.json). toc et chapters ont la même structure et les mêmes ids pour toutes les langues. */
export interface AgpiaBook {
  metadata: { title: string; language: string }
  toc: TocEntry[]
  chapters: Chapter[]
}

// ---- Locale types ----

export type SupportedLocale = 'fr' | 'fr-apollos' | 'ar' | 'cop'

export interface LocaleVariant {
  code: SupportedLocale
  name: string
}

export interface LocaleConfig {
  code: SupportedLocale
  name: string           // name in its own language
  dir: 'ltr' | 'rtl'
  fontFamily?: string    // specific font for this locale
  variants?: LocaleVariant[]  // sub-choices shown when this locale is active
}

export const LOCALES: LocaleConfig[] = [
  { code: 'fr', name: 'Français', dir: 'ltr', variants: [
    { code: 'fr', name: 'Français' },
    { code: 'fr-apollos', name: 'Traduit du copte' },
  ]},
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'cop', name: 'Ⲙⲉⲧⲣⲉⲙⲛⲭⲏⲙⲓ', dir: 'ltr', fontFamily: 'Noto Sans Coptic' },
]

/** Check if a locale code is valid (top-level or variant). */
export function isValidLocale(code: string): boolean {
  return LOCALES.some(l => l.code === code || l.variants?.some(v => v.code === code))
}

/** Get the locale config for a code (returns parent config for variant codes). */
export function getLocaleConfig(code: string): LocaleConfig {
  const direct = LOCALES.find(l => l.code === code)
  if (direct) return direct
  const parent = LOCALES.find(l => l.variants?.some(v => v.code === code))
  return parent ?? LOCALES[0]
}

// ---- Storage keys ----

export const LAST_CHAPTER_KEY = 'agpia-last-chapter'
export const SETTINGS_KEY = 'agpia-settings'
export const LOCALE_KEY = 'agpia-locale'

// ---- Settings ----

export interface ReaderSettings {
  fontSize: number  // 0.8 – 1.5
  theme: 'light' | 'sepia' | 'dark'
  locale: SupportedLocale
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 1,
  theme: 'sepia',
  locale: 'fr',
}

// ---- Hours ----

export interface HourDef {
  id: string
  labelKey: string  // i18n translation key
  icon: string
  startHour: number  // 24h clock
  endHour: number
  isExtra?: boolean  // non-prayer-hour sections (absolutions, misc prayers)
}

export const HOURS: HourDef[] = [
  { id: 'dawn',           labelKey: 'hours.dawn',     icon: 'Ⲁ',  startHour: 6,  endHour: 9 },
  { id: 'third-hour',     labelKey: 'hours.3rd',      icon: 'Ⲃ',  startHour: 9,  endHour: 12 },
  { id: 'sixth-hour',     labelKey: 'hours.6th',      icon: 'Ⲅ',  startHour: 12, endHour: 15 },
  { id: 'ninth-hour',     labelKey: 'hours.9th',      icon: 'Ⲉ',  startHour: 15, endHour: 18 },
  { id: 'eleventh-hour',  labelKey: 'hours.11th',     icon: 'Ⲏ',  startHour: 18, endHour: 20 },
  { id: 'twelfth-hour',   labelKey: 'hours.12th',     icon: 'Ⲑ',  startHour: 20, endHour: 22 },
  { id: 'veil',           labelKey: 'hours.veil',     icon: 'Ⲓ',  startHour: 20, endHour: 22 },
  { id: 'midnight',       labelKey: 'hours.midnight', icon: 'Ⲱ',  startHour: 22, endHour: 6 },
]

export const EXTRA_SECTIONS: HourDef[] = [
  { id: 'intro',       labelKey: 'hours.intro',       icon: '✦', startHour: 0, endHour: 0, isExtra: true },
  { id: 'absolutions', labelKey: 'hours.absolutions', icon: '☩', startHour: 0, endHour: 0, isExtra: true },
  { id: 'prayers',     labelKey: 'hours.prayers',     icon: '♱', startHour: 0, endHour: 0, isExtra: true },
]

/** Get the current prayer hour based on time of day */
export function getCurrentHour(): HourDef | null {
  const h = new Date().getHours()
  for (const hour of HOURS) {
    if (hour.startHour < hour.endHour) {
      if (h >= hour.startHour && h < hour.endHour) return hour
    } else {
      // wraps midnight (e.g. 22–6)
      if (h >= hour.startHour || h < hour.endHour) return hour
    }
  }
  return null
}

/** Get the time-of-day greeting key for i18n */
export function getGreetingKey(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'greeting.morning'
  if (h >= 12 && h < 18) return 'greeting.afternoon'
  return 'greeting.evening'
}

/** Find hour labelKey for a given hourId (returns i18n key) */
export function getHourLabelKey(hourId: string | null): string | null {
  if (!hourId) return null
  const all = [...HOURS, ...EXTRA_SECTIONS]
  return all.find(h => h.id === hourId)?.labelKey ?? null
}

/** Get hour icon for a TOC entry id */
export function getHourIcon(tocId: string): string | null {
  const all = [...HOURS, ...EXTRA_SECTIONS]
  return all.find(h => h.id === tocId)?.icon ?? null
}
