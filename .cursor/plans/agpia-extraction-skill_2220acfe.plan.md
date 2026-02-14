---
name: agpia-extraction-skill
overview: Create a project-level Cursor skill that documents the full workflow for extracting French liturgical text from an ODT source file into the Agpia book.md / strings.json / book.json pipeline, capturing all the domain knowledge and gotchas learned during our sessions.
todos:
  - id: create-skill-dir
    content: Create .cursor/skills/agpia-odt-extraction/ directory
    status: pending
  - id: write-skill-md
    content: Write SKILL.md with frontmatter, workflow steps, formatting rules, and pipeline gotchas
    status: pending
isProject: false
---

# Agpia ODT Extraction Skill

## Location

`.cursor/skills/agpia-odt-extraction/SKILL.md` (project-level, shared with repo)

## Skill Content

The skill encodes the end-to-end workflow we followed across multiple sessions:

### Step 1 -- Convert ODT to plain text

- Use `pandoc` to convert the binary ODT to a temporary plain text file (`/tmp/agpia_apollos.txt`)
- The ODT has a two-column table layout: **Coptic (left) | French (right)**
- Only the French column should be extracted

### Step 2 -- Locate sections in the converted text

- Use `rg` to search for hour names (e.g. `SEXTE`, `NONE`, `VÊPRES`, `COMPLIES`, etc.)
- Extract relevant line ranges with `sed` into per-hour temp files

### Step 3 -- Parse French text from table columns

- The converted text uses `|` pipe-separated columns
- French text is always in the rightmost column
- Skip verse numbers (e.g. "1.", "2.") and ellipsis entries ("...")

### Step 4 -- Fill `book.md` TODO placeholders

Each hour section in `book.md` has `<!-- TODO: Traduire ... -->` comments. Replace them with extracted French text following these **formatting rules**:

- **Intro**: "Allons, prosternons-nous..." triplet + standard prayer + hour-specific hymn + `_Psaume de David le Prophète..._` in italics
- **Psalms**: flowing paragraphs, no verse numbers, blank line between verses
- **Gospel**: italic intro `_Gloire à Toi ô notre Dieu ! Seigneur, bénis..._`, body text, italic closing `_Gloire à toi Seigneur !_` + closing doxology
- **Tropaires**: Coptic liturgical markers (`## Ⲇⲟⲝⲁ Ⲡⲁⲧⲣⲓ...` / `### Gloire au Père...`), `ⲕⲉ ⲛⲩⲛ...` with `> Et maintenant...` blockquotes
- **Absolution**: plain paragraphs

### Step 5 -- Run the pipeline

```bash
node scripts/book-tool.mjs import public/agpia/fr-apollos/book.md
```

**Critical**: the import wipes shared chapters. After import, fix them:

- **Intros** (`*-intro`): copy all `chapters.dawn-intro.blocks.*.text` values to `third-hour-intro`, `sixth-hour-intro`, `ninth-hour-intro`, `eleventh-hour-intro`, `twelfth-hour-intro`, `veil-intro`, `midnight-intro` in `strings.json`
- **Conclusions** (`conclusion_*`): copy `chapters.conclusion.blocks.*.text` to all `conclusion_3h`, `conclusion_6h`, `conclusion_9h`, `conclusion_11h`, `conclusion_12h`, `conclusion_voile`, `conclusion_minuit`
- **Empty structural blocks**: copy any remaining empty `chapters.*.blocks.*.text` values from `fr/strings.json` (headings, rubrics, liturgical responses)

Then rebuild:

```bash
node scripts/book-tool.mjs build
```

### Step 6 -- Verify

- `grep '<!-- TODO:' book.md` should return nothing for filled sections
- Check `strings.json` has 0 empty text fields that exist in `fr/strings.json`

## Key files referenced

- Source ODT (user-provided, typically in `~/Downloads/`)
- `public/agpia/fr-apollos/book.md` -- human-editable source
- `public/agpia/fr-apollos/strings.json` -- per-locale strings (import output)
- `public/agpia/fr-apollos/book.json` -- generated (never edit)
- `public/agpia/skeleton.json` -- shared structure
- `public/agpia/fr/strings.json` -- reference locale for structural blocks
- `scripts/book-tool.mjs` -- import/build tool
- `.cursor/rules/agpia-book-pipeline.mdc` -- existing pipeline rule

