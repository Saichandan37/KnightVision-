# Story 6.1 — PGN Upload UI

## User Story
As a user, I want a drag-and-drop upload zone and a PGN text paste area so that I can get my game into KnightVision without friction on both desktop and mobile.

## Tasks
- Create `frontend/src/components/UploadZone.tsx`
- Drag-and-drop area: accepts `.pgn` files; shows "Drop PGN file here or click to browse" placeholder
- Text area below: "Or paste PGN text here" with a submit button
- Client-side validation using `chess.js`: parse the PGN before upload; show inline error "Invalid PGN — please check your file" if invalid
- On valid PGN: call `uploadPgn(pgnText)` from `useAnalysis`, show loading spinner
- Error state from backend (422): display `error` field from response inline
- Mobile: full-width layout, large tap targets (min 44x44px)
- The upload zone is the initial view; replaced by the review board once `gameId` is set

## Acceptance Criterion
Pasting a valid PGN string and clicking submit calls `uploadPgn` and transitions `analysisStatus` from `"idle"` to `"uploading"`; pasting an invalid PGN string and clicking submit shows the inline error message without making a network request.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
