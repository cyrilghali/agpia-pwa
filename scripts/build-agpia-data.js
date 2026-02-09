/**
 * Build script: parse EPUB XHTML files into structured JSON for native rendering.
 * Copies assets (images) to public/agpia/assets, generates public/agpia/book.json.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const OEBPS = path.join(REPO_ROOT, 'AGPIA2009-final-extracted', 'OEBPS')
const PUBLIC_AGPIA = path.join(REPO_ROOT, 'webapp', 'public', 'agpia')

if (!fs.existsSync(OEBPS)) {
  console.error('OEBPS not found at', OEBPS)
  process.exit(1)
}

fs.mkdirSync(path.join(PUBLIC_AGPIA, 'assets'), { recursive: true })

// ---- Copy assets only (images, SVGs) ----
const assetsDir = path.join(OEBPS, 'assets')
for (const name of fs.readdirSync(assetsDir)) {
  fs.copyFileSync(path.join(assetsDir, name), path.join(PUBLIC_AGPIA, 'assets', name))
}
console.log('Copied assets.')

// ---- Parse content.opf for spine and metadata ----
const opfXml = fs.readFileSync(path.join(OEBPS, 'content.opf'), 'utf-8')
const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)
const langMatch = opfXml.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/)
const metadata = {
  title: titleMatch ? titleMatch[1].trim() : 'AGPIA – Les prières des heures',
  language: langMatch ? langMatch[1].trim() : 'fr'
}

const itemRegex = /<item\s+id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>/g
const idToHref = {}
let m
while ((m = itemRegex.exec(opfXml)) !== null) idToHref[m[1]] = m[2]

const spineRegex = /<itemref\s+idref="([^"]+)"[^>]*\/?>/g
const spineIds = []
while ((m = spineRegex.exec(opfXml)) !== null) {
  const href = idToHref[m[1]]
  if (href && href.endsWith('.xhtml')) {
    spineIds.push(path.basename(href, '.xhtml'))
  }
}

// ---- Parse nav.xhtml for TOC tree ----
const navHtml = fs.readFileSync(path.join(OEBPS, 'nav.xhtml'), 'utf-8')

function hrefToId(href) {
  return (href || '').replace(/^.*\//, '').replace(/\.xhtml.*$/, '')
}

function extractLiContent(str) {
  let depth = 1, i = 0
  while (i < str.length && depth > 0) {
    const nextLi = str.indexOf('<li>', i)
    const nextLiNs = str.indexOf('<li ', i)
    const nextOpen = nextLi === -1 ? nextLiNs : (nextLiNs === -1 ? nextLi : Math.min(nextLi, nextLiNs))
    const nextClose = str.indexOf('</li>', i)
    if (nextClose === -1) break
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
    } else {
      depth--
      if (depth === 0) return [str.slice(0, nextClose), str.slice(nextClose + 5)]
      i = nextClose + 5
    }
  }
  return ['', '']
}

function parseOl(str) {
  const entries = []
  let rest = str.trim()
  while (rest.length > 0) {
    let liOpen = rest.indexOf('<li>')
    const liOpenNs = rest.indexOf('<li ')
    if (liOpen === -1 && liOpenNs === -1) break
    if (liOpen === -1) liOpen = liOpenNs
    else if (liOpenNs !== -1) liOpen = Math.min(liOpen, liOpenNs)
    const tagEnd = rest.indexOf('>', liOpen) + 1
    rest = rest.slice(tagEnd)
    const [content, nextRest] = extractLiContent(rest)
    rest = nextRest
    const aMatch = content.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!aMatch) continue
    const title = aMatch[2].replace(/<[^>]+>/g, '').trim()
    const id = hrefToId(aMatch[1])
    const olMatch = content.match(/<ol[^>]*>([\s\S]*)<\/ol>\s*$/i)
    let children
    if (olMatch) children = parseOl(olMatch[1])
    entries.push({ title, id, ...(children && children.length > 0 ? { children } : {}) })
  }
  return entries
}

const olStartIndex = navHtml.indexOf('<ol>', navHtml.indexOf('id="toc"'))
let depth = 1, searchStart = olStartIndex + 4, olEndIndex = navHtml.length
while (depth > 0) {
  const nextOl = navHtml.indexOf('<ol>', searchStart)
  const nextClose = navHtml.indexOf('</ol>', searchStart)
  if (nextClose === -1) break
  if (nextOl !== -1 && nextOl < nextClose) { depth++; searchStart = nextOl + 4 }
  else { depth--; if (depth === 0) { olEndIndex = nextClose + 5; break }; searchStart = nextClose + 5 }
}
const olFull = navHtml.slice(olStartIndex, olEndIndex)
const olContent = olFull.replace(/^<ol>\s*/, '').replace(/\s*<\/ol>$/, '')
const toc = parseOl(olContent)

// ---- Parse each XHTML chapter into structured content blocks ----
function parseXhtml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  if (!bodyMatch) return []

  const bodyClasses = (raw.match(/<body[^>]*class="([^"]*)"/) || [])[1] || ''
  let bodyContent = bodyMatch[1].trim()

  // Skip blank pages
  if (bodyClasses.includes('blank-page') || !bodyContent) return [{ type: 'blank' }]

  const blocks = []

  // Check if it's a separator page (hour intro with image)
  if (bodyClasses.includes('separator-page')) {
    blocks.push({ type: 'separator' })
  }

  // Tokenize body into sequential elements
  const tokens = tokenize(bodyContent)
  for (const token of tokens) {
    blocks.push(token)
  }

  return blocks
}

function tokenize(html) {
  const blocks = []
  let pos = 0

  while (pos < html.length) {
    // Skip whitespace
    while (pos < html.length && /\s/.test(html[pos])) pos++
    if (pos >= html.length) break

    // Comment
    if (html.startsWith('<!--', pos)) {
      const end = html.indexOf('-->', pos)
      pos = end === -1 ? html.length : end + 3
      continue
    }

    // Section element (skip wrapping, recurse inside)
    if (html.startsWith('<section', pos)) {
      const tagEnd = html.indexOf('>', pos) + 1
      const closeTag = findClosingTag(html, pos, 'section')
      const inner = html.slice(tagEnd, closeTag)
      const innerBlocks = tokenize(inner)
      blocks.push(...innerBlocks)
      pos = html.indexOf('>', closeTag) + 1
      if (pos === 0) pos = closeTag + 10
      continue
    }

    // Heading h1, h2, h3
    const hMatch = html.slice(pos).match(/^<(h[1-3])([^>]*)>([\s\S]*?)<\/\1>/)
    if (hMatch) {
      const level = parseInt(hMatch[1][1])
      const attrs = hMatch[2]
      const text = stripTags(hMatch[3]).trim()
      const isInstruction = attrs.includes('guide-instruction')
      const isDoxology = attrs.includes('prayer-doxology') || attrs.includes('prayer-heading-fr')
      blocks.push({
        type: isInstruction ? 'instruction' : isDoxology ? 'doxology' : 'heading',
        level,
        text
      })
      pos += hMatch[0].length
      continue
    }

    // Div blocks
    if (html.startsWith('<div', pos)) {
      const tagEnd = html.indexOf('>', pos) + 1
      const closeIdx = findClosingTag(html, pos, 'div')
      const attrs = html.slice(pos, tagEnd)
      const inner = html.slice(tagEnd, closeIdx)

      if (attrs.includes('prayer-doxology')) {
        // Parse inner content for doxology block
        const innerBlocks = tokenize(inner)
        blocks.push({ type: 'doxology_block', children: innerBlocks })
      } else if (attrs.includes('alt-wrapper')) {
        // Image wrapper
        const imgMatch = inner.match(/src="([^"]*)"/)
        if (imgMatch) {
          const src = imgMatch[1].replace(/^\.\.\//, '')
          blocks.push({ type: 'image', src: `/agpia/${src}` })
        }
      } else {
        const innerBlocks = tokenize(inner)
        blocks.push(...innerBlocks)
      }

      pos = closeIdx + 6
      continue
    }

    // Paragraph
    if (html.startsWith('<p', pos)) {
      const tagEnd = html.indexOf('>', pos) + 1
      const closeIdx = html.indexOf('</p>', pos)
      const attrs = html.slice(pos, tagEnd)
      const inner = html.slice(tagEnd, closeIdx)

      if (attrs.includes('guide-instruction')) {
        blocks.push({ type: 'instruction', text: processInline(inner) })
      } else {
        const content = processInline(inner)
        if (content.trim()) {
          // Check if contains verse numbers
          const hasVerses = inner.includes('verse-num')
          blocks.push({ type: hasVerses ? 'verse' : 'paragraph', text: content })
        }
      }
      pos = closeIdx + 4
      continue
    }

    // Figure
    if (html.startsWith('<figure', pos)) {
      const closeIdx = findClosingTag(html, pos, 'figure')
      const figContent = html.slice(pos, closeIdx + 9)
      const imgMatch = figContent.match(/src="([^"]*)"/)
      const captionMatch = figContent.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)
      if (imgMatch) {
        const src = imgMatch[1].replace(/^\.\.\//, '')
        blocks.push({
          type: 'figure',
          src: `/agpia/${src}`,
          caption: captionMatch ? stripTags(captionMatch[1]).trim() : undefined
        })
      }
      pos = closeIdx + 9
      continue
    }

    // Any other tag: skip it
    if (html[pos] === '<') {
      const end = html.indexOf('>', pos)
      pos = end === -1 ? html.length : end + 1
      continue
    }

    // Text node
    const nextTag = html.indexOf('<', pos)
    const textEnd = nextTag === -1 ? html.length : nextTag
    const text = html.slice(pos, textEnd).trim()
    if (text) blocks.push({ type: 'paragraph', text })
    pos = textEnd
  }

  return blocks
}

function findClosingTag(html, startPos, tagName) {
  let depth = 1
  let pos = html.indexOf('>', startPos) + 1
  const openRe = new RegExp(`<${tagName}[\\s>]`, 'i')
  const closeStr = `</${tagName}>`
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.slice(pos).search(openRe)
    const nextClose = html.indexOf(closeStr, pos)
    if (nextClose === -1) break
    const openAbs = nextOpen === -1 ? Infinity : pos + nextOpen
    if (openAbs < nextClose) { depth++; pos = openAbs + tagName.length + 1 }
    else { depth--; if (depth === 0) return nextClose; pos = nextClose + closeStr.length }
  }
  return html.length
}

function processInline(html) {
  return html
    .replace(/<span class="verse-num">\s*(\d+)\s*<\/span>/g, '⟨$1⟩')
    .replace(/<em>([\s\S]*?)<\/em>/g, '_$1_')
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ---- IDs to skip from the readable spine (metadata/credits, cover) ----
const SKIP_IDS = new Set(['head', 'cover'])

// ---- Hour boundary chapter IDs (separator pages that start each hour) ----
// These IDs correspond to the separator pages in the EPUB.
// The TOC top-level entries map to these.
const HOUR_BOUNDARY_IDS = [
  'part001', // Introduction
  'part003', // Aube (also part034 is the separator, part035 is the intro text)
  'part034', 'part035', 'part036', // 3e heure (part034 = separator, part036 = first psalm)
  'part053', // 6e heure
  'part072', // 9e heure
  'part089', // 11e heure
  'part106', // 12e heure
  'part124', // Voile
  'part127', // Minuit
  'part142', // Absolutions
  'part144', // Prières diverses
]

// Map from TOC top-level entry id -> hourId for grouping
// We use the TOC top-level IDs as canonical hour identifiers.
const HOUR_IDS_ORDERED = [
  'part001', 'part003', 'part036', 'part053', 'part072',
  'part089', 'part106', 'part124', 'part127', 'part142', 'part144'
]

// Build a set of separator-page chapter IDs and map each to the next hour.
// Separator pages appear just before the actual hour content.
// We detect them dynamically below.

// ---- Build chapters ----
const textDir = path.join(OEBPS, 'Text')
const chapters = []

// First pass: build all chapters
const allChapters = []
for (const chapterId of spineIds) {
  if (SKIP_IDS.has(chapterId)) continue

  const filePath = path.join(textDir, `${chapterId}.xhtml`)
  if (!fs.existsSync(filePath)) continue

  const blocks = parseXhtml(filePath)
  // Skip blank/empty
  if (blocks.length === 0) continue
  if (blocks.length === 1 && blocks[0].type === 'blank') continue

  // Get title from first heading
  const firstHeading = blocks.find(b => b.type === 'heading')
  const title = firstHeading ? firstHeading.text : chapterId

  allChapters.push({ id: chapterId, title, blocks })
}

// Build a title->hourId mapping from TOC for separator page detection
const tocTitleToHourId = {}
for (const entry of toc) {
  tocTitleToHourId[entry.title] = entry.id
}

// Second pass: assign hourId to each chapter
// Walk through chapters; when we encounter a chapter whose id matches
// a TOC top-level entry OR a separator page whose title matches, start a new hour
let currentHourId = null
for (const ch of allChapters) {
  if (HOUR_IDS_ORDERED.includes(ch.id)) {
    currentHourId = ch.id
  } else if (ch.blocks[0]?.type === 'separator' && tocTitleToHourId[ch.title]) {
    // Separator page for the next hour — assign it to that hour
    currentHourId = tocTitleToHourId[ch.title]
  }
  chapters.push({ ...ch, hourId: currentHourId })
}

// ---- Write book.json ----
const book = { metadata, toc, chapters }
const bookPath = path.join(PUBLIC_AGPIA, 'book.json')
fs.writeFileSync(bookPath, JSON.stringify(book, null, 0), 'utf-8')

console.log(`Wrote ${bookPath}`)
console.log(`  ${chapters.length} chapters, ${toc.length} top-level TOC entries`)
console.log(`  Size: ${(fs.statSync(bookPath).size / 1024).toFixed(0)} KB`)
