# Story 5.6 — Move List

## User Story
As a developer, I want a scrollable move list component with colour-coded badges so that users can click any move to jump to it and see the quality classification at a glance.

## Tasks
- Create `frontend/src/components/MoveList.tsx`
- Render moves in chess notation pairs (1. e4 e5, 2. Nf3 Nc6, ...)
- Each move has a coloured badge dot matching `MoveCategory` colour:
  - brilliant: `#1baaa6` (teal), great: `#5ca0d3` (blue), best: `#6dba6a` (green), good: `#96bc4b` (yellow-green), inaccuracy: `#f0c15c` (amber), mistake: `#e8834e` (orange), blunder: `#ca3431` (red)
- Clicking a move calls `goToMove(move_index)` from `usePlayback`
- Currently selected move is highlighted with a background tint
- List auto-scrolls to keep the current move visible during auto-play
- Show analysis progress: "Analysing move 12/54..." placeholder rows for moves not yet computed

## Acceptance Criterion
Clicking move at index 5 in the move list calls `goToMove(5)` and adds the highlight class to that move's element; during auto-play advancing to index 10, the list has scrolled so the index-10 element is visible in the viewport. Verified with React Testing Library.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
