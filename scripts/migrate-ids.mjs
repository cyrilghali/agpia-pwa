#!/usr/bin/env node
// ---- One-time migration: replace epub-derived partXXX IDs with semantic names ----
// Run: node scripts/migrate-ids.mjs
//
// This script:
//   1. Reads FR book.json (has real titles) to build the old→new ID mapping
//   2. Hours → semantic (dawn, third-hour, …); intros → dawn-intro, …
//   3. Psalm chapters → psalmN (unique) or hourSlug-psalmN (when same psalm in multiple hours)
//   4. Other chapters → sNNN
//   5. Applies mapping to book.json, skeleton.json, and strings.json for all locales

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const AGPIA = resolve(ROOT, 'public/agpia')

// ---- Hour mapping (hardcoded) ----
const HOUR_MAP = {
  part001: 'intro',
  part003: 'dawn',
  part036: 'third-hour',
  part053: 'sixth-hour',
  part072: 'ninth-hour',
  part089: 'eleventh-hour',
  part106: 'twelfth-hour',
  part124: 'veil',
  part127: 'midnight',
  part142: 'absolutions',
  part144: 'prayers',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJSON(p) { return JSON.parse(await readFile(p, 'utf-8')) }
async function writeJSON(p, d) {
  await writeFile(p, JSON.stringify(d, null, 2) + '\n', 'utf-8')
  console.log(`  wrote ${p}`)
}

// ---------------------------------------------------------------------------
// Build the complete old-id → new-id mapping from a book with real titles
// ---------------------------------------------------------------------------

function buildIdMap(book) {
  /** @type {Record<string, string>} */
  const map = {}

  // 1. Hours + intros
  for (const [oldId, slug] of Object.entries(HOUR_MAP)) {
    map[oldId] = slug
    map[`${oldId}-intro`] = `${slug}-intro`
  }

  // 2. Collect psalm chapters and count per psalm number
  const psalmRe = /^Psa(?:ume|lm)\s+(\d+)$/i
  /** @type {Record<string, Array<{id: string, hourId: string|null}>>} */
  const psalmOccs = {}

  for (const ch of book.chapters) {
    if (map[ch.id]) continue                 // already mapped (hour / intro)
    if (!ch.id.startsWith('part')) continue   // already semantic (conclusion_*)
    const m = ch.title?.match(psalmRe)
    if (m) {
      const num = m[1]
      ;(psalmOccs[num] ??= []).push({ id: ch.id, hourId: ch.hourId })
    }
  }

  // 3. Assign psalm IDs (unique → psalmN, duplicate → hourSlug-psalmN)
  for (const [num, occs] of Object.entries(psalmOccs)) {
    if (occs.length === 1) {
      map[occs[0].id] = `psalm${num}`
    } else {
      for (const o of occs) {
        const hourSlug = HOUR_MAP[o.hourId] ?? o.hourId
        map[o.id] = `${hourSlug}-psalm${num}`
      }
    }
  }

  // 4. Remaining partNNN chapters → sNNN
  for (const ch of book.chapters) {
    if (map[ch.id]) continue
    const m = ch.id.match(/^part(\d+)$/)
    if (m) map[ch.id] = `s${m[1]}`
  }

  // 5. TOC may reference ids not present in chapters array (safety net)
  function scanToc(entries) {
    for (const e of entries) {
      if (!map[e.id] && e.id.startsWith('part')) {
        const introMatch = e.id.match(/^(part\d+)-intro$/)
        if (introMatch && HOUR_MAP[introMatch[1]]) {
          map[e.id] = `${HOUR_MAP[introMatch[1]]}-intro`
        } else {
          const m = e.id.match(/^part(\d+)$/)
          if (m) map[e.id] = `s${m[1]}`
        }
      }
      if (e.children) scanToc(e.children)
    }
  }
  scanToc(book.toc)

  return map
}

// ---------------------------------------------------------------------------
// Apply mapping to a book object (toc ids, chapter ids, hourIds)
// ---------------------------------------------------------------------------

function migrateBook(book, map) {
  const out = JSON.parse(JSON.stringify(book)) // deep clone

  function migToc(entries) {
    for (const e of entries) {
      if (map[e.id]) e.id = map[e.id]
      if (e.children) migToc(e.children)
    }
  }
  migToc(out.toc)

  for (const ch of out.chapters) {
    if (map[ch.id]) ch.id = map[ch.id]
    if (ch.hourId && map[ch.hourId]) ch.hourId = map[ch.hourId]
  }

  return out
}

// ---------------------------------------------------------------------------
// Apply mapping to strings keys (dot-separated segments)
// ---------------------------------------------------------------------------

function migrateStrings(strings, map) {
  const out = {}
  for (const [key, val] of Object.entries(strings)) {
    const newKey = key.split('.').map(seg => map[seg] ?? seg).join('.')
    out[newKey] = val
  }
  return out
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Build mapping from FR book (it has real translated titles for psalm detection)
  const frBook = await readJSON(resolve(AGPIA, 'fr/book.json'))
  const map = buildIdMap(frBook)

  // Print mapping summary
  const entries = Object.entries(map).filter(([o, n]) => o !== n).sort(([a], [b]) => a.localeCompare(b))
  console.log(`\nID mapping (${entries.length} renames):\n`)
  for (const [o, n] of entries) {
    console.log(`  ${o.padEnd(20)} → ${n}`)
  }
  console.log()

  // ---- FR ----
  console.log('Migrating FR...')
  await writeJSON(resolve(AGPIA, 'fr/book.json'), migrateBook(frBook, map))
  try {
    const frStr = await readJSON(resolve(AGPIA, 'fr/strings.json'))
    await writeJSON(resolve(AGPIA, 'fr/strings.json'), migrateStrings(frStr, map))
  } catch { console.log('  fr/strings.json not found, skipping') }

  // ---- Skeleton ----
  console.log('Migrating skeleton...')
  const skel = await readJSON(resolve(AGPIA, 'skeleton.json'))
  await writeJSON(resolve(AGPIA, 'skeleton.json'), migrateBook(skel, map))

  // ---- Other locales (en, ar, de, it, cop) ----
  let dirs
  try { dirs = await readdir(AGPIA, { withFileTypes: true }) } catch { dirs = [] }
  for (const d of dirs) {
    if (!d.isDirectory() || d.name === 'fr' || d.name === 'assets') continue
    const locale = d.name
    console.log(`Migrating ${locale}...`)

    try {
      const book = await readJSON(resolve(AGPIA, locale, 'book.json'))
      await writeJSON(resolve(AGPIA, locale, 'book.json'), migrateBook(book, map))
    } catch { console.log(`  ${locale}/book.json not found`) }

    try {
      const str = await readJSON(resolve(AGPIA, locale, 'strings.json'))
      await writeJSON(resolve(AGPIA, locale, 'strings.json'), migrateStrings(str, map))
    } catch { console.log(`  ${locale}/strings.json not found`) }
  }

  console.log('\nDone! Review with: git diff --stat')
}

main().catch(e => { console.error(e); process.exit(1) })
