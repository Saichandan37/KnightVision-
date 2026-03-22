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
