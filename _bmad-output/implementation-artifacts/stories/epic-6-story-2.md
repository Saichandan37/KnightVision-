# Story 6.2 — Mobile Swipe & Responsive Layout

## User Story
As a mobile user, I want to swipe left/right on the board to navigate moves and see the layout adapt to my screen so that the review experience works as well on phone as on desktop.

## Tasks
- Add swipe gesture to `Board.tsx`: `touchstart` + `touchend` listeners; swipe left -> `next()`, swipe right -> `prev()`; minimum swipe distance 50px to avoid accidental triggers
- Responsive layout in main `App.tsx` or layout component:
  - Desktop (>= 768px): board + eval bar left, move list right, move detail card below board, game header top
  - Mobile (< 768px): board full width at top, move detail card below board in a bottom sheet (slide-up panel), move list hidden by default with a toggle button
- Bottom sheet: shows current move detail; draggable up to show more detail, draggable down to minimise
- LLM provider selector: top bar on desktop, collapsible in mobile header
- Use Tailwind 3 responsive prefixes (`md:`, `lg:`) exclusively — no custom media queries

## Acceptance Criterion
On a viewport of 375x667px (iPhone SE), the board renders at full width, swipe left on the board advances `currentMoveIndex` by 1, and the move detail card is visible below the board without scrolling. Verified with React Testing Library with `window.innerWidth = 375`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Board swipe:** Wrapper `<div data-testid="board-container" className="w-full">` added around `<Chessboard>`. `touchStartXRef` captures clientX on `touchstart`; `touchEnd` computes delta and fires `onSwipeLeft`/`onSwipeRight` when `|delta| > 50`. Threshold is exclusive (strictly greater), so exactly 50px does not trigger.

**`ReviewLayout` shared `usePlayback`:** The layout calls `usePlayback(moves.length)` once and wires `next`/`prev`/`goToMove`/`goToStart`/`goToEnd` to all child components (Board swipe, inline playback buttons, MoveList click). The standalone `PlaybackControls.tsx` component (from Story 5.8) is not used here to avoid duplicate hook state.

**Dual `MoveDetailCard` rendering:** Layout renders one `MoveDetailCard` in `hidden md:block` (desktop below board) and another inside `<BottomSheet>` (mobile). In jsdom, Tailwind `md:hidden` classes have no effect, so tests use `getAllByTestId(...)` and assert `length > 0`.

**FEN computation:** `computeFen(moves, upToIndex)` uses real chess.js — replays SANs 0..upToIndex. Defaults to `START_FEN` at index -1 or on exception.

**`BottomSheet`:** Fixed bottom panel on mobile (`fixed bottom-0`), regular in-flow block on desktop (`md:relative`). Drag handle toggles expanded state; touch drag up/down by >40px also expands/collapses. `data-expanded` attribute tracks state.

**`LLMProviderSelector`:** Dropdown with three options (ollama/groq/huggingface). Reads `activeProvider` from store, calls `setActiveProvider` on change. Unhealthy providers append ` ✗` to their label via `providerHealth`.

**`App.tsx`:** Reads `gameId` from store. Renders `<ReviewLayout />` when set, `<UploadZone />` otherwise.

**jsdom touch events:** `fireEvent.touchStart(el, { touches: [{ clientX }] })` and `fireEvent.touchEnd(el, { changedTouches: [{ clientX }] })` work correctly in RTL — `e.touches[0].clientX` and `e.changedTouches[0].clientX` are populated as expected.

### Completion Notes
✅ All AC gate tests pass. 270 frontend tests pass (31 new + 239 prior). 0 regressions.
- `board-container` has `w-full` class ✓
- Swipe left (delta=-100) → `currentMoveIndex` 0 → `MoveDetailCard` visible ✓
- Card DOM position follows board ✓

---

## File List
- `frontend/src/components/Board.tsx` (modified — wrapper div, swipe touch handlers, `onSwipeLeft`/`onSwipeRight` props)
- `frontend/src/components/BottomSheet.tsx` (new — mobile slide-up panel with drag handle)
- `frontend/src/components/LLMProviderSelector.tsx` (new — provider dropdown reading from store)
- `frontend/src/components/ReviewLayout.tsx` (new — full review layout with shared usePlayback)
- `frontend/src/App.tsx` (modified — gameId-based routing to ReviewLayout or UploadZone)
- `frontend/src/components/__tests__/Board.test.tsx` (modified — 7 swipe gesture tests added)
- `frontend/src/components/__tests__/ReviewLayout.ac.test.tsx` (new — 3 AC gate tests)
- `frontend/src/components/__tests__/ReviewLayout.test.tsx` (new — 21 supporting tests)

---

## Change Log
- 2026-03-23: Board swipe, BottomSheet, LLMProviderSelector, ReviewLayout, App routing, 31 tests (Sai Chandan / Claude)

---

## Status
review
