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

---

## Dev Agent Record

### Implementation Notes

**chess.js v1 validation:** `new Chess().loadPgn(text)` throws on invalid PGN (v1 API change from returning `false`). Wrapped in `isValidPgn()` try/catch helper — returns `true` on success, `false` on throw. Tests mock `chess.js` entirely to control valid/invalid outcomes.

**`useAnalysis` integration:** `UploadZone` calls `uploadPgn(pgnText.trim())` from `useAnalysis`. The hook sets `analysisStatus = 'uploading'` synchronously before the first `await`, so the status transitions immediately on submit.

**Loading state:** `isLoading = analysisStatus === 'uploading' || analysisStatus === 'analysing'`. Button disabled + spinner shown during both phases.

**Backend error surface:** When `analysisStatus === 'error'` (hook sets it on non-OK response), a `data-testid="backend-error"` div shows "Upload failed — please try again". The hook doesn't expose the raw 422 body so a generic message is used; noted for future enhancement.

**Drag-and-drop:** `data-drag-active` attribute tracks visual state (for CSS/test assertions). `FileReader` reads dropped/selected file into textarea. `onDragOver` + `onDragLeave` + `onDrop` wire the full cycle.

**Mobile tap target:** Submit button has `minHeight: '44px'` and `width: '100%'`. Verified in tests via `btn.style.minHeight`.

**Chess.js mock pattern:** `vi.mock('chess.js', ...)` at module level; per-test `setChessValid(true/false)` re-imports and reconfigures the mock constructor. Used in both AC and supporting tests.

### Completion Notes
✅ All AC gate tests pass. 239 frontend tests pass (23 new + 216 prior). 0 regressions.
- Valid PGN + submit → fetch called, status = "uploading" ✓
- Invalid PGN + submit → "Invalid PGN — please check your file" shown, fetch NOT called ✓
- Drop area drag state, file input (.pgn), loading spinner, disabled button all verified ✓

---

## File List
- `frontend/src/components/UploadZone.tsx` (new — PGN upload zone with drag-and-drop, textarea, chess.js validation)
- `frontend/src/components/__tests__/UploadZone.ac.test.tsx` (new — 2 AC gate tests)
- `frontend/src/components/__tests__/UploadZone.test.tsx` (new — 21 supporting tests)

---

## Change Log
- 2026-03-22: UploadZone component, chess.js client validation, 23 tests (Sai Chandan / Claude)

---

## Status
review
