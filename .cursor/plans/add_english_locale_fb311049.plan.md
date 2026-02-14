---
name: Add English locale
overview: Write a Node.js scraping script to fetch English prayers from agpeya.org, generate `public/agpia/en/book.md`, run the existing import/build pipeline, and register the `en` locale in the app.
todos:
  - id: scrape-script
    content: Write scripts/scrape-agpeya-en.mjs to fetch agpeya.org pages and generate public/agpia/en/book.md
    status: pending
  - id: run-pipeline
    content: Run the scraping script, then import + build to generate strings.json and book.json
    status: pending
  - id: fix-mismatches
    content: Fix any block/skeleton mismatches in en/book.md and re-run import+build
    status: pending
  - id: register-locale
    content: Add en locale to types.ts, create en.json UI translations, update i18n.ts
    status: pending
  - id: verify
    content: Run dev server and verify English locale works end-to-end
    status: pending
isProject: false
---

# Add English Locale from [agpeya.org](http://agpeya.org)

## Context

The app uses a build pipeline: `book.md` -> `strings.json` -> (+ `skeleton.json`) -> `book.json`. Adding a new locale means producing an `en/book.md` that matches the skeleton's chapter IDs and block structure, then running the pipeline. The app also needs UI translations (`src/locales/en.json`) and locale registration.

## Source Website

agpeya.org exposes 7 working hour pages (veil.html returns 404):


| Page | Skeleton hour ID |
| ---- | ---------------- |


- `prime.html` -> `dawn`
- `terce.html` -> `third-hour`
- `sext.html` -> `sixth-hour`
- `none.html` -> `ninth-hour`
- `vespers.html` -> `eleventh-hour`
- `compline.html` -> `twelfth-hour`
- `midnight.html` -> `midnight`

Each page has a consistent structure: shared intro (Intro, Lord's Prayer, Thanksgiving, Psalm 50), hour-specific psalms, gospel, litanies, closing sections (Trisagion, Creed, absolution, conclusion). The fetched markdown content maps well to the skeleton block structure.

**Missing from agpeya.org:** Prayer of the Veil (`veil`), Priestly Absolutions (`absolutions`), Miscellaneous Prayers (`prayers`). These sections will be left with empty/placeholder strings and can be filled manually later.

## Step 1 -- Write a scraping script

Create `scripts/scrape-agpeya-en.mjs` that:

1. Fetches each hour page from agpeya.org (using native `fetch`)
2. Extracts text content from the HTML (simple regex/DOM parsing -- the site is static HTML with `<h2>`, `<p>` tags)
3. Maps each `<h2>` section to the corresponding skeleton chapter ID using a manual mapping table (heading text -> chapter ID). The mapping is derived from comparing the French `book.md` TOC structure with the agpeya.org headings.
4. Formats the output as `book.md` following the exact format from [public/agpia/fr/book.md](public/agpia/fr/book.md):
  - Title line: `# AGPIA -- The Coptic Book of Hours`
  - TOC with anchor links (mirroring the French TOC structure but with English titles)
  - Sections separated by `---`, each with `<a id="chapter-id"></a>` + `## Title` + content
  - Block type markers: plain text for paragraphs, `> *text*` for instructions, `> text` for doxologies
5. Writes the result to `public/agpia/en/book.md`

**Key mapping table** (heading -> skeleton chapter ID per hour):

- "Introduction to Every Hour" + "The Lord's Prayer" + "Prayer of Thanksgiving" + "Psalm 50" -> `{hour}-intro` (shared intro chapter, only extracted once from prime.html for `dawn-intro`)
- "Psalms" header paragraph -> first block of the hour's main chapter (e.g. `third-hour`)
- "Psalm N" -> `psalmN` (or `{hour}-psalmN` for duplicates like psalm62, psalm66, etc.)
- "The Holy Gospel..." -> `{hour}-gospel`
- "Litanies" / "Worship Hymn" -> `{hour}-oraisons`
- "The Gloria" -> `dawn-angels-praise`
- "The Trisagion" -> `{hour}-trisagion`
- "Introduction to the Creed" -> `dawn-creed-intro`
- "The Orthodox Creed" -> `dawn-creed`
- "Absolution" -> `{hour}-absolution`
- "Conclusion of Every Hour" -> `conclusion` (shared, extracted once)

## Step 2 -- Run the build pipeline

```bash
node scripts/scrape-agpeya-en.mjs
node scripts/book-tool.mjs import public/agpia/en/book.md
node scripts/book-tool.mjs build
```

This generates `public/agpia/en/strings.json` and `public/agpia/en/book.json`.

## Step 3 -- Register the locale in the app

- **[src/types.ts](src/types.ts):** Add `'en'` to the `SupportedLocale` union type and add an entry to the `LOCALES` array:
  ```typescript
  { code: 'en', name: 'English', dir: 'ltr' }
  ```
- **[src/locales/en.json](src/locales/en.json):** Create English UI translations (translate the ~40 keys from [src/locales/fr.json](src/locales/fr.json)):
  - `app.loading` -> "Loading..."
  - `landing.subtitle` -> "The Coptic Book of Hours"
  - `hours.dawn` -> "Dawn", `hours.3rd` -> "3rd Hour", etc.
  - (all other keys)
- **[src/i18n.ts](src/i18n.ts):** Import `en.json` and add it to the `resources` object:
  ```typescript
  import enJson from './locales/en.json'
  const en: Translations = enJson
  // ...
  en: { translation: en },
  ```
- **[src/locales/schema.ts](src/locales/schema.ts):** No changes needed (schema is structural, not locale-specific).

## Step 4 -- Verify and clean up

- Run `npm run dev` and switch to English locale to verify
- Check that the import step didn't produce warnings about skeleton/block mismatches
- Delete `scripts/scrape-agpeya-en.mjs` after successful generation (one-shot script)

## Risks and known gaps

- **Veil, Absolutions, Prayers sections:** Not available on agpeya.org. These will be empty in `en/strings.json`. They can be filled manually later.
- **Block count mismatches:** The agpeya.org content structure may not perfectly match every block in the skeleton (e.g. some doxology_block children, instruction markers). The import step may warn about mismatches -- these will need manual adjustment in `en/book.md`.
- **Intro/Conclusion sharing:** The skeleton has intro chapters (`dawn-intro`, `third-hour-intro`, etc.) that share the same content. Only `dawn-intro` needs full content in `book.md`; the others are populated in `strings.json` by copying keys from `dawn-intro`.

