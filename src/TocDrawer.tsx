import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TocEntry } from './types'
import { getHourIcon } from './types'
import { useFocusTrap } from './hooks'

/** Title case for English TOC (e.g. "THE LORD'S PRAYER" → "The Lord's Prayer") */
function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface TocDrawerProps {
  open: boolean
  onClose: () => void
  toc: TocEntry[]
  currentChapterId: string
  onSelect: (id: string) => void
}

export default function TocDrawer({ open, onClose, toc, currentChapterId, onSelect }: TocDrawerProps) {
  const { t, i18n } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const titleForToc = (title: string) => (i18n.language === 'en' ? toTitleCase(title) : title)

  // Focus trap + body scroll lock
  useFocusTrap(open, drawerRef)

  // Find which section contains the current chapter
  const currentSectionId = findSectionForChapter(toc, currentChapterId)

  // Auto-scroll to active item when drawer opens
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const el = bodyRef.current?.querySelector('.toc-child-btn--active, .toc-section-header--active')
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 350) // wait for drawer animation
    return () => clearTimeout(timer)
  }, [open])

  return (
    <>
      <div
        className={`toc-backdrop ${open ? 'toc-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        ref={drawerRef}
        className={`toc-drawer ${open ? 'toc-drawer--open' : ''}`}
        aria-label={t('toc.title')}
        aria-hidden={!open}
      >
        <div className="toc-header">
          <h2 className="toc-title">{t('toc.title')}</h2>
          <button className="toc-close" onClick={onClose} aria-label={t('toc.close')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="toc-body" ref={bodyRef}>
          {toc.map((entry) => (
            <TocSection
              key={entry.id}
              entry={entry}
              currentChapterId={currentChapterId}
              currentSectionId={currentSectionId}
              onSelect={onSelect}
              titleForToc={titleForToc}
            />
          ))}
        </div>
      </aside>
    </>
  )
}

function TocSection({ entry, currentChapterId, currentSectionId, onSelect, titleForToc }: {
  entry: TocEntry
  currentChapterId: string
  currentSectionId: string | null
  onSelect: (id: string) => void
  titleForToc: (title: string) => string
}) {
  const isCurrentSection = entry.id === currentSectionId
  const isDirectlyActive = entry.id === currentChapterId
  const hasChildren = entry.children && entry.children.length > 0

  // Auto-expand if this section contains the current chapter
  const [expanded, setExpanded] = useState(isCurrentSection)

  // Re-expand if current chapter changes into this section
  useEffect(() => {
    if (isCurrentSection) setExpanded(true)
  }, [isCurrentSection])

  const hourIcon = getHourIcon(entry.id)

  return (
    <div className="toc-section">
      <button
        className={`toc-section-header ${isDirectlyActive || isCurrentSection ? 'toc-section-header--active' : ''}`}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          else onSelect(entry.id)
        }}
      >
        <span className="toc-section-icon">{hourIcon ?? '·'}</span>
        <span>{titleForToc(entry.title)}</span>
        {hasChildren && (
          <span className={`toc-section-chevron ${expanded ? 'toc-section-chevron--open' : ''}`}>▸</span>
        )}
      </button>

      {hasChildren && expanded && (
        <div className="toc-children">
          {entry.children!.map((child) => (
            <TocChild
              key={child.id}
              entry={child}
              currentChapterId={currentChapterId}
              onSelect={onSelect}
              titleForToc={titleForToc}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TocChild({ entry, currentChapterId, onSelect, titleForToc }: {
  entry: TocEntry
  currentChapterId: string
  onSelect: (id: string) => void
  titleForToc: (title: string) => string
}) {
  const isActive = entry.id === currentChapterId
  const [expanded, setExpanded] = useState(false)
  const hasChildren = entry.children && entry.children.length > 0

  if (!hasChildren) {
    return (
      <button
        className={`toc-child-btn ${isActive ? 'toc-child-btn--active' : ''}`}
        onClick={() => onSelect(entry.id)}
      >
        {titleForToc(entry.title)}
      </button>
    )
  }

  return (
    <>
      <button
        className={`toc-child-btn ${isActive ? 'toc-child-btn--active' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ marginInlineEnd: '0.3rem', fontSize: '0.7em' }}>{expanded ? '▾' : '▸'}</span>
        {titleForToc(entry.title)}
      </button>
      {expanded && entry.children!.map((sub) => (
        <button
          key={sub.id}
          className={`toc-child-btn ${sub.id === currentChapterId ? 'toc-child-btn--active' : ''}`}
          style={{ paddingInlineStart: '3.5rem' }}
          onClick={() => onSelect(sub.id)}
        >
          {titleForToc(sub.title)}
        </button>
      ))}
    </>
  )
}

/** Find which top-level TOC section contains a given chapter ID */
function findSectionForChapter(toc: TocEntry[], chapterId: string): string | null {
  for (const section of toc) {
    if (section.id === chapterId) return section.id
    if (section.children) {
      for (const child of section.children) {
        if (child.id === chapterId) return section.id
        if (child.children) {
          for (const sub of child.children) {
            if (sub.id === chapterId) return section.id
          }
        }
      }
    }
  }
  return null
}
