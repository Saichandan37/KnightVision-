# Story 5.3 — usePlayback State Machine

## User Story
As a developer, I want a playback state machine hook so that auto-play, pause, step, and keyboard navigation all update `currentMoveIndex` consistently.

## Tasks
- Create `frontend/src/hooks/usePlayback.ts`
- State: `currentMoveIndex: number` (starts at -1 = starting position), `isPlaying: boolean`, `playbackSpeed: number` (ms per move, default 1000)
- Actions: `play()`, `pause()`, `next()`, `prev()`, `goToMove(index: number)`, `goToStart()`, `goToEnd()`
- Auto-play: `setInterval` advancing `currentMoveIndex` by 1 every `playbackSpeed` ms; stops at last move
- Keyboard bindings (attached via `useEffect` on `document`): `ArrowRight` -> `next()`, `ArrowLeft` -> `prev()`, `Space` -> toggle play/pause, `Home` -> `goToStart()`, `End` -> `goToEnd()`
- `currentMoveIndex = -1` renders the starting board position (no moves played)
- Auto-play pauses when user manually navigates

## Acceptance Criterion
Calling `play()` advances `currentMoveIndex` from -1 to 0 after 1000ms; calling `prev()` while at index 0 keeps `currentMoveIndex` at -1 (no underflow); calling `goToEnd()` with 5 moves sets `currentMoveIndex` to 4. All verified in Vitest.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`moveCountRef`:** A ref keeps `moveCount` current inside interval/effect callbacks without requiring them to re-register. Same pattern used in `useAnalysis` for `lastMessageAt`.

**Two-phase auto-stop:** The interval callback never calls `setIsPlaying` (avoids nested setState antipattern). Instead, a dedicated `useEffect` watches `currentMoveIndex` and calls `setIsPlaying(false)` when the last move is reached. This keeps the interval callback pure (only updates index).

**`isPlayingRef` for keyboard handler:** The `keydown` handler reads `isPlayingRef.current` instead of `isPlaying` to avoid stale closure for Space-bar toggle, while the effect deps remain stable callbacks only.

**Manual navigation always pauses:** `next()`, `prev()`, `goToMove()`, `goToStart()`, `goToEnd()` all call `setIsPlaying(false)` before updating index. Satisfies story requirement "Auto-play pauses when user manually navigates".

**`goToEnd()` with `moveCount=0`:** Returns `moveCount - 1 = -1`, setting index back to starting position — safe edge case.

### Completion Notes
✅ All AC gate tests pass. 93 frontend tests pass (34 new + 59 prior regressions). 0 backend tests affected.
- `play() advances currentMoveIndex from -1 to 0 after 1000ms` ✓
- `prev() while at index 0 keeps currentMoveIndex at -1 (no underflow)` ✓
- `goToEnd() with 5 moves sets currentMoveIndex to 4` ✓

---

## File List
- `frontend/src/hooks/usePlayback.ts` (new — playback state machine + keyboard bindings)
- `frontend/src/hooks/__tests__/usePlayback.ac.test.ts` (new — 3 AC gate tests)
- `frontend/src/hooks/__tests__/usePlayback.test.ts` (new — 31 supporting tests)

---

## Change Log
- 2026-03-22: usePlayback hook, playback state machine + keyboard bindings, 34 tests (Sai Chandan / Claude)

---

## Status
review
