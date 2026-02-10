// ---- Shared library for skeleton / strings / merge operations ----
// Key scheme (flat dot-separated paths):
//   metadata.title, metadata.language
//   toc.<id-path>.title          (id-path = chain of ids from root)
//   chapters.<chapterId>.title
//   chapters.<chapterId>.blocks.<i>.text
//   chapters.<chapterId>.blocks.<i>.caption
//   chapters.<chapterId>.blocks.<i>.children.<j>.text   (recursive)

// ---------------------------------------------------------------------------
// Extract: book.json → flat strings map
// ---------------------------------------------------------------------------

/** @param {object} book  Full AgpiaBook object
 *  @returns {Record<string, string>} Flat key → translated string */
export function extractStrings(book) {
  /** @type {Record<string, string>} */
  const strings = {}

  // metadata
  strings['metadata.title'] = book.metadata.title
  strings['metadata.language'] = book.metadata.language

  // TOC (recursive, path = toc.<id1>.<id2>.….title)
  function walkToc(entries, prefix) {
    for (const entry of entries) {
      const key = `${prefix}.${entry.id}`
      strings[`${key}.title`] = entry.title
      if (entry.children) walkToc(entry.children, key)
    }
  }
  walkToc(book.toc, 'toc')

  // Chapters
  for (const ch of book.chapters) {
    const chPrefix = `chapters.${ch.id}`
    strings[`${chPrefix}.title`] = ch.title
    walkBlocks(ch.blocks, `${chPrefix}.blocks`, strings)
  }

  return strings
}

/** Walk blocks recursively, extracting text and caption keys. */
function walkBlocks(blocks, prefix, strings) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.text !== undefined) strings[`${prefix}.${i}.text`] = block.text
    if (block.caption !== undefined) strings[`${prefix}.${i}.caption`] = block.caption
    if (block.children) {
      walkBlocks(block.children, `${prefix}.${i}.children`, strings)
    }
  }
}

// ---------------------------------------------------------------------------
// Collapse: merge consecutive paragraph/verse blocks (Option B canonical format)
// ---------------------------------------------------------------------------

const COLLAPSE_TYPES = new Set(['paragraph', 'verse'])

/** Merge consecutive blocks of type paragraph or verse into one block with text joined by \n\n.
 *  Does not merge blocks that have children. Returns a new array; does not mutate. */
export function collapseBlocks(blocks) {
  const out = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (COLLAPSE_TYPES.has(b.type) && !b.children) {
      const run = []
      while (i < blocks.length && blocks[i].type === b.type && !blocks[i].children) {
        run.push(blocks[i])
        i++
      }
      const text = run.map((x) => x.text ?? '').join('\n\n')
      out.push({ ...run[0], text })
      continue
    }
    out.push({ ...b })
    i++
  }
  return out
}

/** Return a deep clone of the book with each chapter's blocks collapsed (consecutive paragraph/verse merged). */
export function collapseBook(book) {
  const copy = JSON.parse(JSON.stringify(book))
  for (const ch of copy.chapters) {
    ch.blocks = collapseBlocks(ch.blocks)
  }
  return copy
}

// ---------------------------------------------------------------------------
// Skeleton: book.json → structure-only (translatable fields emptied)
// ---------------------------------------------------------------------------

/** @param {object} book  Full AgpiaBook object (will NOT be mutated)
 *  @returns {object} Skeleton with translatable fields set to ""; structure is collapsed (consecutive para/verse merged). */
export function generateSkeleton(book) {
  const skeleton = collapseBook(book)

  skeleton.metadata.title = ''
  skeleton.metadata.language = ''

  function clearTocTitles(entries) {
    for (const entry of entries) {
      entry.title = ''
      if (entry.children) clearTocTitles(entry.children)
    }
  }
  clearTocTitles(skeleton.toc)

  for (const ch of skeleton.chapters) {
    ch.title = ''
    clearBlockText(ch.blocks)
  }

  return skeleton
}

function clearBlockText(blocks) {
  for (const block of blocks) {
    if (block.text !== undefined) block.text = ''
    if (block.caption !== undefined) block.caption = ''
    if (block.children) clearBlockText(block.children)
  }
}

// ---------------------------------------------------------------------------
// Merge: skeleton + strings → full book.json
// ---------------------------------------------------------------------------

/** @param {object} skeleton  Skeleton object (will NOT be mutated)
 *  @param {Record<string, string>} strings  Flat key → string map
 *  @returns {object} Full AgpiaBook */
export function mergeBook(skeleton, strings) {
  const book = JSON.parse(JSON.stringify(skeleton)) // deep clone

  book.metadata.title = strings['metadata.title'] ?? ''
  book.metadata.language = strings['metadata.language'] ?? ''

  function fillToc(entries, prefix) {
    for (const entry of entries) {
      const key = `${prefix}.${entry.id}`
      entry.title = strings[`${key}.title`] ?? ''
      if (entry.children) fillToc(entry.children, key)
    }
  }
  fillToc(book.toc, 'toc')

  for (const ch of book.chapters) {
    const chPrefix = `chapters.${ch.id}`
    ch.title = strings[`${chPrefix}.title`] ?? ''
    fillBlocks(ch.blocks, `${chPrefix}.blocks`, strings)
  }

  return book
}

function fillBlocks(blocks, prefix, strings) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const textKey = `${prefix}.${i}.text`
    const captionKey = `${prefix}.${i}.caption`
    if ('text' in block) block.text = strings[textKey] ?? ''
    if ('caption' in block) block.caption = strings[captionKey] ?? ''
    if (block.children) {
      fillBlocks(block.children, `${prefix}.${i}.children`, strings)
    }
  }
}

// ---------------------------------------------------------------------------
// Markdown: book.json → Markdown string
// ---------------------------------------------------------------------------

/** Convert a single ContentBlock to Markdown lines.
 *  @param {object} block  ContentBlock
 *  @returns {string} Markdown fragment (may contain multiple lines) */
function blockToMarkdown(block) {
  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.level ?? 1, 1), 6)
      const hashes = '#'.repeat(level)
      return `${hashes} ${block.text ?? ''}`
    }

    case 'paragraph':
    case 'verse': {
      // Text may contain \n\n to separate multiple paragraphs/verses
      const text = block.text ?? ''
      return text
    }

    case 'instruction':
      return `> *${block.text ?? ''}*`

    case 'doxology':
      return `> ${block.text ?? ''}`

    case 'doxology_block': {
      if (!block.children) return ''
      return block.children.map(blockToMarkdown).join('\n\n')
    }

    case 'image':
      return `![](${block.src ?? ''})`

    case 'figure': {
      const img = `![${block.caption ?? ''}](${block.src ?? ''})`
      if (block.caption) return `${img}\n\n*${block.caption}*`
      return img
    }

    case 'separator':
      return '---'

    case 'blank':
      return ''

    default:
      return ''
  }
}

/** Convert blocks array to Markdown, joining with blank lines.
 *  @param {object[]} blocks
 *  @returns {string} */
function blocksToMarkdown(blocks) {
  return blocks.map(blockToMarkdown).filter(Boolean).join('\n\n')
}

/** Build a Markdown Table of Contents from the TOC tree.
 *  Filters out repeated introduction / conclusion entries.
 *  @param {object[]} entries  TocEntry[]
 *  @param {number} depth  Current indentation depth
 *  @param {object} opts  { skipIntros, skipConclusions }
 *  @returns {string} */
function tocToMarkdown(entries, depth = 0, opts = {}) {
  const lines = []
  for (const entry of entries) {
    // Skip repeated intro / conclusion entries from per-hour TOC
    if (opts.skipIntros && entry.id.endsWith('-intro')) continue
    if (opts.skipConclusions && (entry.id.startsWith('conclusion_') || entry.id === 's033')) continue

    const indent = '  '.repeat(depth)
    lines.push(`${indent}- [${entry.title}](#${entry.id})`)
    if (entry.children) {
      lines.push(tocToMarkdown(entry.children, depth + 1, opts))
    }
  }
  return lines.join('\n')
}

/** Look up a chapter's title from the TOC tree (recursive search).
 *  @param {object[]} toc
 *  @param {string} id
 *  @returns {string|null} */
function findTocTitle(toc, id) {
  for (const entry of toc) {
    if (entry.id === id) return entry.title
    if (entry.children) {
      const found = findTocTitle(entry.children, id)
      if (found) return found
    }
  }
  return null
}

const PART_RE = /^part\d+$/

/** Render a single chapter to Markdown lines, skipping the first heading if it duplicates the title.
 *  @param {object} ch  Chapter
 *  @param {string} title  Resolved title to display
 *  @returns {string} */
function chapterToMarkdown(ch, title) {
  const header = `<a id="${ch.id}"></a>\n\n## ${title}`

  // Skip the first block if it's a heading that duplicates the chapter title
  let blocks = ch.blocks
  if (blocks.length > 0 && blocks[0].type === 'heading' &&
      (blocks[0].text === ch.title || blocks[0].text === title)) {
    blocks = blocks.slice(1)
  }
  const body = blocksToMarkdown(blocks)
  return body ? `${header}\n\n${body}` : header
}

/** Convert a full AgpiaBook object to a Markdown string.
 *  - Introduction and Conclusion de chaque heure are output once, then referenced.
 *  - Chapters with generic "partXXX" titles use the TOC title and merge consecutive partXXX continuations.
 *  @param {object} book  Full AgpiaBook
 *  @returns {string} Complete Markdown document */
export function bookToMarkdown(book) {
  const parts = []

  // ---- Document title ----
  parts.push(`# ${book.metadata.title}`)

  // ---- Table of contents (skip repeated intro/conclusion entries) ----
  // Add shared Introduction / Conclusion as top-level TOC entries
  const tocLines = []
  const firstIntroId = book.chapters.find(ch => ch.id.endsWith('-intro'))?.id
  const firstConclusionId = book.chapters.find(ch => ch.id.startsWith('conclusion_') || ch.id === 's033')?.id
  if (firstIntroId) tocLines.push(`- [Introduction de chaque heure](#${firstIntroId})`)
  if (firstConclusionId) tocLines.push(`- [Conclusion de chaque heure](#${firstConclusionId})`)
  tocLines.push(tocToMarkdown(book.toc, 0, { skipIntros: true, skipConclusions: true }))
  parts.push('## Table des matières\n')
  parts.push(tocLines.join('\n'))

  // ---- Find the first Introduction and Conclusion chapters ----
  const firstIntro = book.chapters.find(ch => ch.id.endsWith('-intro'))
  const firstConclusion = book.chapters.find(ch => ch.id.startsWith('conclusion_') || ch.id === 's033')

  // Output them once as shared sections
  if (firstIntro) {
    parts.push('---')
    parts.push(chapterToMarkdown(firstIntro, 'Introduction de chaque heure'))
  }
  if (firstConclusion) {
    parts.push('---')
    parts.push(chapterToMarkdown(firstConclusion, 'Conclusion de chaque heure'))
  }

  // ---- Build set of IDs to skip (repeated intros / conclusions) ----
  const skipIds = new Set()
  for (const ch of book.chapters) {
    if (ch.id.endsWith('-intro')) skipIds.add(ch.id)
    if (ch.id.startsWith('conclusion_') || ch.id === 's033') skipIds.add(ch.id)
  }

  // ---- Build set of all chapter IDs that appear in the TOC ----
  const tocIds = new Set()
  function collectTocIds(entries) {
    for (const entry of entries) {
      tocIds.add(entry.id)
      if (entry.children) collectTocIds(entry.children)
    }
  }
  collectTocIds(book.toc)

  // ---- Chapters ----
  const chapters = book.chapters
  let i = 0
  while (i < chapters.length) {
    const ch = chapters[i]

    // Skip intro / conclusion (already output above)
    if (skipIds.has(ch.id)) { i++; continue }

    // Resolve title: use TOC title for generic "partXXX" chapters
    let title = ch.title
    if (PART_RE.test(title)) {
      title = findTocTitle(book.toc, ch.id) ?? title
    }

    // Absorb following chapters whose title is "partXXX" and that are NOT in the TOC
    // (they are continuations that belong to the current section)
    const mergedBlocks = [...ch.blocks]
    while (i + 1 < chapters.length
        && PART_RE.test(chapters[i + 1].title)
        && !tocIds.has(chapters[i + 1].id)
        && !skipIds.has(chapters[i + 1].id)) {
      i++
      mergedBlocks.push(...chapters[i].blocks)
    }

    parts.push('---')
    const merged = { ...ch, blocks: mergedBlocks }
    parts.push(chapterToMarkdown(merged, title))

    i++
  }

  return parts.join('\n\n') + '\n'
}
