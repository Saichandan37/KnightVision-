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
