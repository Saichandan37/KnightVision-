# Story 5.8 — Playback Controls & Game Header

## User Story
As a developer, I want playback control buttons and a game header so that users can control auto-play and see game metadata at a glance.

## Tasks
- Create `frontend/src/components/PlaybackControls.tsx` with buttons: go-to-start, prev, toggle play/pause, next (single step), go-to-end
- Buttons wire to `usePlayback` actions
- Show current move position: "Move 12 / 54"
- Create `frontend/src/components/GameHeader.tsx` displaying: White vs Black player names, Elo ratings (if present), result (1-0 / 0-1 / 1/2-1/2), date, opening badge ("B90 · Sicilian: Najdorf"), white accuracy %, black accuracy %
- Accuracy display: coloured percentage — green >= 80%, amber 60–79%, red < 60%
- Both components read from `useAnalysisStore` directly

## Acceptance Criterion
With `analysisStatus = "complete"` and 10 moves in store, clicking go-to-end sets `currentMoveIndex` to 9; clicking go-to-start sets it back to -1; the "Move X / Y" counter updates correctly after each click. Verified with React Testing Library.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`PlaybackControls` — store-integrated, no props:** Reads `moves` from `useAnalysisStore`, passes `moves.length` to `usePlayback`. Counter shows `"Start / {total}"` at index -1, `"Move {n+1} / {total}"` otherwise. All five buttons (`btn-go-to-start`, `btn-prev`, `btn-play-pause`, `btn-next`, `btn-go-to-end`) wire directly to `usePlayback` actions.

**`GameHeader` — reads meta/accuracy from store:** Shows placeholder `game-header-empty` when `meta === null`. White/Black labels include Elo in parens when non-null. Opening badge renders `"{eco} · {name}"` when both present, falls back to whichever is non-null; hidden when both null. Date element hidden when null.

**Accuracy colour function:** `accuracyColor(n)` returns `#6dba6a` (green) for ≥ 80, `#f0c15c` (amber) for ≥ 60, `#ca3431` (red) otherwise. Accuracy row is not rendered at all when both values are null.

**jsdom hex → rgb normalisation in accuracy tests:** Style assertions use `rgb()` form (e.g. `rgb(109, 186, 106)` for `#6dba6a`) since jsdom normalises inline hex colours.

### Completion Notes
✅ All AC gate tests pass. 216 frontend tests pass (44 new + 172 prior). 0 regressions.
- go-to-end with 10 moves → counter "Move 10 / 10" ✓
- go-to-start → counter "Start / 10" ✓
- White player name with Elo rendered correctly ✓
- Opening badge "B90 · Sicilian: Najdorf" ✓
- Accuracy ≥ 80% green, 60–79% amber ✓

---

## File List
- `frontend/src/components/PlaybackControls.tsx` (new — playback button bar wired to usePlayback + store)
- `frontend/src/components/GameHeader.tsx` (new — game metadata + accuracy display)
- `frontend/src/components/__tests__/PlaybackControls.ac.test.tsx` (new — 3 AC gate tests)
- `frontend/src/components/__tests__/PlaybackControls.test.tsx` (new — 18 supporting tests)
- `frontend/src/components/__tests__/GameHeader.ac.test.tsx` (new — 5 AC gate tests)
- `frontend/src/components/__tests__/GameHeader.test.tsx` (new — 18 supporting tests)

---

## Change Log
- 2026-03-22: PlaybackControls + GameHeader components, 44 tests (Sai Chandan / Claude)

---

## Status
review
