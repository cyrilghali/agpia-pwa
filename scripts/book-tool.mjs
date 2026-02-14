#!/usr/bin/env node
// ---- CLI for skeleton / strings / merge operations ----
// Usage:
//   node scripts/book-tool.mjs skeleton <book.json> [skeleton.json]
//   node scripts/book-tool.mjs extract  <book.json> [strings.json]
//   node scripts/book-tool.mjs merge    <skeleton.json> <strings.json> [book.json]
//   node scripts/book-tool.mjs build    (builds all locales from skeleton + strings)
//   node scripts/book-tool.mjs markdown [book.json] [output.md]
//   node scripts/book-tool.mjs import   <book.md>   (parse markdown into strings.json using skeleton)

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collapseBook, extractStrings, generateSkeleton, mergeBook, bookToMarkdown } from './book-lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const AGPIA_DIR = resolve(ROOT, 'public/agpia')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJSON(path) {
  return JSON.parse(await readFile(path, 'utf-8'))
}

async function writeJSON(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`  wrote ${path}`)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdSkeleton(args) {
  const bookPath = args[0]
  const outPath = args[1] ?? resolve(AGPIA_DIR, 'skeleton.json')
  if (!bookPath) { console.error('Usage: skeleton <book.json> [skeleton.json]'); process.exit(1) }
  const book = await readJSON(resolve(bookPath))
  const skeleton = generateSkeleton(book)
  await writeJSON(resolve(outPath), skeleton)
}

async function cmdExtract(args) {
  const bookPath = args[0]
  const outPath = args[1]
  if (!bookPath) { console.error('Usage: extract <book.json> [strings.json]'); process.exit(1) }
  const abs = resolve(bookPath)
  const book = await readJSON(abs)
  const strings = extractStrings(book)
  const dest = outPath ? resolve(outPath) : resolve(dirname(abs), 'strings.json')
  await writeJSON(dest, strings)
}

async function cmdMerge(args) {
  const skelPath = args[0]
  const stringsPath = args[1]
  const outPath = args[2]
  if (!skelPath || !stringsPath) { console.error('Usage: merge <skeleton.json> <strings.json> [book.json]'); process.exit(1) }
  const skeleton = await readJSON(resolve(skelPath))
  const strings = await readJSON(resolve(stringsPath))
  const book = mergeBook(skeleton, strings)
  const dest = outPath ? resolve(outPath) : resolve(dirname(resolve(stringsPath)), 'book.json')
  await writeJSON(dest, book)
}

/** One-time migration: collapse paragraph/verse blocks in a locale book, then update strings and skeleton. */
async function cmdMigrateCollapse(args) {
  const locale = args[0] ?? 'fr'
  const bookPath = resolve(AGPIA_DIR, locale, 'book.json')
  const stringsPath = resolve(AGPIA_DIR, locale, 'strings.json')
  const skeletonPath = resolve(AGPIA_DIR, 'skeleton.json')
  const book = await readJSON(bookPath)
  const collapsed = collapseBook(book)
  await writeJSON(bookPath, collapsed)
  const strings = extractStrings(collapsed)
  await writeJSON(stringsPath, strings)
  const skeleton = generateSkeleton(collapsed)
  await writeJSON(skeletonPath, skeleton)
  console.log(`  migrated ${locale} and skeleton`)
}

/** Build all locale book.json from skeleton + per-locale strings. */
async function cmdBuild() {
  const skelPath = resolve(AGPIA_DIR, 'skeleton.json')
  const skeleton = await readJSON(skelPath)
  console.log(`skeleton: ${skelPath}`)

  // Discover locale directories that contain strings.json
  const entries = await readdir(AGPIA_DIR, { withFileTypes: true })
  let count = 0
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'assets') continue
    const stringsFile = resolve(AGPIA_DIR, entry.name, 'strings.json')
    try {
      await stat(stringsFile)
    } catch {
      continue // no strings.json in this locale dir
    }
    const strings = await readJSON(stringsFile)
    const book = mergeBook(skeleton, strings)
    await writeJSON(resolve(AGPIA_DIR, entry.name, 'book.json'), book)
    count++
  }
  console.log(`built ${count} locale(s)`)
}

/** Export a book.json as a Markdown file. */
async function cmdMarkdown(args) {
  const bookPath = args[0] ?? resolve(AGPIA_DIR, 'fr/book.json')
  const abs = resolve(bookPath)
  const book = await readJSON(abs)
  const md = bookToMarkdown(book)
  const dest = args[1] ? resolve(args[1]) : abs.replace(/\.json$/, '.md')
  await writeFile(dest, md, 'utf-8')
  console.log(`  wrote ${dest}`)
}

// ---------------------------------------------------------------------------
// Import: book.md → strings.json (using skeleton as structural guide)
// ---------------------------------------------------------------------------

/** Parse a book.md file into structural components.
 *  @param {string} md  Raw markdown content
 *  @returns {{ title: string, tocMap: Map<string,string>, sections: Map<string, {title: string, lines: string[]}> }} */
function parseMd(md) {
  const lines = md.split('\n')

  // Document title from first # heading
  let title = ''
  for (const line of lines) {
    const m = line.match(/^# (.+)/)
    if (m) { title = m[1].trim(); break }
  }

  // TOC entries: - [Title](#id)
  const tocMap = new Map()
  for (const line of lines) {
    const m = line.match(/^\s*-\s*\[([^\]]+)\]\(#([^)]+)\)/)
    if (m) tocMap.set(m[2], m[1])
  }

  // Sections: split by <a id="..."> anchors
  const sections = new Map()
  const anchorPositions = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/<a id="([^"]+)">/)
    if (m) anchorPositions.push({ id: m[1], line: i })
  }

  for (let a = 0; a < anchorPositions.length; a++) {
    const { id, line: startLine } = anchorPositions[a]
    const endLine = a + 1 < anchorPositions.length ? anchorPositions[a + 1].line : lines.length

    // Find ## title line after anchor
    let sectionTitle = ''
    let contentStart = startLine + 1
    for (let j = startLine + 1; j < endLine; j++) {
      const hm = lines[j].match(/^## (.+)/)
      if (hm) {
        sectionTitle = hm[1].trim()
        contentStart = j + 1
        break
      }
    }

    // Extract content lines, trimming boundary separators and blanks
    let content = lines.slice(contentStart, endLine)
    while (content.length && content[content.length - 1].trim() === '') content.pop()
    if (content.length && content[content.length - 1].trim() === '---') content.pop()
    while (content.length && content[content.length - 1].trim() === '') content.pop()
    while (content.length && content[0].trim() === '') content.shift()

    sections.set(id, { title: sectionTitle, lines: content })
  }

  return { title, tocMap, sections }
}

/** Tokenize chapter content lines into typed elements.
 *  @param {string[]} lines
 *  @returns {Array<{type: string, text?: string, level?: number}>} */
function tokenize(lines) {
  const tokens = []
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // Heading: ## text, ### text, etc.
    const hm = trimmed.match(/^(#{1,6})\s+(.+)/)
    if (hm) {
      tokens.push({ type: 'heading', level: hm[1].length, text: hm[2].trim() })
      i++
      continue
    }

    // Instruction (blockquote italic): > *text*
    const im = trimmed.match(/^>\s*\*(.+)\*$/)
    if (im) {
      tokens.push({ type: 'instruction', text: im[1] })
      i++
      continue
    }

    // Doxology (blockquote): > text
    const dm = trimmed.match(/^>\s+(.+)/)
    if (dm) {
      tokens.push({ type: 'doxology', text: dm[1] })
      i++
      continue
    }

    // Separator: ---
    if (trimmed === '---') {
      tokens.push({ type: 'separator' })
      i++
      continue
    }

    // Plain text paragraph: collect consecutive non-empty, non-special lines
    const paraLines = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (t === '' || /^#{1,6}\s/.test(t) || /^>/.test(t) || t === '---') break
      paraLines.push(t)
      i++
    }
    tokens.push({ type: 'paragraph', text: paraLines.join('\n') })
  }
  return tokens
}

/** Check whether the paragraph-collecting loop should stop at token[ti] to
 *  reserve it for the next skeleton block.
 *  @param {Array} tokens
 *  @param {number} ti  Current token index
 *  @param {object} nextBlock  Next skeleton block */
function shouldReserve(tokens, ti, nextBlock) {
  if (!nextBlock || ti >= tokens.length) return false
  const tok = tokens[ti]

  switch (nextBlock.type) {
    case 'heading':
      return tok.type === 'heading'
    case 'instruction':
      return tok.type === 'instruction'
    case 'doxology':
      return tok.type === 'doxology'
    case 'separator':
      return tok.type === 'separator'

    case 'paragraph':
    case 'verse': {
      // When next block is also a text type, reserve the last paragraph token
      if (tok.type === 'paragraph') {
        let pCount = 0
        let scan = ti
        while (scan < tokens.length && tokens[scan].type === 'paragraph') { pCount++; scan++ }
        return pCount <= 1
      }
      return false
    }

    case 'doxology_block': {
      if (!nextBlock.children?.length) return false
      // Count leading paragraph/verse children
      let paraChildCount = 0
      for (const child of nextBlock.children) {
        if (child.type === 'paragraph' || child.type === 'verse') paraChildCount++
        else break
      }
      // Find first non-paragraph child type
      const firstNonPara = nextBlock.children.find(c => c.type !== 'paragraph' && c.type !== 'verse')
      if (firstNonPara) {
        // Count paragraph tokens ahead
        let pAhead = 0
        let scan = ti
        while (scan < tokens.length && tokens[scan].type === 'paragraph') { pAhead++; scan++ }
        // If a token of the expected type follows the paragraphs, reserve when
        // only enough paragraphs remain for the doxology_block's para children
        if (scan < tokens.length && tokens[scan].type === firstNonPara.type) {
          return pAhead <= paraChildCount
        }
      }
      // Fall back: check first child
      return shouldReserve(tokens, ti, nextBlock.children[0])
    }

    default:
      return false
  }
}

/** Walk skeleton blocks, match them to tokens, and write results into the strings map.
 *  @param {Array} tokens
 *  @param {number} startTi  Start token index
 *  @param {Array} blocks  Skeleton blocks
 *  @param {string} prefix  Key prefix (e.g. "chapters.dawn.blocks")
 *  @param {Record<string,string>} strings  Output map
 *  @returns {number} Next token index after consumed tokens */
function matchBlocks(tokens, startTi, blocks, prefix, strings) {
  let ti = startTi
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    const nextBlock = bi + 1 < blocks.length ? blocks[bi + 1] : null

    switch (block.type) {
      case 'heading': {
        if (ti < tokens.length && tokens[ti].type === 'heading') {
          strings[`${prefix}.${bi}.text`] = tokens[ti].text
          ti++
        } else {
          strings[`${prefix}.${bi}.text`] = ''
        }
        break
      }

      case 'paragraph':
      case 'verse': {
        const paras = []
        while (ti < tokens.length && tokens[ti].type === 'paragraph') {
          if (nextBlock && shouldReserve(tokens, ti, nextBlock)) break
          paras.push(tokens[ti].text)
          ti++
        }
        strings[`${prefix}.${bi}.text`] = paras.join('\n\n')
        break
      }

      case 'instruction': {
        if (ti < tokens.length && tokens[ti].type === 'instruction') {
          strings[`${prefix}.${bi}.text`] = tokens[ti].text
          ti++
        } else {
          strings[`${prefix}.${bi}.text`] = ''
        }
        break
      }

      case 'doxology': {
        if (ti < tokens.length && tokens[ti].type === 'doxology') {
          strings[`${prefix}.${bi}.text`] = tokens[ti].text
          ti++
        } else {
          strings[`${prefix}.${bi}.text`] = ''
        }
        break
      }

      case 'doxology_block': {
        if (block.children) {
          ti = matchBlocks(tokens, ti, block.children, `${prefix}.${bi}.children`, strings)
        }
        break
      }

      case 'separator':
        if (ti < tokens.length && tokens[ti].type === 'separator') ti++
        break

      case 'blank':
        break

      default:
        // image, figure, etc. — set empty text/caption if present
        if ('text' in block) strings[`${prefix}.${bi}.text`] = ''
        if ('caption' in block) strings[`${prefix}.${bi}.caption`] = ''
        break
    }
  }
  return ti
}

/** Set all translatable fields to '' for blocks not present in the markdown. */
function walkBlocksEmpty(blocks, prefix, strings) {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.text !== undefined) strings[`${prefix}.${i}.text`] = ''
    if (b.caption !== undefined) strings[`${prefix}.${i}.caption`] = ''
    if (b.children) walkBlocksEmpty(b.children, `${prefix}.${i}.children`, strings)
  }
}

/** Build the flat strings map from the skeleton and parsed markdown data. */
function buildStrings(skeleton, title, locale, tocMap, sections) {
  const strings = {}
  strings['metadata.title'] = title
  strings['metadata.language'] = locale

  // TOC titles
  function fillToc(entries, prefix) {
    for (const entry of entries) {
      const key = `${prefix}.${entry.id}`
      strings[`${key}.title`] = tocMap.get(entry.id) ?? ''
      if (entry.children) fillToc(entry.children, key)
    }
  }
  fillToc(skeleton.toc, 'toc')

  // Chapters
  for (const ch of skeleton.chapters) {
    const chPrefix = `chapters.${ch.id}`
    const section = sections.get(ch.id)

    if (!section) {
      // Chapter not in markdown — all empty
      strings[`${chPrefix}.title`] = ''
      walkBlocksEmpty(ch.blocks, `${chPrefix}.blocks`, strings)
      continue
    }

    strings[`${chPrefix}.title`] = section.title

    // Tokenize the section content
    const tokens = tokenize(section.lines)

    // The first block is typically a heading level 1 that duplicates the section title.
    // In the markdown export this heading becomes the ## section title and is omitted
    // from the body. Re-inject it so the skeleton block gets matched.
    if (ch.blocks.length > 0 && ch.blocks[0].type === 'heading' && ch.blocks[0].level === 1) {
      if (tokens.length === 0 || tokens[0].type !== 'heading') {
        tokens.unshift({ type: 'heading', level: 1, text: section.title })
      }
    }

    matchBlocks(tokens, 0, ch.blocks, `${chPrefix}.blocks`, strings)
  }

  return strings
}

/** Import: parse a book.md file into strings.json using the skeleton as a structural guide. */
async function cmdImport(args) {
  const mdPath = args[0]
  if (!mdPath) { console.error('Usage: import <book.md>'); process.exit(1) }

  const abs = resolve(mdPath)
  const md = await readFile(abs, 'utf-8')
  const localeDir = dirname(abs)
  const locale = basename(localeDir)

  const skelPath = resolve(AGPIA_DIR, 'skeleton.json')
  const skeleton = await readJSON(skelPath)
  console.log(`skeleton: ${skelPath}`)
  console.log(`markdown: ${abs}`)
  console.log(`locale:   ${locale}`)

  const { title, tocMap, sections } = parseMd(md)
  console.log(`  title:    ${title}`)
  console.log(`  sections: ${sections.size} chapter(s) found in markdown`)

  const strings = buildStrings(skeleton, title, locale, tocMap, sections)
  const dest = resolve(localeDir, 'strings.json')
  await writeJSON(dest, strings)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2)

switch (cmd) {
  case 'skeleton': await cmdSkeleton(rest); break
  case 'extract':  await cmdExtract(rest);  break
  case 'merge':    await cmdMerge(rest);    break
  case 'build':    await cmdBuild();        break
  case 'markdown': await cmdMarkdown(rest); break
  case 'import':   await cmdImport(rest);   break
  case 'migrate-collapse': await cmdMigrateCollapse(rest); break
  default:
    console.error(`Unknown command: ${cmd ?? '(none)'}`)
    console.error('Commands: skeleton, extract, merge, build, markdown, import, migrate-collapse')
    process.exit(1)
}
