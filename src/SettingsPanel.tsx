import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReaderSettings } from './types'
import { LOCALES } from './types'
import { useFocusTrap } from './hooks'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: ReaderSettings
  onChange: (s: Partial<ReaderSettings>) => void
  onGoHome?: () => void
}

export default function SettingsPanel({ open, onClose, settings, onChange, onGoHome }: SettingsPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap + body scroll lock
  useFocusTrap(open, panelRef)

  const setFontSize = (delta: number) => {
    const next = Math.round((settings.fontSize + delta) * 100) / 100
    if (next >= 0.8 && next <= 1.5) onChange({ fontSize: next })
  }

  return (
    <>
      <div
        className={`settings-backdrop ${open ? 'settings-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div ref={panelRef} className={`settings-panel ${open ? 'settings-panel--open' : ''}`}>
        <div className="settings-handle" />

        {/* Language */}
        <div className="settings-row">
          <span className="settings-label">{t('settings.language')}</span>
          <div className="language-options">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                className={`language-btn ${settings.locale === loc.code ? 'language-btn--active' : ''}`}
                onClick={() => onChange({ locale: loc.code })}
                dir={loc.dir}
                style={loc.fontFamily ? { fontFamily: loc.fontFamily } : undefined}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="settings-row">
          <span className="settings-label">{t('settings.fontSize')}</span>
          <div className="font-size-controls">
            <button className="font-btn" onClick={() => setFontSize(-0.05)} aria-label={t('settings.reduce')}>A-</button>
            <span className="font-size-value">{Math.round(settings.fontSize * 100)}%</span>
            <button className="font-btn" onClick={() => setFontSize(0.05)} aria-label={t('settings.enlarge')}>A+</button>
          </div>
        </div>

        {/* Theme */}
        <div className="settings-row">
          <span className="settings-label">{t('settings.theme')}</span>
          <div className="theme-options">
            <button
              className={`theme-btn theme-btn-light ${settings.theme === 'light' ? 'theme-btn--active' : ''}`}
              onClick={() => onChange({ theme: 'light' })}
              aria-label={t('settings.light')}
            />
            <button
              className={`theme-btn theme-btn-sepia ${settings.theme === 'sepia' ? 'theme-btn--active' : ''}`}
              onClick={() => onChange({ theme: 'sepia' })}
              aria-label={t('settings.sepia')}
            />
            <button
              className={`theme-btn theme-btn-dark ${settings.theme === 'dark' ? 'theme-btn--active' : ''}`}
              onClick={() => onChange({ theme: 'dark' })}
              aria-label={t('settings.dark')}
            />
          </div>
        </div>

        {/* Home button */}
        {onGoHome && (
          <div className="settings-row">
            <button
              className="landing-btn secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { onClose(); onGoHome() }}
            >
              {t('settings.home')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
