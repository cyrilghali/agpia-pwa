#!/usr/bin/env node
/**
 * gen-book-md-templates.mjs
 * Generate skeleton book.md files for each non-French locale.
 * Each file has the same section anchors as the French source,
 * with neutral ID-based headings and French hints as comments only.
 *
 * Usage:  node scripts/gen-book-md-templates.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Languages to generate ──────────────────────────────────────────────────

const LANGUAGES = {
  ar: { title: 'أغبية – صلوات الساعات', lang: 'ar' },
  de: { title: 'AGPIA – Die Stundengebete', lang: 'de' },
}

// ── Read French source ─────────────────────────────────────────────────────

const frMd = readFileSync(resolve(root, 'public/agpia/fr/book.md'), 'utf-8')

// ── Parse into sections ────────────────────────────────────────────────────

const ANCHOR_RE = /^<a id="([^"]+)"><\/a>$/m

const firstAnchorIdx = frMd.search(ANCHOR_RE)
const tocBlock = frMd.slice(0, firstAnchorIdx).trim()
const restBlock = frMd.slice(firstAnchorIdx)

// Split rest into sections by anchors
const sectionParts = restBlock.split(/(?=^<a id="[^"]+"><\/a>$)/m).filter(Boolean)

/** Parse one section from the French source */
function parseSection(raw) {
  const lines = raw.trim().split('\n')
  const anchorMatch = lines[0].match(/<a id="([^"]+)">/)
  const id = anchorMatch ? anchorMatch[1] : null

  // Find the first heading line
  let frTitle = null
  let headingLevel = 2
  for (const line of lines) {
    const hm = line.match(/^(#{1,4})\s+(.+)$/)
    if (hm) {
      frTitle = hm[2]
      headingLevel = hm[1].length
      break
    }
  }

  // Collect image lines (shared assets to preserve)
  const imageLines = []
  for (const line of lines) {
    if (line.trim().startsWith('![')) imageLines.push(line.trim())
  }

  return { id, frTitle, headingLevel, imageLines }
}

const sections = sectionParts.map(parseSection)

// ── Parse French TOC to extract structure with IDs ─────────────────────────

const tocLines = tocBlock.split('\n')
const tocStartIdx = tocLines.findIndex(l => l.match(/^##\s/))
const tocContentLines = tocLines.slice(tocStartIdx + 1).filter(l => l.trim())

// Convert French TOC to neutral TOC: replace display text with the anchor ID
// e.g. "- [Prière de l'aube](#dawn)" -> "- [dawn](#dawn)"
// e.g. "  - [Psaume 1](#psalm1)" -> "  - [psalm1](#psalm1)"
function neutralizeTocLine(line) {
  return line.replace(/\[([^\]]+)\]\(#([^)]+)\)/g, (_, _text, id) => `[${id}](#${id})`)
}

// ── Generate template for each language ────────────────────────────────────

function generateTemplate(locale, { title }) {
  const lines = []

  // Title
  lines.push(`# ${title}`)
  lines.push('')

  // TOC with neutral IDs as display text
  lines.push('<!-- TOC: replace each [id] with the translated title -->')
  lines.push('')
  for (const tocLine of tocContentLines) {
    lines.push(neutralizeTocLine(tocLine))
  }
  lines.push('')

  // Sections
  for (const section of sections) {
    lines.push('---')
    lines.push('')
    lines.push(`<a id="${section.id}"></a>`)
    lines.push('')

    const hashes = '#'.repeat(section.headingLevel)
    // Heading uses just the ID; French title is a comment hint
    lines.push(`${hashes} ${section.id}`)
    lines.push('')
    lines.push(`<!-- fr: ${section.frTitle} -->`)
    lines.push('')

    // Preserve images (coptic crosses, etc.)
    for (const img of section.imageLines) {
      lines.push(img)
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ── Write files ────────────────────────────────────────────────────────────

console.log('Generating book.md templates...')

for (const [locale, meta] of Object.entries(LANGUAGES)) {
  const dir = resolve(root, `public/agpia/${locale}`)
  mkdirSync(dir, { recursive: true })

  const content = generateTemplate(locale, meta)
  const outPath = `public/agpia/${locale}/book.md`
  writeFileSync(resolve(root, outPath), content, 'utf-8')
  console.log(`  ✓ ${outPath}`)
}

console.log('\nDone! Template files created.')
console.log('For each section: replace the ID heading with the translated title,')
console.log('and add the translated content below it.')
console.log('The <!-- fr: ... --> comment shows what the French original says.')
