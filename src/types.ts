// ---- Data types ----

export interface TocEntry {
  title: string
  id: string
  children?: TocEntry[]
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'verse' | 'instruction' | 'doxology' | 'doxology_block' | 'image' | 'figure' | 'separator' | 'blank'
  level?: number
  text?: string
  src?: string
  caption?: string
  children?: ContentBlock[]
}

export interface Chapter {
  id: string
  title: string
  hourId: string | null
  blocks: ContentBlock[]
}

export interface AgpiaBook {
  metadata: { title: string; language: string }
  toc: TocEntry[]
  chapters: Chapter[]
}

// ---- Locale types ----

export type SupportedLocale = 'fr' | 'ar' | 'de' | 'it' | 'cop'

export interface LocaleConfig {
  code: SupportedLocale
  name: string           // name in its own language
  dir: 'ltr' | 'rtl'
  fontFamily?: string    // specific font for this locale
}

export const LOCALES: LocaleConfig[] = [
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'it', name: 'Italiano', dir: 'ltr' },
  { code: 'cop', name: 'Ⲙⲉⲧⲣⲉⲙⲛⲭⲏⲙⲓ', dir: 'ltr', fontFamily: 'Noto Sans Coptic' },
]

export function getLocaleConfig(code: string): LocaleConfig {
  return LOCALES.find(l => l.code === code) ?? LOCALES[0]
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
  { id: 'part003', labelKey: 'hours.dawn',     icon: '☀',  startHour: 6,  endHour: 9 },
  { id: 'part036', labelKey: 'hours.3rd',      icon: '◈',  startHour: 9,  endHour: 12 },
  { id: 'part053', labelKey: 'hours.6th',      icon: '◇',  startHour: 12, endHour: 15 },
  { id: 'part072', labelKey: 'hours.9th',      icon: '◆',  startHour: 15, endHour: 18 },
  { id: 'part089', labelKey: 'hours.11th',     icon: '☽',  startHour: 18, endHour: 20 },
  { id: 'part106', labelKey: 'hours.12th',     icon: '★',  startHour: 20, endHour: 22 },
  { id: 'part124', labelKey: 'hours.veil',     icon: '⛨',  startHour: 20, endHour: 22 },
  { id: 'part127', labelKey: 'hours.midnight', icon: '✧',  startHour: 22, endHour: 6 },
]

export const EXTRA_SECTIONS: HourDef[] = [
  { id: 'part001', labelKey: 'hours.intro',       icon: '✦', startHour: 0, endHour: 0, isExtra: true },
  { id: 'part142', labelKey: 'hours.absolutions', icon: '☩', startHour: 0, endHour: 0, isExtra: true },
  { id: 'part144', labelKey: 'hours.prayers',     icon: '♱', startHour: 0, endHour: 0, isExtra: true },
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
