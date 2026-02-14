/**
 * Schéma commun à toutes les langues (fichiers de traduction i18n).
 * Chaque fichier dans locales/*.json doit respecter cette structure.
 * Les clés avec interpolation (ex: {{hour}}, {{query}}) restent des string.
 */
export interface Translations {
  app: {
    loading: string
    loadError: string
    loadErrorHint: string
    bookNotFound: string
  }
  landing: {
    subtitle: string
    hoursSection: string
    nowBadge: string
    pray: string
    continue: string
    start: string
    search: string
    options: string
  }
  greeting: {
    morning: string
    afternoon: string
    evening: string
  }
  reader: {
    toc: string
    search: string
    options: string
    nav: string
    prev: string
    next: string
    prevFull: string
    nextFull: string
    fallbackTitle: string
  }
  settings: {
    fontSize: string
    reduce: string
    enlarge: string
    theme: string
    light: string
    sepia: string
    dark: string
    home: string
    language: string
    variant: string
  }
  search: {
    placeholder: string
    clear: string
    noResults: string
  }
  toc: {
    title: string
    close: string
  }
  hours: {
    dawn: string
    '3rd': string
    '6th': string
    '9th': string
    '11th': string
    '12th': string
    veil: string
    midnight: string
    intro: string
    absolutions: string
    prayers: string
    oraisons: string
  }
}
