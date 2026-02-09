# Design System UI/UX

Ce design system évite les incohérences en centralisant les décisions de design (couleurs, espacements, typographie, motion) dans des **tokens** réutilisables.

## Fichiers

- **`tokens.css`** — Variables CSS (préfixe `--ds-*`) à utiliser partout. À importer avant `index.css`.

## Tokens disponibles

### Spacing (`--ds-space-*`)
Utiliser pour `padding`, `margin`, `gap`. Échelle en rem (base 4px).

| Token | Valeur | Usage typique |
|-------|--------|----------------|
| `--ds-space-1` | 0.25rem | Petit gap, padding serré |
| `--ds-space-2` | 0.5rem | Gap entre icône et texte |
| `--ds-space-3` | 0.75rem | Padding interne petit |
| `--ds-space-4` | 1rem | Padding standard |
| `--ds-space-5` | 1.25rem | Padding contenu |
| `--ds-space-6` | 1.5rem | Marges de section |
| `--ds-space-8` | 2rem | Grandes marges |
| `--ds-space-12` | 3rem | Padding page |

### Typography
- **Tailles** : `--ds-text-xs` → `--ds-text-3xl` (body, labels, titres).
- **Line height** : `--ds-leading-tight`, `--ds-leading-normal`, `--ds-leading-loose`, etc.
- **Letter spacing** : `--ds-tracking-wide`, `--ds-tracking-wider` (labels, caps).
- **Fonts** : `--ds-font-serif` (contenu lecture), `--ds-font-ui` (boutons, barres, panneaux).

### Radius
- `--ds-radius-sm` (6px) — images, petits éléments.
- `--ds-radius-md` (8px) — boutons ronds, inputs.
- `--ds-radius-lg` (10px) — cartes, boutons rectangulaires.
- `--ds-radius-xl` (16px) — panneaux modales (sheet).

### Motion
- **Durées** : `--ds-duration-instant`, `--ds-duration-fast`, `--ds-duration-normal`, `--ds-duration-slow`.
- **Easing** : `--ds-ease-out`, `--ds-ease-spring` (drawers, sheets).

### Z-index
- `--ds-z-bar` (50), `--ds-z-progress` (60), `--ds-z-backdrop` (200), `--ds-z-drawer` (201), `--ds-z-sheet` (300), `--ds-z-sheet-panel` (301).

### Couleurs
Les couleurs restent dans `index.css` par thème (`:root`, `[data-theme="light"]`, `[data-theme="dark"]`) : `--bg`, `--text`, `--text-muted`, `--accent`, `--border`, etc. **Ne pas inventer de nouvelles couleurs** : réutiliser ces variables.

## Conventions

### CSS
1. **Préférer les tokens** — `border-radius: var(--ds-radius-lg);` au lieu de `10px`.
2. **Éviter les styles inline** pour le layout/typo — utiliser des classes dans `index.css` qui s’appuient sur les tokens. Les styles inline sont acceptables pour des valeurs **dynamiques** (ex. `width: ${progress}%`, `fontSize: ${settings.fontSize}em`).
3. **Nommage des classes** — style BEM-like : `.block`, `.block--modifier`, `.block-element` (ex. `.landing-btn`, `.landing-btn.primary`, `.hour-card-badge`).

### Composants
- **Boutons** : `.landing-btn` (base), `.landing-btn.primary`, `.landing-btn.secondary`, `.landing-btn.full-width` ; ou `.language-btn`, `.theme-btn`, etc. Toujours `min-height: var(--touch-min)` pour les zones tactiles.
- **États app** : `.app-loading`, `.app-loading-inner`, `.app-loading-icon`, `.app-loading-text` pour l’écran de chargement.
- **Panneaux type sheet** : même structure (handle, padding avec `--ds-safe-bottom`), même `border-radius` et transition (`--ds-ease-spring`).
- **Drawer** : largeur `min(340px, 88vw)`, z-index via `--ds-z-backdrop` / `--ds-z-drawer`.

### Accessibilité & RTL
- Utiliser `inset-inline-start` / `inset-inline-end`, `margin-inline-*`, `padding-inline-*` pour que le RTL soit cohérent.
- Conserver `dir` et `lang` sur les éléments quand la locale l’exige.

## Checklist avant de merger du style

- [ ] Les espacements utilisent `--ds-space-*` ou des multiples cohérents.
- [ ] Les rayons utilisent `--ds-radius-*`.
- [ ] Les polices utilisent `--ds-font-serif` ou `--ds-font-ui` selon le contexte.
- [ ] Les couleurs utilisent les variables de thème (`--text`, `--accent`, etc.).
- [ ] Pas de nouvelle couleur en dur (sauf cas très spécifique documenté).
- [ ] Les transitions utilisent `--ds-duration-*` et `--ds-ease-*`.
- [ ] Les z-index utilisent `--ds-z-*`.
