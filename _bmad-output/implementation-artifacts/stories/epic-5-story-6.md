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

---

## Dev Agent Record

### Implementation Notes

**`buildPairs` helper:** Groups moves into `MovePair[]` by computing `pairIndex = Math.floor(move_index / 2)`. Array pre-allocated to `Math.ceil(totalMoves / 2)` so placeholder pairs are already present — no separate appending loop needed.

**Auto-scroll with `?.scrollIntoView?.()` double optional chain:** jsdom doesn't implement `scrollIntoView`, so the first `?.` guards against a missing element in the ref map, the second `?.` guards against the method being absent. Both the component and tests needed this pattern.

**Scroll test uses `Object.defineProperty`:** `vi.spyOn(HTMLElement.prototype, 'scrollIntoView')` fails when jsdom hasn't defined the property at all. `Object.defineProperty` with `configurable: true` installs the mock before the render, and `mock.instances[0]` captures the `this` binding (the DOM element) that `scrollIntoView` was called on.

**`data-color` attribute on badge spans:** jsdom normalizes hex colors to `rgb()` when reading `style.backgroundColor`. Badge spans carry a `data-color` attribute with the raw hex value so tests can assert exact colors without needing a hex↔rgb converter.

**Highlight via CSS class + `data-active`:** Active move gets `move-item--active` class (for CSS) and `data-active="true"` (for test selectors). Both are used in the AC and supporting tests.

**Placeholder rows:** When `totalMoves` is set and exceeds `moves.length`, extra pairs are pre-built with no `white`/`black` entries, rendering "Analysing…" placeholders.

### Completion Notes
✅ All AC gate tests pass. 147 frontend tests pass (24 new + 123 prior). 0 regressions.
- Clicking move 5 calls `goToMove(5)` ✓
- Active move has `move-item--active` class ✓
- `scrollIntoView` called on index-10 element on `currentMoveIndex` change ✓

---

## File List
- `frontend/src/components/MoveList.tsx` (new — scrollable move list with badge dots, highlight, auto-scroll, placeholders)
- `frontend/src/components/__tests__/MoveList.ac.test.tsx` (new — 4 AC gate tests)
- `frontend/src/components/__tests__/MoveList.test.tsx` (new — 20 supporting tests)

---

## Change Log
- 2026-03-22: MoveList component, pair rendering, category badges, highlight, auto-scroll, placeholders, 24 tests (Sai Chandan / Claude)

---

## Status
review
