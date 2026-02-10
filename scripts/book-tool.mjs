#!/usr/bin/env node
// ---- CLI for skeleton / strings / merge operations ----
// Usage:
//   node scripts/book-tool.mjs skeleton <book.json> [skeleton.json]
//   node scripts/book-tool.mjs extract  <book.json> [strings.json]
//   node scripts/book-tool.mjs merge    <skeleton.json> <strings.json> [book.json]
//   node scripts/book-tool.mjs build    (builds all locales from skeleton + strings)
//   node scripts/book-tool.mjs markdown [book.json] [output.md]

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
// Main
// ---------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2)

switch (cmd) {
  case 'skeleton': await cmdSkeleton(rest); break
  case 'extract':  await cmdExtract(rest);  break
  case 'merge':    await cmdMerge(rest);    break
  case 'build':    await cmdBuild();        break
  case 'markdown': await cmdMarkdown(rest); break
  case 'migrate-collapse': await cmdMigrateCollapse(rest); break
  default:
    console.error(`Unknown command: ${cmd ?? '(none)'}`)
    console.error('Commands: skeleton, extract, merge, build, markdown, migrate-collapse')
    process.exit(1)
}
