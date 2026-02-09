import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgpiaBook, ReaderSettings } from './types'
import { DEFAULT_SETTINGS, LAST_CHAPTER_KEY, SETTINGS_KEY, getLocaleConfig, LOCALE_KEY, LOCALES } from './types'
import Landing from './Landing'
import Reader from './Reader'

const BOOK_URL = (locale: string) => `/agpia/${locale}/book.json`

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      const validLocale = LOCALES.some((l) => l.code === parsed.locale) ? parsed.locale : DEFAULT_SETTINGS.locale
      return { ...parsed, locale: validLocale }
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [book, setBook] = useState<AgpiaBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)

  // Load book based on current locale
  useEffect(() => {
    setBook(null)
    setError(null)
    const locale = settings.locale
    fetch(BOOK_URL(locale))
      .then((r) => {
        if (r.ok) return r.json()
        // Fallback to another locale if this book is not found
        return fetch(BOOK_URL('fr')).then(r2 => r2.ok ? r2.json() : Promise.reject(new Error(t('app.bookNotFound'))))
      })
      .then((data: AgpiaBook) => setBook((data)))
      .catch((e) => setError(e.message))
  }, [settings.locale, t])

  // Apply theme + locale direction
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    const localeConfig = getLocaleConfig(settings.locale)
    document.documentElement.setAttribute('dir', localeConfig.dir)
    document.documentElement.setAttribute('lang', settings.locale)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  // Sync i18n language with settings
  useEffect(() => {
    if (i18n.language !== settings.locale) {
      i18n.changeLanguage(settings.locale)
      localStorage.setItem(LOCALE_KEY, settings.locale)
    }
  }, [settings.locale, i18n])

  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [])

  const navigateTo = useCallback((id: string) => {
    if (!id) {
      setCurrentChapterId(null)
      return
    }
    setCurrentChapterId(id)
    try { localStorage.setItem(LAST_CHAPTER_KEY, id) } catch { /* ignore */ }
  }, [])

  if (error) {
    return (
      <div className="load-error-screen">
        <p className="load-error-title">{t('app.loadError')}</p>
        <p className="load-error-hint" dangerouslySetInnerHTML={{ __html: t('app.loadErrorHint') }} />
        <div className="load-error-languages">
          <span className="load-error-languages-label">{t('settings.language')}</span>
          <div className="language-options">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                type="button"
                className={`language-btn ${settings.locale === loc.code ? 'language-btn--active' : ''}`}
                onClick={() => updateSettings({ locale: loc.code })}
                dir={loc.dir}
                style={loc.fontFamily ? { fontFamily: loc.fontFamily } : undefined}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="app-loading">
        <div className="app-loading-inner">
          <div className="app-loading-icon" aria-hidden>☩</div>
          <div className="app-loading-text">{t('app.loading')}</div>
        </div>
      </div>
    )
  }

  if (!currentChapterId) {
    return (
      <Landing
        book={book}
        onNavigate={navigateTo}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    )
  }

  return (
    <Reader
      book={book}
      currentChapterId={currentChapterId}
      onNavigate={navigateTo}
      settings={settings}
      onSettingsChange={updateSettings}
    />
  )
}
