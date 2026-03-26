# Story 5.4 — Chessboard Component

## User Story
As a developer, I want an animated chessboard component that renders the current position, shows the best-move arrow on pause, and plays piece animations on live moves.

## Tasks
- Create `frontend/src/components/Board.tsx` using `react-chessboard@4`
- Accept props: `fen: string`, `bestMoveUci: string | null`, `showArrow: boolean`, `onSquareClick?: (square: string) => void`
- Use `customArrows` prop for best-move arrow: `[[fromSquare, toSquare, 'rgba(0, 128, 0, 0.65)']]` (plain string array — react-chessboard v4 API)
- Arrow shown only when `showArrow && bestMoveUci != null`
- Arrow hidden when `isPlaying` (auto-play mode) — pass `isPlaying` as prop
- Piece animation enabled by default (react-chessboard v4 handles this natively)
- Board orientation: White at bottom always for Phase 1
- Board is read-only (no move input)

## Acceptance Criterion
Rendering `<Board fen={startFen} bestMoveUci="e2e4" showArrow={true} />` in a React Testing Library test produces a `<svg>` arrow element; rendering with `showArrow={false}` produces no arrow element.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`react-chessboard` mocked in tests:** The library uses `react-dnd` (HTML5Backend) and `ResizeObserver` internally. Rather than risk jsdom compatibility issues with DnD setup/teardown across tests, `react-chessboard` is mocked to expose `customArrows` prop as `<svg data-testid="arrow">` elements. This lets tests assert on arrow logic directly without fighting library internals.

**Arrow computation is pure:** The `Board` component computes `arrows: Arrow[]` before rendering — empty array when hidden, single-element array when shown. No state needed. Conditions: `showArrow && !isPlaying && bestMoveUci !== null && bestMoveUci.length >= 4`.

**`Arrow` type `[Square, Square, string?]`:** Imported from `react-chessboard/dist/chessboard/types`. The from/to squares are sliced from UCI string (`e2e4` → `['e2', 'e4']`). Color is `'rgba(0, 128, 0, 0.65)'` per story spec.

**Board is read-only:** `arePiecesDraggable={false}`. `boardOrientation="white"` (fixed for Phase 1). `onSquareClick` only forwarded when prop is provided (undefined otherwise).

**`chessboardProps` object in supporting test:** A module-level ref object is populated by the mock's capture so tests can assert on props passed to `Chessboard` without reaching into React internals.

### Completion Notes
✅ All AC gate tests pass. 107 frontend tests pass (14 new + 93 prior). 0 regressions.
- `showArrow=true` + `bestMoveUci="e2e4"` → `<svg>` arrow in DOM ✓
- `showArrow=false` → no arrow element ✓

---

## File List
- `frontend/src/components/Board.tsx` (new — chessboard wrapper with arrow logic)
- `frontend/src/components/__tests__/Board.ac.test.tsx` (new — 2 AC gate tests)
- `frontend/src/components/__tests__/Board.test.tsx` (new — 12 supporting tests)

---

## Change Log
- 2026-03-22: Board component, best-move arrow, read-only board, 14 tests (Sai Chandan / Claude)

---

## Status
review
