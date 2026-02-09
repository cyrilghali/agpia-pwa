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

// ---- Settings ----

export interface ReaderSettings {
  fontSize: number  // 0.8 – 1.5
  theme: 'light' | 'sepia' | 'dark'
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 1,
  theme: 'sepia'
}

// ---- Hours ----

export interface HourDef {
  id: string
  label: string
  icon: string
  startHour: number  // 24h clock
  endHour: number
  isExtra?: boolean  // non-prayer-hour sections (absolutions, misc prayers)
}

export const HOURS: HourDef[] = [
  { id: 'part003', label: 'Aube',       icon: '☀',  startHour: 6,  endHour: 9 },
  { id: 'part036', label: '3e heure',   icon: '◈',  startHour: 9,  endHour: 12 },
  { id: 'part053', label: '6e heure',   icon: '◇',  startHour: 12, endHour: 15 },
  { id: 'part072', label: '9e heure',   icon: '◆',  startHour: 15, endHour: 18 },
  { id: 'part089', label: '11e heure',  icon: '☽',  startHour: 18, endHour: 20 },
  { id: 'part106', label: '12e heure',  icon: '★',  startHour: 20, endHour: 22 },
  { id: 'part124', label: 'Voile',      icon: '⛨',  startHour: 20, endHour: 22 },
  { id: 'part127', label: 'Minuit',     icon: '✧',  startHour: 22, endHour: 6 },
]

export const EXTRA_SECTIONS: HourDef[] = [
  { id: 'part001', label: 'Introduction',  icon: '✦', startHour: 0, endHour: 0, isExtra: true },
  { id: 'part142', label: 'Absolutions',   icon: '☩', startHour: 0, endHour: 0, isExtra: true },
  { id: 'part144', label: 'Prières',       icon: '♱', startHour: 0, endHour: 0, isExtra: true },
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

/** Get the time-of-day greeting in French */
export function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/** Find hour label for a given hourId */
export function getHourLabel(hourId: string | null): string | null {
  if (!hourId) return null
  const all = [...HOURS, ...EXTRA_SECTIONS]
  return all.find(h => h.id === hourId)?.label ?? null
}

/** Get hour icon for a TOC entry id */
export function getHourIcon(tocId: string): string | null {
  const all = [...HOURS, ...EXTRA_SECTIONS]
  return all.find(h => h.id === tocId)?.icon ?? null
}
