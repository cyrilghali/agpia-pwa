import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgpiaBook } from './types'
import { getHourLabelKey } from './types'
import { useFocusTrap } from './hooks'

interface SearchPanelProps {
  open: boolean
  onClose: () => void
  book: AgpiaBook
  onSelect: (chapterId: string) => void
}

interface SearchResult {
  chapterId: string
  chapterTitle: string
  hourLabel: string | null
  snippet: string
}

export default function SearchPanel({ open, onClose, book, onSelect }: SearchPanelProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useFocusTrap(open, panelRef)

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Build a flat search index once
  const searchIndex = useMemo(() => {
    return book.chapters.map((ch) => {
      const textParts: string[] = [ch.title]
      for (const b of ch.blocks) {
        if (b.text) textParts.push(b.text)
        if (b.children) {
          for (const c of b.children) {
            if (c.text) textParts.push(c.text)
          }
        }
      }
      return {
        id: ch.id,
        title: ch.title,
        hourId: ch.hourId,
        fullText: textParts.join(' '),
      }
    })
  }, [book.chapters])

  const performSearch = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    const lower = q.toLowerCase()
    // Remove markdown-like formatting for matching
    const normalize = (s: string) => s.replace(/\*\*/g, '').replace(/_/g, '').replace(/⟨\d+⟩/g, '').toLowerCase()

    const found: SearchResult[] = []

    for (const entry of searchIndex) {
      const normalized = normalize(entry.fullText)
      const idx = normalized.indexOf(lower)
      if (idx === -1) continue

      // Extract a snippet around the match
      const rawText = entry.fullText.replace(/\*\*/g, '').replace(/_/g, '').replace(/⟨\d+⟩/g, '')
      const start = Math.max(0, idx - 40)
      const end = Math.min(rawText.length, idx + q.length + 40)
      const snippet = (start > 0 ? '…' : '') + rawText.slice(start, end).trim() + (end < rawText.length ? '…' : '')

      const hourKey = getHourLabelKey(entry.hourId)
      found.push({
        chapterId: entry.id,
        chapterTitle: entry.title,
        hourLabel: hourKey ? t(hourKey) : null,
        snippet,
      })

      if (found.length >= 30) break
    }

    setResults(found)
  }, [searchIndex, t])

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(value), 300)
  }, [performSearch])

  const handleSelect = useCallback((chapterId: string) => {
    onSelect(chapterId)
    onClose()
  }, [onSelect, onClose])

  return (
    <>
      <div
        className={`search-backdrop ${open ? 'search-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div ref={panelRef} className={`search-panel ${open ? 'search-panel--open' : ''}`}>
        <div className="search-handle" />

        <div className="search-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }} aria-label={t('search.clear')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="search-results">
          {query.length >= 2 && results.length === 0 && (
            <div className="search-empty">{t('search.noResults', { query })}</div>
          )}
          {results.map((r, i) => (
            <button key={`${r.chapterId}-${i}`} className="search-result" onClick={() => handleSelect(r.chapterId)}>
              <div className="search-result-title">
                {r.chapterTitle}
                {r.hourLabel && <span className="search-result-hour">{r.hourLabel}</span>}
              </div>
              <div className="search-result-snippet">
                <HighlightText text={r.snippet} query={query} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  const lower = query.toLowerCase()
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower
          ? <mark key={i} className="search-highlight">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}
