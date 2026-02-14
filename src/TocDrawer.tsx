import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TocEntry } from './types'
import { getHourIcon } from './types'
import { useFocusTrap } from './hooks'

interface TocDrawerProps {
  open: boolean
  onClose: () => void
  toc: TocEntry[]
  currentChapterId: string
  /** Pre-computed top-level section id for the current chapter (from BookIndex) */
  currentSectionId: string | null
  onSelect: (id: string) => void
}

export default function TocDrawer({ open, onClose, toc, currentChapterId, currentSectionId, onSelect }: TocDrawerProps) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  // Focus trap + body scroll lock
  useFocusTrap(open, drawerRef)

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
            />
          ))}
        </div>
      </aside>
    </>
  )
}

function TocSection({ entry, currentChapterId, currentSectionId, onSelect }: {
  entry: TocEntry
  currentChapterId: string
  currentSectionId: string | null
  onSelect: (id: string) => void
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
  const firstChildId = hasChildren ? entry.children![0].id : entry.id

  return (
    <div className="toc-section">
      <div className={`toc-section-header ${isDirectlyActive || isCurrentSection ? 'toc-section-header--active' : ''}`}>
        <button className="toc-section-nav" onClick={() => onSelect(firstChildId)}>
          <span className="toc-section-icon">{hourIcon ?? '·'}</span>
          <span>{entry.title}</span>
        </button>
        {hasChildren && (
          <button
            className="toc-section-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <span className={`toc-section-chevron ${expanded ? 'toc-section-chevron--open' : ''}`}>▸</span>
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="toc-children">
          {entry.children!.map((child) => (
            <TocChild
              key={child.id}
              entry={child}
              currentChapterId={currentChapterId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TocChild({ entry, currentChapterId, onSelect }: {
  entry: TocEntry
  currentChapterId: string
  onSelect: (id: string) => void
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
        {entry.title}
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
        {entry.title}
      </button>
      {expanded && entry.children!.map((sub) => (
        <button
          key={sub.id}
          className={`toc-child-btn ${sub.id === currentChapterId ? 'toc-child-btn--active' : ''}`}
          style={{ paddingInlineStart: '3.5rem' }}
          onClick={() => onSelect(sub.id)}
        >
          {sub.title}
        </button>
      ))}
    </>
  )
}

