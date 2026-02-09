# AGPIA PWA – Les prières des heures

Mobile-first prayer book reader with offline support, beautiful typography, and frictionless navigation.

## Quick start

```bash
cd webapp
npm install
npm run dev          # Development server
```

## Production build

```bash
npm run build        # Vite build
npm run preview      # Serve dist/ locally
```

## Architecture

- **Data**: The app uses JSON as the source of truth. Book content lives in `public/agpia/{locale}/book.json` (one file per locale).
- **React app** (`src/`): Renders content natively from the JSON with Georgia/serif typography, three themes (light/sepia/dark), adjustable font size, swipe navigation, and scroll memory.
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
