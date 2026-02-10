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
