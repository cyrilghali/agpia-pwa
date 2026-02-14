---
name: Capacitor iOS Deployment
overview: Add Capacitor to the existing Vite+React PWA to build a native iOS app wrapper, then configure everything needed for App Store submission.
todos:
  - id: install-cap
    content: Install @capacitor/core, @capacitor/cli, @capacitor/ios
    status: pending
  - id: cap-config
    content: Create capacitor.config.ts with appId, appName, webDir
    status: pending
  - id: init-ios
    content: Run npm run build, npx cap add ios, npx cap sync to scaffold the iOS project
    status: pending
  - id: package-scripts
    content: Add cap:sync and cap:open convenience scripts to package.json
    status: pending
  - id: gitignore
    content: Update .gitignore for ios/App/Pods/ and Podfile.lock
    status: pending
  - id: app-icon
    content: Generate or place the 1024x1024 app icon in the Xcode asset catalog
    status: pending
  - id: xcode-signing
    content: Configure signing, team, bundle ID, and deployment target in Xcode (manual)
    status: pending
  - id: test-device
    content: Build and run on simulator and real device to verify safe areas, fonts, navigation
    status: pending
  - id: app-store-submit
    content: Create App Store Connect listing and submit via Xcode archive
    status: pending
isProject: false
---

# Capacitor iOS App Store Deployment

## Prerequisites (manual, outside this repo)

- **Apple Developer account** ($99/year) enrolled at [developer.apple.com](https://developer.apple.com)
- **Xcode 15+** installed from the Mac App Store
- **Xcode Command Line Tools** (`xcode-select --install`)
- **A 1024x1024 PNG app icon** -- the current manifest references `/agpia/assets/cover.png` which does not exist in the repo. You will need to provide this asset.

## 1. Install Capacitor

Add three packages (no other dependencies needed):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

These are the minimal Capacitor packages. Per the project philosophy, no additional Capacitor plugins are needed -- the app is a reader with no native API requirements (no camera, push notifications, etc.). The status bar and safe areas are already handled by CSS (`--safe-top` / `--safe-bottom` in [src/index.css](src/index.css)).

## 2. Create Capacitor config

Create `[capacitor.config.ts](capacitor.config.ts)` at the project root:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agpia.app',       // choose your real bundle ID
  appName: 'AGPIA',
  webDir: 'dist',               // matches Vite's output
  server: {
    // No live reload URL -- use bundled assets
  }
};

export default config;
```

Key decisions:

- `webDir: 'dist'` points to the Vite build output
- No server URL means the app loads bundled web assets (true offline support)
- `appId` must match the Bundle Identifier you register in Apple Developer portal

## 3. Initialize the iOS platform

```bash
npm run build          # build web assets into dist/
npx cap add ios        # creates ios/ directory with Xcode project
npx cap sync           # copies dist/ into the native project
```

This creates an `ios/` folder with a full Xcode project. Add `ios/` to `.gitignore` or commit it (Capacitor recommends committing it for reproducible builds).

## 4. App icon and splash screen

The iOS project needs proper icons. Options:

- **Option A (recommended)**: Place a 1024x1024 `AppIcon.png` in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and update the corresponding `Contents.json`. Xcode 15+ only needs a single 1024x1024 image.
- **Option B**: Use the `[@capacitor/assets](https://capacitorjs.com/docs/guides/splash-screens-and-icons)` tool to auto-generate all sizes from a source image:

```bash
npx @capacitor/assets generate --ios
```

This expects `assets/icon-only.png` (1024x1024) and `assets/splash.png` (2732x2732) at the project root.

## 5. Update build scripts in [package.json](package.json)

Add convenience scripts:

```json
{
  "scripts": {
    "cap:sync": "npm run build && npx cap sync",
    "cap:open": "npx cap open ios"
  }
}
```

## 6. Handle Google Fonts for offline

The app loads Noto Sans Coptic and Noto Naskh Arabic from Google Fonts CDN ([index.html](index.html) lines 14-16). In the native app, this works online but fails on first cold launch without internet.

Two options:

- **Keep as-is**: The Workbox runtime caching rules in [vite.config.ts](vite.config.ts) already cache Google Fonts. After one online load, fonts are cached. Acceptable for v1.
- **Bundle locally** (optional improvement): Download the `.woff2` files into `public/fonts/`, add `@font-face` declarations in CSS, remove the Google Fonts `<link>`. Better for a prayer book that should work 100% offline.

Recommendation: keep as-is for v1, bundle later if users report issues.

## 7. Xcode configuration (manual steps)

Open the project:

```bash
npx cap open ios
```

In Xcode:

1. Select the **App** target -> **Signing & Capabilities**
2. Set **Team** to your Apple Developer account
3. Set **Bundle Identifier** to match `appId` in Capacitor config (e.g., `com.agpia.app`)
4. Set **Deployment Target** to iOS 16.0 (reasonable minimum)
5. Under **General**, set **Display Name** to "AGPIA"
6. Verify **Device Orientation** settings (likely Portrait only for a reader app)

## 8. Update `.gitignore`

Add entries for Capacitor-generated files:

```
ios/App/Pods/
ios/App/Podfile.lock
```

Whether to commit `ios/` itself is a team preference. Capacitor recommends committing it.

## 9. Build and test flow

The day-to-day workflow becomes:

```
npm run build       # build web assets
npx cap sync        # copy to native project
npx cap open ios    # open Xcode
```

Then in Xcode: Product -> Run (on simulator or device).

## 10. App Store submission checklist

Before submitting via Xcode -> Product -> Archive -> Distribute:

- App icon (1024x1024) set in Xcode asset catalog
- Bundle ID registered in Apple Developer portal
- App Store Connect listing created with screenshots, description, keywords
- Privacy policy URL (required even for simple apps)
- At least 3 screenshots per supported device size
- Version and build number set in Xcode
- Test on a real device (not just simulator)

## Files changed summary


| Action    | File                                    |
| --------- | --------------------------------------- |
| New       | `capacitor.config.ts`                   |
| Modified  | `package.json` (dependencies + scripts) |
| Modified  | `.gitignore` (add ios/App/Pods/)        |
| Generated | `ios/` directory (by `npx cap add ios`) |


