/**
 * Normalize book.json: remove global intro (part001), add per-hour Introduction
 * as first child in TOC and as a chapter before each hour's first chapter.
 * Run from repo root: node scripts/normalize-book.js [path/to/book.json ...]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIRST_CHAPTER_IDS = new Set([
  'part003', 'part036', 'part053', 'part072', 'part089', 'part106', 'part124', 'part127'
])

const INTRO_TITLE_BY_LANG = {
  en: 'Introduction',
  fr: 'Introduction',
  ar: 'مقدمة',
  de: 'Einleitung',
  it: 'Introduzione',
  cop: 'Ⲙⲉⲧⲣⲉⲙⲛⲭⲏⲙⲓ',
}

function normalizeBook(book) {
  const toc = book.toc.filter((e) => e.id !== 'part001')
  const introChapter = book.chapters.find((c) => c.id === 'part001')
  const introBlocks = introChapter
    ? (introChapter.blocks || []).filter(
        (b) =>
          b.type === 'heading' ||
          b.type === 'paragraph' ||
          b.type === 'instruction'
      )
    : []
  const lang = book.metadata?.language ?? 'en'
  const introTitle = INTRO_TITLE_BY_LANG[lang] ?? 'Introduction'

  const newToc = toc.map((entry) => {
    if (
      entry.children &&
      entry.children.length > 0 &&
      introBlocks.length > 0 &&
      FIRST_CHAPTER_IDS.has(entry.id)
    ) {
      const existing = entry.children.filter((c) => c.id !== 'part001')
      const first = existing[0]
      const isExistingIntro =
        first &&
        first.id === entry.id &&
        /introduction|intro\s*(to|de|of)?/i.test(first.title || '')
      const children = [
        { id: `${entry.id}-intro`, title: introTitle },
        ...(isExistingIntro ? existing.slice(1) : existing),
      ]
      return { ...entry, children }
    }
    return entry
  })

  const newChapters = []
  for (const ch of book.chapters) {
    if (ch.id === 'part001') continue
    const isFirstChapterOfHour = FIRST_CHAPTER_IDS.has(ch.id)
    const isBookIntroChapter =
      isFirstChapterOfHour &&
      /introduction|intro\s*(to|de|of)?/i.test(ch.title || '')
    if (introBlocks.length > 0 && isFirstChapterOfHour) {
      newChapters.push({
        id: `${ch.id}-intro`,
        title: introTitle,
        hourId: ch.hourId ?? ch.id,
        blocks: [...introBlocks],
      })
    }
    if (isBookIntroChapter) continue
    newChapters.push(ch)
  }

  return {
    ...book,
    toc: newToc,
    chapters: newChapters,
  }
}

function main() {
  const args = process.argv.slice(2)
  const root = path.resolve(__dirname, '..')
  const defaultPaths = [
    path.join(root, 'public/agpia/en/book.json'),
    path.join(root, 'public/agpia/fr/book.json'),
  ]
  const paths = args.length > 0 ? args.map((p) => path.resolve(p)) : defaultPaths

  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) {
      console.warn('Skip (not found):', filePath)
      continue
    }
    console.log('Normalize:', filePath)
    const raw = fs.readFileSync(filePath, 'utf8')
    const book = JSON.parse(raw)
    const normalized = normalizeBook(book)
    fs.writeFileSync(filePath, JSON.stringify(normalized), 'utf8')
  }
  console.log('Done.')
}

main()
