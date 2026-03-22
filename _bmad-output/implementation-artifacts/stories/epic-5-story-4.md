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
