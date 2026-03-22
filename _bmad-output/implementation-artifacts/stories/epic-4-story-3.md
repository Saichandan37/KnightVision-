# Story 4.3 — Heartbeat & Dead-Man Timeout

## User Story
As a developer, I want backend heartbeats and a frontend stall detector so that stalled connections are detected and surfaced to the user rather than silently hanging.

## Tasks
- Backend (already started in 4.2): confirm `WSHeartbeat` is sent every 10 seconds during active analysis using `asyncio.create_task` with a loop
- Frontend: in `useAnalysis` hook, track `lastMessageAt = Date.now()` on every incoming WS message
- Frontend: `useEffect` starts a `setInterval` every 5 seconds checking if `Date.now() - lastMessageAt > 30000`
- If stall detected: set `analysisStatus = "stalled"`, display a toast/banner: "Analysis is taking longer than expected — check your Stockfish installation"
- Clear the stall detector interval when WebSocket closes normally
- Stall message must NOT auto-dismiss — user must manually close it

## Acceptance Criterion
When the WebSocket sends no messages for 30 seconds during analysis (simulated by dropping heartbeats in a test), the frontend displays the stall warning banner within 35 seconds of the last message; the banner does not appear during normal analysis with heartbeats.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
