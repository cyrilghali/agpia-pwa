import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgpiaBook, ReaderSettings } from './types'
import { HOURS, EXTRA_SECTIONS, getCurrentHour, getGreetingKey, getHourLabelKey, LAST_CHAPTER_KEY } from './types'
import SettingsPanel from './SettingsPanel'
import SearchPanel from './SearchPanel'


interface LandingProps {
  book: AgpiaBook
  onNavigate: (id: string) => void
  settings: ReaderSettings
  onSettingsChange: (s: Partial<ReaderSettings>) => void
}

export default function Landing({ book, onNavigate, settings, onSettingsChange }: LandingProps) {
  const { t } = useTranslation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const [currentHour, setCurrentHour] = useState(() => getCurrentHour())
  const [greetingKey, setGreetingKey] = useState(() => getGreetingKey())

  // Re-compute greeting & current hour when the user returns to the app
  const refreshTimeState = useCallback(() => {
    setCurrentHour(getCurrentHour())
    setGreetingKey(getGreetingKey())
  }, [])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refreshTimeState()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refreshTimeState])

  const lastId = useMemo(() => {
    try {
      const id = localStorage.getItem(LAST_CHAPTER_KEY)
      return id && book.chapters.some((c) => c.id === id) ? id : null
    } catch { return null }
  }, [book.chapters])

  const lastChapter = lastId ? book.chapters.find(c => c.id === lastId) : null
  const lastHourLabelKey = lastChapter ? getHourLabelKey(lastChapter.hourId) : null

  return (
    <div className="landing">
      <div className="landing-cover">
        <img src="/agpia/assets/cover.png" alt={book.metadata.title} />
      </div>

      <h1 className="landing-title">{book.metadata.title}</h1>
      <p className="landing-subtitle">{t('landing.subtitle')}</p>
      <p className="landing-greeting">
        {t(greetingKey)}
        {currentHour && <> — {t(currentHour.labelKey)}</>}
      </p>

      {/* Main prayer hours — 4 columns */}
      <div className="hours-section-label">{t('landing.hoursSection')}</div>
      <div className="hours-grid">
        {HOURS.map((h) => (
          <button
            key={h.id}
            className={`hour-card ${currentHour?.id === h.id ? 'hour-card--current' : ''}`}
            onClick={() => onNavigate(h.id)}
          >
            {currentHour?.id === h.id && <span className="hour-card-badge">{t('landing.nowBadge')}</span>}
            <span className="hour-icon">{h.icon}</span>
            <span className="hour-label">{t(h.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Extra sections — 3 columns */}
      <div className="hours-grid-extras">
        {EXTRA_SECTIONS.map((h) => (
          <button
            key={h.id}
            className="hour-card"
            onClick={() => onNavigate(h.id)}
          >
            <span className="hour-icon">{h.icon}</span>
            <span className="hour-label">{t(h.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="landing-actions">
        {currentHour && (
          <button className="landing-btn primary" onClick={() => onNavigate(currentHour.id)}>
            {currentHour.icon} {t('landing.pray', { hour: t(currentHour.labelKey) })}
          </button>
        )}
        {lastChapter && lastChapter.hourId !== currentHour?.id && (
          <button className="landing-btn secondary" onClick={() => onNavigate(lastChapter.id)}>
            {t('landing.continue')}
            <span className="continue-detail">
              — {lastChapter.title}{lastHourLabelKey ? ` (${t(lastHourLabelKey)})` : ''}
            </span>
          </button>
        )}
        {!currentHour && !lastChapter && (
          <button className="landing-btn" onClick={() => onNavigate(book.chapters[0]?.id ?? 'part001')}>
            {t('landing.start')}
          </button>
        )}
      </div>

      {/* Bottom links */}
      <div className="landing-settings-row">
        <button className="landing-settings-btn" onClick={() => setSearchOpen(true)}>
          <LandingSearchIcon /> {t('landing.search')}
        </button>
        <button className="landing-settings-btn" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon /> {t('landing.options')}
        </button>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={onSettingsChange} />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} book={book} onSelect={(id) => { onNavigate(id); setSearchOpen(false) }} />
    </div>
  )
}

function LandingSearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
