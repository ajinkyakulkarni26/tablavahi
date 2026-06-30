# Tabla Vahi Repository Context

This repository contains **Tabla Vahi / तबला वही**, a web notebook for Tabla
compositions in Marathi Devanagari script. Users enter bols in Marathi, view
English transliteration in Roman script, and display sam, khali, and taali
markers over matras.

## Active Project

- The active application is the React/Vite app in `web/`.
- The root Gradle Java module in `app/` is a legacy starter stub. Do not spend
  time there unless the task explicitly asks for Java/Gradle changes.
- Main user-facing app entry: `web/src/App.tsx`.
- Primary domain types: `web/src/types/index.ts`.

## Common Commands

Run from `web/`:

```bash
npm install
npm run dev
npm run test:run
npm run test:e2e
npm run build
```

Production build output is `web/dist/`.

## Change Workflow

- After every repository change, commit it and push it to `main` immediately.
- Keep commits focused on the change just made.
- If tests or builds are relevant to the change, run them before committing and
  mention any failures or skipped checks in the final handoff.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Vitest
- Playwright for browser layout/e2e tests
- Firebase Auth and Firestore for optional cloud sync
- Local storage fallback for browser-only use

## App Structure

- `web/src/App.tsx`
  - Owns route parsing, top-level state, cloud hydration, local/cloud
    persistence, and screen switching.
- `web/src/components/BrowsePanel.tsx`
  - Library filters by taal, composition kind, and search.
- `web/src/components/CompositionEditor.tsx`
  - Main editing surface. Handles taal/kind changes, matra grid editing,
    section metadata, cycle counts, quick insert bols, marker editing, copy and
    paste across cells, and bulk import.
- `web/src/components/CompositionView.tsx`
  - Read-only composition view with copy/print support and section navigation.
- `web/src/components/BolGrid.tsx`
  - Shared rendered bol grid for display mode handling, vibhag grouping,
    marker display, and section headers.
- `web/src/lib/annotations.ts`
  - Taal marker application, empty line creation, and vibhag grouping.
- `web/src/lib/bulkImport.ts`
  - Parses pasted composition text, detects section headings, sizes imported
    lines, and reports unknown bols.
- `web/src/lib/transliteration.ts`
  - Devanagari bol to English/Roman transliteration and common quick-insert bol
    list.
- `web/src/lib/routes.ts`
  - Path parsing, kind aliases, bol-based slug generation, and section anchors.
- `web/src/lib/compositionNormalization.ts`
  - Trims stored titles, notes, section titles, and bol values.
- `web/src/lib/storage.ts`
  - Local storage persistence for compositions and user quick-insert bols.
- `web/src/lib/cloudPersistence.ts`
  - Firebase initialization, Google sign-in, shared composition load/save/delete.

## Domain Model Notes

- A `Composition` has `taalId`, `kind`, titles, lines, notes, optional owner
  metadata, and timestamps.
- A `CompositionLine` contains `MatraCell[]` and optional `section` /
  `sectionTitle`.
- A `MatraCell` stores one Devanagari bol and optional marker metadata.
- Supported composition kinds are:
  - `taal`
  - `kayda`
  - `peshkar`
  - `prakaar`
  - `rela`
  - `tukda`
  - `chakradar`
  - `other`
- Supported line sections are:
  - `kayda`
  - `prakaar`
  - `tihai`
  - `tukda`
  - `chakradar`
  - `other`

## Taal Data

Taal definitions live in `web/src/data/taals.ts`.

Current built-in taals:

- Teentaal: 16 matras, `[4, 4, 4, 4]`
- Ektaal: 12 matras, `[2, 2, 2, 2, 2, 2]`
- Jhaptaal: 10 matras, `[2, 3, 2, 3]`
- Rupak: 7 matras, `[3, 2, 2]`
- Dadra: 6 matras, `[3, 3]`

`applyTaalMarkers` repeats sam/khali/taali markers across multi-cycle lines.
This matters for tukdas, chakradars, and longer imported lines.

## Persistence

- Local storage key for compositions: `tablavahi-compositions`.
- Local storage key for user quick-insert bols:
  `tablavahi-user-quick-insert-bols`.
- Saved compositions are normalized before persistence.
- When Firebase is configured, the app loads the shared Firestore collection
  and keeps local storage updated with cloud data.
- Firestore collection: `compositions`.
- Firestore rules allow public read, but create/update/delete require Google
  sign-in and composition ownership.

Firebase env vars expected in `web/.env.local` and GitHub Actions secrets:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Routing

- Browse paths:
  - `/`
  - `/{taalId}`
  - `/{taalId}/{kind}`
  - `/?kind={kind}` for all-taal kind filters
- New composition path: `/new`.
- Contact path: `/contact`.
- Composition paths are built from taal, kind, and opening bol slug:
  `/{taalId}/{kind}/{openingBolSlug}`.
- Legacy id-style composition paths are still parsed by `parseAppRoute`.
- Slugs should stay ASCII for bol-derived paths. The tests cover dependent
  Devanagari vowel marks and opening-bol slug safety.

## UI and Language Conventions

- The language is Marathi using Devanagari script, not Hindi.
- Marathi UI strings live in `web/src/locale/mr.ts`.
- Devanagari text generally uses the `font-devanagari` class.
- The app intentionally does not use stored image assets right now. Prefer CSS
  and inline icons for small UI cues instead of adding image storage.
- The app has print-specific styles in `web/src/index.css`.
- Long bols are a recurring usability concern. Keep grid/input widths stable
  and reduce text size based on bol length rather than allowing layout shifts.
- Composition display modes are:
  - Marathi and English
  - Marathi only
  - English only

## Tests and Known Coverage

Tests live in `web/src/lib/__tests__/tablaRules.test.ts`.

Browser layout/e2e tests live in `web/e2e/` and run with:

```bash
cd web
npm run test:e2e
```

The Playwright config uses local Google Chrome outside CI and Playwright
Chromium in CI. Tests seed `localStorage` and blank Firebase env values so they
do not depend on uploaded cloud data.

Current test focus:

- Ektaal marker template across repeated cycles.
- Bulk import line sizing for multi-cycle tukdas.
- Section anchor behavior for plain `other` lines.
- Transliteration of dependent vowel marks.
- ASCII-only opening bol slugs.
- Normalization/trimming of stored composition values.
- Browser layout coverage for browse cards, composition view, copy actions, and
  192-matra editor lines on mobile and desktop widths.

When changing composition parsing, marker logic, route slugs, normalization, or
transliteration, add or update tests in this file.

## Deployment

GitHub Actions workflows:

- `.github/workflows/firebase-hosting-pull-request.yml`
- `.github/workflows/firebase-hosting-merge.yml`

Both install, test, and build the web app from `web/` using Node 20. The merge
workflow deploys to Firebase Hosting project `tablavahi` with live channel.

Firebase config:

- `web/firebase.json`
- `web/firestore.rules`
- `web/firestore.indexes.json`

## Release Baselines

- `v1.0.0` is the major release baseline after the first large composition
  upload.
- Baseline commit: `c7b6b351e4d58c1d3e810f5943416507e5e34703`.
- Use this tag as the known-good rollback/reference point if issues are found
  after this release.

## Recent Context From Repository History

Recent commits before this context file focused on:

- Long bol readability in editor and viewer.
- Tukda compositions can contain a Chakradar section under the main Tukda.
- Repeated default `Chakradar Tihai` lines are displayed/exported as numbered
  sections, e.g. `Chakradar Tihai 1`, `Chakradar Tihai 2`.
- The editor line-length selector supports 12 taal cycles by default, so
  Teentaal lines can be set to 192 matras manually.
- Browse cards show each composition's taal-specific marker sequence, not a
  hardcoded Teentaal marker strip.
- CI validation tests.
- Multi-cycle tukda support.
- Simpler prakar creation and bol-based slugs.
- Ektaal default marker fixes.
- Composition inventory whitespace normalization.
- Trimming bol values before saving.

These are useful areas to preserve when extending the app.
