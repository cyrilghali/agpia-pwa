import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { AgpiaBook, ReaderSettings, Chapter } from './types'
import { getHourLabel } from './types'
import ContentBlock, { SeparatorHero } from './ContentBlock'
import TocDrawer from './TocDrawer'
import SettingsPanel from './SettingsPanel'
import SearchPanel from './SearchPanel'
import { useThrottledCallback } from './hooks'

interface ReaderProps {
  book: AgpiaBook
  currentChapterId: string
  onNavigate: (id: string) => void
  settings: ReaderSettings
  onSettingsChange: (s: Partial<ReaderSettings>) => void
}

export default function Reader({ book, currentChapterId, onNavigate, settings, onSettingsChange }: ReaderProps) {
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const contentRef = useRef<HTMLDivElement>(null)
  const prevChapterRef = useRef<string | null>(null)

  // Build a flat chapter index
  const chapterIndex = useMemo(() => {
    const map = new Map<string, number>()
    book.chapters.forEach((ch, i) => map.set(ch.id, i))
    return map
  }, [book.chapters])

  const currentIndex = chapterIndex.get(currentChapterId) ?? 0
  const currentChapter = book.chapters[currentIndex]
  const hourLabel = getHourLabel(currentChapter?.hourId)

  const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null

  const [scrollFraction, setScrollFraction] = useState(0)

  // Blended progress: chapter index + scroll within chapter
  const progress = book.chapters.length > 1
    ? (currentIndex + scrollFraction) / book.chapters.length
    : 0

  // Scroll to top on chapter change (fix: clear saved scroll so restore doesn't fight)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    // Determine direction
    const prevId = prevChapterRef.current
    if (prevId) {
      const prevIdx = chapterIndex.get(prevId) ?? 0
      setDirection(currentIndex >= prevIdx ? 'forward' : 'back')
    }
    prevChapterRef.current = currentChapterId

    // Always scroll to top on chapter change
    el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setScrollFraction(0)
    // Clear any saved scroll for this chapter so it doesn't restore
    sessionStorage.removeItem(`agpia-scroll-${currentChapterId}`)
  }, [currentChapterId, chapterIndex, currentIndex])

  // Throttled scroll handler: persist position + update scroll fraction
  const handleContentScroll = useThrottledCallback(() => {
    const el = contentRef.current
    if (!el) return
    const key = `agpia-scroll-${currentChapterId}`
    sessionStorage.setItem(key, String(el.scrollTop))
    const maxScroll = el.scrollHeight - el.clientHeight
    setScrollFraction(maxScroll > 0 ? el.scrollTop / maxScroll : 0)
  }, 200, [currentChapterId])

  // Attach scroll listener
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.addEventListener('scroll', handleContentScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleContentScroll)
  }, [handleContentScroll])

  // Navigation with haptic
  const navigateTo = useCallback((id: string) => {
    try { navigator.vibrate?.(10) } catch { /* ignore */ }
    onNavigate(id)
  }, [onNavigate])

  // Touch swipe navigation (with edge guard to avoid iOS back/forward gesture)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEdge = useRef(false)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX
    touchStartX.current = x
    touchStartY.current = e.touches[0].clientY
    touchEdge.current = x < 20 || x > window.innerWidth - 20
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchEdge.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && prevChapter) navigateTo(prevChapter.id)
      else if (dx < 0 && nextChapter) navigateTo(nextChapter.id)
    }
  }, [prevChapter, nextChapter, navigateTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevChapter) navigateTo(prevChapter.id)
      if (e.key === 'ArrowRight' && nextChapter) navigateTo(nextChapter.id)
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
        else if (tocOpen) setTocOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevChapter, nextChapter, navigateTo, tocOpen, settingsOpen])

  const animClass = direction === 'forward' ? 'slide-in-right' : 'slide-in-left'

  return (
    <div className="reader">
      {/* Progress bar */}
      <div className="reader-progress" style={{ width: `${progress * 100}%` }} />

      {/* Top bar */}
      <header className="reader-bar">
        <button className="reader-menu-btn" onClick={() => setTocOpen(true)} aria-label="Table des matières">
          <MenuIcon />
        </button>
        <div className="reader-bar-center">
          {hourLabel && <span className="reader-bar-hour">{hourLabel}</span>}
          <span className="reader-bar-title">{currentChapter?.title ?? 'AGPIA'}</span>
        </div>
        <button className="reader-menu-btn" onClick={() => setSearchOpen(true)} aria-label="Rechercher">
          <SearchIcon />
        </button>
        <button className="reader-settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Options">
          <TextIcon />
        </button>
      </header>

      {/* Content */}
      <div
        className="reader-content"
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`chapter-container ${animClass}`} key={currentChapterId}>
          <RenderChapter chapter={currentChapter} fontSize={settings.fontSize} />
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="reader-nav" aria-label="Navigation">
        <button
          className="nav-btn"
          disabled={!prevChapter}
          onClick={() => prevChapter && navigateTo(prevChapter.id)}
          aria-label="Précédent"
        >
          <ChevronLeft />
          <span className="nav-label">Préc.</span>
        </button>
        <span className="nav-position">{Math.round(progress * 100)}%</span>
        <button
          className="nav-btn"
          disabled={!nextChapter}
          onClick={() => nextChapter && navigateTo(nextChapter.id)}
          aria-label="Suivant"
        >
          <span className="nav-label">Suiv.</span>
          <ChevronRight />
        </button>
      </nav>

      {/* Drawers */}
      <TocDrawer
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        toc={book.toc}
        currentChapterId={currentChapterId}
        onSelect={(id) => { navigateTo(id); setTocOpen(false) }}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={onSettingsChange}
        onGoHome={() => { window.scrollTo(0, 0); onNavigate('') }}
      />
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        book={book}
        onSelect={(id) => { navigateTo(id); setSearchOpen(false) }}
      />
    </div>
  )
}

function RenderChapter({ chapter, fontSize }: { chapter: Chapter; fontSize: number }) {
  if (!chapter) return null

  // If chapter starts with a separator block, render as hero
  const isSeparator = chapter.blocks[0]?.type === 'separator'

  if (isSeparator) {
    return (
      <>
        <SeparatorHero blocks={chapter.blocks} fontSize={fontSize} />
        <div className="chapter-divider" aria-hidden>☩</div>
      </>
    )
  }

  return (
    <>
      {chapter.blocks.map((block, i) => (
        <ContentBlock key={i} block={block} fontSize={fontSize} />
      ))}
      <div className="chapter-divider" aria-hidden>☩</div>
    </>
  )
}

// Icons
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}
