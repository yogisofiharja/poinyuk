# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run web          # Start dev server at http://localhost:8081 (web only — primary target)
npm test             # Run all tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run build:web    # Build for production (outputs to dist/)
npm run preview:web  # Serve the production build locally
```

To run a single test file:
```bash
npx vitest run src/scoring.test.ts
```

Deployment is via Vercel (`vercel.json` sets `buildCommand: npm run build:web`, `outputDirectory: dist`).

## Architecture

This is a **web-first** React Native + Expo app (TypeScript, Expo ~54). It targets Expo Web only in practice — native Android/iOS is post-MVP. `react-native-web` bridges RN components to the DOM. The scoring engine implements **tennis rules** (0/15/30/40/D/AD points, games, sets).

### Screen flow

`App.tsx` owns all state and drives a manual screen state machine:

```
setup → lineup → match → final
```

There is no routing library. The active screen is a `AppScreen` union type (`'setup' | 'lineup' | 'match' | 'final'`). All screen transitions, scoring logic calls, and share card generation happen in `App.tsx`.

### Key source files

- **`src/scoring.ts`** — Pure scoring engine with no side effects. `MatchState` is immutable-style: `addPoint()` and `endMatchNow()` return new state objects. The engine handles tennis point labels (0/15/30/40/D/AD), deuce modes (`standard` or `singleDeuceSuddenDeath`), game counting, service rotation, and **set scoring** (winning 6 games increments `sets`, resets `games` to 0-0, and appends the final game scores to `completedSets`).

- **`src/persistence.ts`** — `localStorage`-backed session state. Contains backward-compat migration logic (`normalizeSetup`) that handles three historical save formats plus inline migrations for `sets`/`completedSets` fields added in later versions. The `StorageLike` interface makes it testable without a DOM.

- **`src/shareCard.ts`** — Canvas-based share card generator. `composeShareCardDataUrlWeb()` draws a 1080×1920 image with a background (default: programmatic dark court design, or a user photo), gradient overlay starting from the **vertical midpoint**, and score text. `pickImageDataUrlWeb()` appends a hidden file input to `document.body` before `.click()` — required to avoid GC on mobile Safari. Accepts optional `setBreakdown` string rendered below the main score (used when sets have been played).

- **`src/appTypes.ts`** — Shared types: `SetupForm`, `LineupResult`, `TeamASide`, `PersistedAppState`.

- **`src/components/ui.tsx`** — Shared component primitives: `Card`, `Button`, `DecorativeBackdrop`, `Input`. Uses a `palette` object for all colours (orange/blue/yellow theme).

### UI conventions

All UI copy is in **Bahasa Indonesia**. Every screen opens with a `<Card tone="accent">` containing only `<Text>PoinYuk</Text>` as a branding banner — no content labels in that top card.

### Team A / Team B and sides

`Team` is always `'A'` or `'B'` internally. In `LineupScreen`, players assigned to the **left slot become Team A**, right slot becomes Team B. The "Tukar Tempat" button physically swaps the players between `assignedOrder` slots (the first `perTeam` entries are always KIRI/left). Static "KIRI"/"KANAN" labels live in their own row and never animate; only the player names animate during the swap. `teamASide` in persisted state is always `'left'`.

`MatchScreen` uses `teamASide` to decide which card renders on which side of the screen. The share card in `shareCard.ts` always renders Team A on the left of the image.

### Set scoring

When a team reaches 6 games, `addPoint()` pushes the current game scores to `completedSets`, increments `sets[winner]`, and resets `games` to `{A:0, B:0}`. `endMatchNow()` checks `sets` first, then `games`, then `points` to decide the winner. The share card in `App.tsx` uses `sets` to decide whether to show a set score or game score as the headline number, and passes `setBreakdown` (e.g. `"6–3  ·  4–6"`) when sets have been played.

### Player play counts

`playerPlayCounts: Record<string, number>` (keyed by player name) is incremented when a match ends and persisted. `LineupScreen` uses it to sort the player pool (lowest play count first) and display `x` badges. `serverCandidates` for the first-server picker is derived from the stable `sortedPlayers` array, not from `assignedOrder`, so swapping sides does not change the server picker order.

### Tests

Tests live alongside source: `src/scoring.test.ts` and `src/persistence.test.ts`. Vitest is configured to run in Node environment. There is no test setup file — tests import modules directly.
