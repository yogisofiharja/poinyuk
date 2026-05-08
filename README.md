# PoinYuk

A web-first badminton scoring app for small clubs, built with Expo + React Native + TypeScript.
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

## App Flow

```
Setup → Lineup → Match → Final
```

| Screen | What happens |
|---|---|
| **Setup** | Enter all attending players one-by-one (Enter to submit). Pick Single or Double mode and deuce setting. `Start New Session` clears saved state. |
| **Lineup** | Tap players in sequence to fill left/right team slots. Swap sides with animated card transition. Pick or randomise first server. Player chips are sorted by least play-count first and show compact `x` badges for players who have played before. |
| **Match** | Side-by-side square tap cards to add points. Server highlighted with green dot. Undo is centered (with confirmation); End Match is pinned at bottom. |
| **Final** | Winner row highlighted. Share button generates a preview card instantly (default dark-court background). Replace background from gallery or camera. `End Session` clears all data (with confirmation). |

## Code Map

| File | Purpose |
|---|---|
| `App.tsx` | Root orchestrator — 4-screen state machine, handlers, persistence wiring |
| `src/scoring.ts` | Pure badminton/tennis scoring engine (no side-effects) |
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
