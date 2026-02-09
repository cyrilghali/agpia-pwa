# AGPIA PWA – Les prières des heures

Mobile-first prayer book reader with offline support, beautiful typography, and frictionless navigation.

## Quick start

```bash
cd webapp
npm install
npm run build:data   # Extract content from EPUB, generate book.json (required once)
npm run dev          # Development server
```

## Production build

```bash
npm run build        # Runs build:data then Vite build
npm run preview      # Serve dist/ locally
```

## Architecture

- **Build script** (`scripts/build-agpia-data.js`): Parses every XHTML chapter from `../AGPIA2009-final-extracted/OEBPS`, extracts structured content blocks (headings, paragraphs, verses, doxologies, instructions, images), and writes `public/agpia/book.json`. Images are copied to `public/agpia/assets/`.
- **React app** (`src/`): Renders content natively (no iframe) with Georgia/serif typography, three themes (light/sepia/dark), adjustable font size, swipe navigation, and scroll memory.
- **PWA** (vite-plugin-pwa): Service worker caches everything (CacheFirst for `/agpia/**`); installable as standalone app.

## Features

- Hour-based quick access grid on landing page
- Continue reading from where you left off
- Collapsible table of contents with nested sections
- Swipe left/right and keyboard arrows for navigation
- Font size control (80%–150%)
- Three themes: light, sepia (default), dark
- Scroll position memory per chapter
- Offline prefetch button to cache all content
- Smooth animations and transitions
