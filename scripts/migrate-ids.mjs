#!/usr/bin/env node
/**
 * migrate-ids.mjs
 * One-shot script to rename all sXXX IDs to descriptive names across the Agpia book files.
 *
 * Usage:  node scripts/migrate-ids.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Complete old → new ID mapping ──────────────────────────────────────────

const ID_MAP = {
  // Dawn
  s004: 'dawn-epistle',
  s005: 'dawn-faith',
  s025: 'dawn-gospel',
  s026: 'dawn-oraisons',
  s027: 'dawn-angels-praise',
  s028: 'dawn-trisagion',
  s029: 'dawn-creed-intro',
  s030: 'dawn-creed',
  s031: 'dawn-absolution',
  s032: 'dawn-absolution-2',
  s033: 'conclusion',

  // Third Hour
  s034: 'third-hour-prayer',
  s048: 'third-hour-gospel',
  s049: 'third-hour-oraisons',
  s050: 'third-hour-kyrie',
  s051: 'third-hour-absolution',

  // Sixth Hour
  s052: 'sixth-hour-prayer',
  s065: 'sixth-hour-gospel',
  s066: 'sixth-hour-oraisons',
  s067: 'sixth-hour-litany',
  s068: 'sixth-hour-kyrie',
  s069: 'sixth-hour-absolution',

  // Ninth Hour
  s070: 'ninth-hour-prayer',
  s084: 'ninth-hour-gospel',
  s085: 'ninth-hour-oraisons',
  s086: 'ninth-hour-kyrie',
  s087: 'ninth-hour-absolution',

  // Eleventh Hour
  s088: 'eleventh-hour-prayer',
  s101: 'eleventh-hour-gospel',
  s102: 'eleventh-hour-oraisons',
  s103: 'eleventh-hour-absolution',

  // Twelfth Hour
  s104: 'twelfth-hour-header',
  s105: 'twelfth-hour-prayer',
  s118: 'twelfth-hour-gospel',
  s119: 'twelfth-hour-oraisons',
  s120: 'twelfth-hour-kyrie',
  s121: 'twelfth-hour-absolution',

  // Veil
  s122: 'veil-header',
  s123: 'veil-prayer',
  s125: 'veil-oraisons',
  s126: 'veil-absolution',

  // Midnight
  s128: 'midnight-first-service',
  s131: 'midnight-first-gospel',
  s132: 'midnight-first-oraisons',
  s133: 'midnight-first-kyrie',
  s134: 'midnight-second-service',
  s135: 'midnight-second-gospel',
  s136: 'midnight-second-oraisons',
  s137: 'midnight-third-service',
  s138: 'midnight-third-gospel',
  s139: 'midnight-third-oraisons',
  s140: 'midnight-canticle-simeon',
  s141: 'midnight-absolution',

  // Absolutions
  s143: 'priests-absolution',

  // Prayers
  s145: 'prayer-repentance',
  s146: 'prayer-before-confession',
  s147: 'prayer-after-confession',
  s148: 'prayer-before-communion',
  s150: 'prayer-before-communion-2',
  s151: 'prayer-after-communion',
  s153: 'prayer-after-communion-2',
  s154: 'prayer-guidance',
  s155: 'prayer-before-meal',
  s156: 'prayer-closing',
}

// Build a regex that matches any old ID as a whole word (surrounded by non-alphanumeric chars)
// Sort by length descending so longer IDs match first (e.g. s131 before s13)
const sortedOldIds = Object.keys(ID_MAP).sort((a, b) => b.length - a.length)
const idPattern = new RegExp(`\\b(${sortedOldIds.join('|')})\\b`, 'g')

// ── Helpers ─────────────────────────────────────────────────────────────────

function readFile(relPath) {
  return readFileSync(resolve(root, relPath), 'utf-8')
}

function writeFile(relPath, content) {
  writeFileSync(resolve(root, relPath), content, 'utf-8')
  console.log(`  ✓ ${relPath}`)
}

/** Walk a JSON structure and replace all "id" field values that match old IDs. */
function walkAndReplaceIds(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) walkAndReplaceIds(item)
  } else if (obj && typeof obj === 'object') {
    if (typeof obj.id === 'string' && ID_MAP[obj.id]) {
      obj.id = ID_MAP[obj.id]
    }
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null) walkAndReplaceIds(val)
    }
  }
}

/** Replace sXXX IDs inside JSON object keys (for strings.json). */
function replaceIdsInKeys(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = key.replace(idPattern, (match) => ID_MAP[match] || match)
    result[newKey] = value
  }
  return result
}

// ── 1. skeleton.json ────────────────────────────────────────────────────────

console.log('Migrating IDs...')

const skeletonPath = 'public/agpia/skeleton.json'
const skeleton = JSON.parse(readFile(skeletonPath))
walkAndReplaceIds(skeleton)
writeFile(skeletonPath, JSON.stringify(skeleton, null, 2) + '\n')

// ── 2. fr/book.json ─────────────────────────────────────────────────────────

const bookPath = 'public/agpia/fr/book.json'
const book = JSON.parse(readFile(bookPath))
walkAndReplaceIds(book)
writeFile(bookPath, JSON.stringify(book, null, 2) + '\n')

// ── 3. fr/book.md ───────────────────────────────────────────────────────────

const mdPath = 'public/agpia/fr/book.md'
let md = readFile(mdPath)
// Replace anchors: id="sXXX"
md = md.replace(/id="(s\d{3})"/g, (match, id) => {
  return ID_MAP[id] ? `id="${ID_MAP[id]}"` : match
})
// Replace links: (#sXXX)
md = md.replace(/\(#(s\d{3})\)/g, (match, id) => {
  return ID_MAP[id] ? `(#${ID_MAP[id]})` : match
})
writeFile(mdPath, md)

// ── 4. fr/strings.json ──────────────────────────────────────────────────────

const stringsPath = 'public/agpia/fr/strings.json'
const strings = JSON.parse(readFile(stringsPath))
const newStrings = replaceIdsInKeys(strings)
writeFile(stringsPath, JSON.stringify(newStrings, null, 2) + '\n')

// ── 5. scripts/book-lib.mjs ────────────────────────────────────────────────

const libPath = 'scripts/book-lib.mjs'
let lib = readFile(libPath)
// Replace the 4 hardcoded 's033' references with 'conclusion'
lib = lib.replace(/=== 's033'/g, "=== 'conclusion'")
writeFile(libPath, lib)

// ── 6. schemas/agpia-book.schema.json ───────────────────────────────────────

const schemaPath = 'schemas/agpia-book.schema.json'
let schema = readFile(schemaPath)
// Update the example in the description
schema = schema.replace(
  'Ex: dawn, dawn-intro, psalm1, dawn-psalm62, s004',
  'Ex: dawn, dawn-intro, psalm1, dawn-psalm62, dawn-epistle'
)
writeFile(schemaPath, schema)

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\nDone! Renamed ${Object.keys(ID_MAP).length} IDs across 6 files.`)
