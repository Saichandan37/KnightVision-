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

---

## Dev Agent Record

### Implementation Notes

**Backend heartbeat confirmed (4.2):** `_HEARTBEAT_INTERVAL = 10.0` in `analysis.py`; `WSHeartbeat(timestamp=time.time())` is sent whenever `asyncio.wait_for(queue.get(), timeout=10)` times out. No code changes needed.

**`useAnalysis` hook — stall detection via functional `setStatus`:** The stall `setInterval` runs every `STALL_CHECK_INTERVAL_MS = 5_000` ms. It uses a functional state update (`setStatus(prev => ...)`) to read current status without a stale closure. Only transitions from `'connecting'` or `'analysing'` → `'stalled'`; completed/error states are left unchanged.

**`lastMessageAt` ref refreshed on every message:** Including heartbeats — so regular 10 s backend heartbeats keep `Date.now() - lastMessageAt.current` well below the 30 s threshold.

**Stall timer cleared on WS close:** `ws.onclose` calls `clearInterval(stallTimer)`. The cleanup function in the `useEffect` return also calls both `ws.close()` and `clearInterval(stallTimer)` for unmount / gameId change safety.

**`StallBanner` component:** `role="alert"` + `aria-live="assertive"` for accessibility. Exposes `onDismiss` callback — the consumer controls visibility. The banner has no auto-dismiss logic (the hook only sets `status` to `'stalled'`; clearing it requires consumer action).

**Fake timers in tests:** `vi.useFakeTimers({ now: 0 })` resets fake time to 0 each test. `vi.advanceTimersByTime(ms)` advances both `Date.now()` and fires pending intervals. All state updates wrapped in `act()`.

**`WS_BASE_URL`:** Reads `import.meta.env['VITE_WS_URL']` with fallback to `ws://localhost:8000`. Tests use a stubbed global `WebSocket` class that ignores the URL.

### Completion Notes
✅ All 4 AC gate tests pass. 22 frontend tests pass. 246 backend tests unaffected.
- `test_ac: status becomes stalled within 35 s of the last message when no messages arrive` ✓
- `test_ac: stall banner is visible when status is stalled` ✓
- `test_ac: status stays analysing when heartbeats arrive every 10 s for 60 s` ✓
- `test_ac: stall banner does NOT appear when heartbeats keep arriving` ✓

---

## File List
- `backend/app/routers/analysis.py` (verified — heartbeat already in place from 4.2, no changes needed)
- `frontend/src/types/analysis.ts` (new — WS message TypeScript types)
- `frontend/src/hooks/useAnalysis.ts` (new — stall detection hook)
- `frontend/src/components/StallBanner.tsx` (new — non-auto-dismissing stall banner)
- `frontend/src/hooks/__tests__/useAnalysis.stall.test.tsx` (new — 4 AC gate tests)
- `frontend/src/hooks/__tests__/useAnalysis.test.tsx` (new — 18 supporting tests)

---

## Change Log
- 2026-03-22: useAnalysis hook with 30 s stall detection, StallBanner component, WS message types, 22 frontend tests (Sai Chandan / Claude)

---

## Status
review
