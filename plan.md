## PoinYuk — App Plan

A web-first badminton / tennis scoring app for small clubs, built with React Native + Expo + TypeScript targeting Expo Web. Same codebase can later be packaged for Android and iOS.

---

### Shipped ✅

#### Phase 1 — Core Setup
- Expo TypeScript project running on Expo Web.
- Single / Double mode selection.
- Player name entry (minimum 2 for single, 4 for double).

#### Phase 2 — Match Rules & Scoring
- Pure scoring engine (`src/scoring.ts`) with configurable deuce:
  - Standard deuce, or
  - Single deuce then sudden death.
- Service indicator logic (current server tracked throughout match).
- Tap-to-add-point per team card.
- Undo with full state rollback across edge transitions.
- End match anytime (leader wins; tied = draw).

#### Phase 3 — UI / UX Overhaul
- shadcn-inspired custom component layer (`src/components/ui.tsx`) — bold orange / blue / yellow palette.
- TV-style score banner with game + point columns.
- Side-by-side tap cards (always row layout, no stacking) with square card layout.
- Server highlighted with green dot on serving player's name (banner + tap card); no text label.
- Serving team card gets blue border highlight.
- Match controls refined: centered Undo (with confirmation) and End Match pinned to bottom.

#### Phase 4 — Club Session Flow
- **Setup screen** (`MatchSetup.tsx`): shared player pool, one-by-one Enter-to-add input, mode pill, deuce toggle.
- **Lineup screen** (`LineupScreen.tsx`): tap players in sequence → first N go to left card, next N to right card. Animated card swap with `⇄ Tukar Tempat`. Server picker with random-spinner animation.
- Player rotation helpers: play-count tracking per player, shown as compact `x` badges, and player list sorted by lowest play-count first.
- **Match screen** → **Final screen** flow, screen state persisted to `localStorage`.
- Backward-compat migration in `persistence.ts` handles all historical save formats.

#### Phase 5 — Final Screen & Share
- Winner row highlighted (name bold, score orange); loser row muted.
- "Share" button immediately generates a preview card — default background is a programmatic dark-gradient badminton court design (no photo required).
- Gallery / Camera buttons inside preview to swap background photo.
- Share card simplified: matchup + final game score only (no winner/point text), black fade overlay, stronger bottom emphasis, and bottom-centered score layout.
- Uploaded share background now resets each new match.
- Setup action uses `Start New Session`; Final screen bottom action uses `End Session` (both confirmed before clearing data).
- "Match Baru" goes straight to lineup selection, preserving the player pool.

---

### Deferred / Post-MVP 🔲

1. Native Android / iOS packaging and platform-specific sharing.
2. Match history log across sessions.
3. Club / player profiles.
4. Advanced tournament formats (round-robin, elimination bracket).
5. Offline-first sync / cloud backup.
