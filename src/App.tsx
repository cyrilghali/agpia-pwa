import { useEffect, useState, useCallback } from 'react'
import type { AgpiaBook, ReaderSettings } from './types'
import { DEFAULT_SETTINGS, LAST_CHAPTER_KEY, SETTINGS_KEY } from './types'
import Landing from './Landing'
import Reader from './Reader'

const BOOK_URL = '/agpia/book.json'

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export default function App() {
  const [book, setBook] = useState<AgpiaBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)

  // Load book
  useEffect(() => {
    fetch(BOOK_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Livre introuvable')))
      .then(setBook)
      .catch((e) => setError(e.message))
  }, [])

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

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
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ marginBottom: '0.5rem' }}>Chargement impossible.</p>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
          Exécutez <code>npm run build:data</code> puis relancez.
        </p>
      </div>
    )
  }

  if (!book) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>☩</div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem' }}>Chargement…</div>
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
