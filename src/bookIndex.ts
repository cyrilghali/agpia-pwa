import type { AgpiaBook, TocEntry, Chapter } from './types'

/** Pre-computed lookup maps for O(1) access to book data. */
export interface BookIndex {
  /** O(1) chapter lookup by id */
  chapterById: Map<string, Chapter>
  /** O(1) chapter array-index lookup by id */
  chapterIndexById: Map<string, number>
  /** O(1) TOC title lookup by chapter id */
  tocTitleById: Map<string, string>
  /** O(1) parent (top-level) section id lookup by chapter id */
  sectionIdByChapterId: Map<string, string>
  /** O(1) chapters grouped by hourId */
  chaptersByHour: Map<string, Chapter[]>
  /** O(1) hero chapter id lookup by TOC section id (sections with a separator hero page) */
  heroChapterIdBySectionId: Map<string, string>
}

/**
 * Build all lookup indices from a loaded book.
 * Called once when the book is loaded / changes; every subsequent lookup is O(1).
 */
export function buildBookIndex(book: AgpiaBook): BookIndex {
  // --- chapter maps ---
  const chapterById = new Map<string, Chapter>()
  const chapterIndexById = new Map<string, number>()
  const chaptersByHour = new Map<string, Chapter[]>()

  for (let i = 0; i < book.chapters.length; i++) {
    const ch = book.chapters[i]
    chapterById.set(ch.id, ch)
    chapterIndexById.set(ch.id, i)

    if (ch.hourId) {
      const list = chaptersByHour.get(ch.hourId)
      if (list) list.push(ch)
      else chaptersByHour.set(ch.hourId, [ch])
    }
  }

  // --- TOC title map (recursive) ---
  const tocTitleById = new Map<string, string>()

  function walkTocTitles(entries: TocEntry[]) {
    for (const e of entries) {
      tocTitleById.set(e.id, e.title)
      if (e.children) walkTocTitles(e.children)
    }
  }
  walkTocTitles(book.toc)

  // --- section id map: chapterId → top-level TOC section id ---
  const sectionIdByChapterId = new Map<string, string>()

  function walkSections(entries: TocEntry[], sectionId: string) {
    for (const e of entries) {
      sectionIdByChapterId.set(e.id, sectionId)
      if (e.children) walkSections(e.children, sectionId)
    }
  }
  for (const section of book.toc) {
    // The top-level section maps to itself
    sectionIdByChapterId.set(section.id, section.id)
    if (section.children) walkSections(section.children, section.id)
  }

  // --- hero chapter map: sectionId → hero chapter id (first block is separator) ---
  const heroChapterIdBySectionId = new Map<string, string>()
  for (const ch of book.chapters) {
    if (ch.hourId && ch.blocks[0]?.type === 'separator') {
      heroChapterIdBySectionId.set(ch.hourId, ch.id)
    }
  }

  return {
    chapterById,
    chapterIndexById,
    tocTitleById,
    sectionIdByChapterId,
    chaptersByHour,
    heroChapterIdBySectionId,
  }
}
