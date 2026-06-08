# PoinYuk

A web-first tennis scoring app for small clubs, built with Expo + React Native + TypeScript.
Designed for mobile browsers — large tap targets, fast session setup, instant share card.

## Run The App

1. Open terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Run web app:

```bash
npm run web
```

When Expo opens, press `w` if needed to open browser.

## Run Tests

```bash
npm test
```

## Deploy To Vercel

This app is deployed as a static Expo web export.

### 1) Build locally (optional check)

```bash
npm run build:web
```

This generates the production web files in `dist/`.

### 2) Deploy with Vercel CLI

```bash
npm i -g vercel
vercel
```

For production deployment:

```bash
vercel --prod
```

### 3) Or deploy from GitHub

1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Keep defaults (the included `vercel.json` already sets build/output):
	- Build command: `npm run build:web`
	- Output directory: `dist`

## App Flow

```
Setup → Lineup → Match → Final
```

| Screen | What happens |
|---|---|
| **Setup** | Enter all attending players one-by-one (Enter to submit). Pick Single or Double mode and deuce setting. `Sesi Baru` clears saved state. |
| **Lineup** | Tap players in sequence to fill KIRI/KANAN slots. `Tukar Tempat` physically swaps players between slots (KIRI/KANAN labels stay fixed; only player names animate). Pick or randomise first server — server picker order is stable across swaps. Player chips are sorted by least play-count first and show compact `x` badges. |
| **Match** | Side-by-side tap cards to add points. SET / GAME / POIN columns in the banner. Server highlighted with green dot. Undo has no confirmation; End Match is pinned at bottom. Reaching 6 games triggers a set: set counter increments and games reset to 0-0. |
| **Final** | TV-style scoreboard: set total + per-set game breakdown. Share button generates a preview card (set score headline when sets played, game score otherwise; per-set breakdown shown below). Replace background from gallery or camera. `Akhiri Sesi` clears all data (with confirmation). |

## Code Map

| File | Purpose |
|---|---|
| `App.tsx` | Root orchestrator — 4-screen state machine, handlers, persistence wiring |
| `src/scoring.ts` | Pure tennis scoring engine (no side-effects) |
| `src/scoring.test.ts` | Scoring unit tests |
| `src/persistence.ts` | localStorage parse / save / load / clear with backward-compat migration |
| `src/persistence.test.ts` | Persistence unit tests |
| `src/shareCard.ts` | Canvas share-card composer + web photo picker |
| `src/appTypes.ts` | Shared TypeScript types (`SetupForm`, `LineupResult`, `PersistedAppState`, …) |
| `src/components/ui.tsx` | shadcn-inspired primitives: `Card`, `Button`, `Pill`, `Input`, `DecorativeBackdrop` |
| `src/components/MatchSetup.tsx` | Setup screen |
| `src/components/LineupScreen.tsx` | Lineup / team-assignment screen |
| `src/components/MatchScreen.tsx` | Live match screen |
| `src/components/FinalScoreScreen.tsx` | End-of-match result + share screen |

## Notes

- Persistence uses web `localStorage`; state survives page refresh.
- Old save formats (pre-v4 player fields) are migrated automatically on load.
- Player play-count stats are persisted and reset when session is cleared.
- Share card background image is reset when a new match starts.
- Node 20.19.4+ recommended for Expo SDK 54.
