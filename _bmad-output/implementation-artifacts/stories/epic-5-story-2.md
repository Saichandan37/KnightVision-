# Story 5.2 — useAnalysis Hook & WebSocket Client

## User Story
As a developer, I want a `useAnalysis` hook that manages the full upload-to-WebSocket flow so that components trigger analysis with one call and receive streamed results automatically.

## Tasks
- Create `frontend/src/hooks/useAnalysis.ts`
- `uploadPgn(pgnText: string): Promise<void>` — POST to `/api/analysis/upload`, store `gameId`, open WebSocket to `/ws/analysis/{gameId}`
- WebSocket `onmessage`: parse JSON, dispatch to store based on message type (`move_result` -> `appendMove`, `analysis_complete` -> `setStatus("complete") + setAccuracy`, `heartbeat` -> update `lastMessageAt`, `error` -> `setStatus("error")`)
- `buffered: true` messages: call `appendMove` but do NOT trigger any animation (pass `buffered` flag through to store if needed)
- Dead-man timeout wired here (30s stall detection — see Story 4.3)
- `cleanup()` closes WebSocket and clears stall timer
- Export: `{ uploadPgn, analysisStatus, cleanup }`

## Acceptance Criterion
In a Vitest test with a mocked WebSocket server, calling `uploadPgn(validPgn)` results in `analysisStore.moves.length > 0` after 5 simulated `move_result` messages are dispatched; a `buffered: true` message does not change a `shouldAnimate` flag.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
