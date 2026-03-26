# Story 4.2 — WebSocket Handler with Buffered Replay

## User Story
As a developer, I want a WebSocket endpoint that starts analysis on connect, replays already-computed moves as buffered messages for late joiners, and streams live results move-by-move so that the frontend always receives a complete ordered sequence.

## Tasks
- Add `WebSocket /ws/analysis/{game_id}` to `backend/app/routers/analysis.py`
- On connect: look up game in store; if not found send `WSError` and close
- If game status is `"pending"`: set to `"analysing"`, start `run_analysis()` as a background task
- If game status is `"analysing"` or `"complete"` (late join): replay all moves already in `game_store.get_moves(game_id)` as `WSMoveResult` with `buffered=True` before streaming live results
- For each new move from the orchestrator: construct `WSMoveResult(buffered=False, **move_result.__dict__)`, get LLM comment via `provider_registry.generate_with_fallback(build_coaching_prompt(move))`, set `comment` and `comment_source`, then send over WebSocket
- Send `WSHeartbeat` every 10 seconds during active analysis
- On analysis complete: send `AnalysisComplete` message, then close WebSocket
- On WebSocket disconnect: cancel background analysis task if still running

## Acceptance Criterion
When a `move_result` message arrives with `buffered: true`, the frontend appends to the moves array without triggering board animation. When `buffered: false` (live stream), normal animated rendering applies. Replaying 30 pre-computed moves must populate the board and move list instantly, not over 4+ seconds of animation catch-up.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Separate `ws_router` for `/ws` prefix:** The story spec requires `WS /ws/analysis/{game_id}`. The existing `router` has prefix `/api/analysis`, which would produce the wrong path. A new `ws_router = APIRouter(prefix="/ws")` is declared in the same file, exported, and registered in `main.py`. Route is `@ws_router.websocket("/analysis/{game_id}")`.

**Pub-sub via `game_store.subscribe/broadcast`:** To support late-join without missing live moves, the WS handler calls `game_store.subscribe(game_id)` BEFORE reading buffered moves. Any new broadcasts that arrive between subscribe and get_moves are queued and deduplicated by `move_index < buffered_count`. New methods added to `MemoryGameStore`: `subscribe`, `unsubscribe`, `broadcast`, `set_result`, `get_result`. `_GameRecord` gains `analysis_result` and `subscribers` fields.

**LLM enrichment in `on_move_result` closure:** The closure enriches each move with LLM commentary via `provider_registry.generate_with_fallback`, then broadcasts the enriched move. `LLMUnavailableError` is caught — empty comment / "fallback" source is used as a graceful fallback.

**`_analysis_task` wrapper broadcasts sentinel:** After `run_analysis` returns, `set_result` stores the `AnalysisComplete`, then `finally: broadcast(game_id, None)` sends the sentinel. This ensures all subscribers (including late joiners) are unblocked even if analysis is cancelled.

**Late-join to complete game:** When `status == "complete"`, buffered moves are replayed and `AnalysisComplete` is fetched from the store and sent immediately. The queue is never awaited.

**`config` access is non-blocking:** `getattr(websocket.app.state, "config", None)` avoids `AttributeError` in tests where the lifespan hasn't been run. In production, lifespan always sets `app.state.config`.

**`receive_json()` has no `timeout` param** in this Starlette version — test helpers use `receive_json()` without timeout; the server closes the socket after `AnalysisComplete`, causing the next `receive_json()` to raise and naturally end collection.

### Completion Notes
✅ Both AC gate tests pass. 246/246 total tests pass (14 new + 232 regression).
- `test_ac_live_stream_moves_have_buffered_false` ✓
- `test_ac_late_join_moves_have_buffered_true` ✓

---

## File List
- `backend/app/store/memory_store.py` (updated — `analysis_result`, `subscribers` on `_GameRecord`; `subscribe`, `unsubscribe`, `broadcast`, `set_result`, `get_result` methods)
- `backend/app/routers/analysis.py` (updated — `ws_router`, `_analysis_task` helper, `ws_analysis` WS endpoint; new imports)
- `backend/app/main.py` (updated — registers `ws_router`)
- `backend/tests/services/test_ws_handler.py` (new — 2 AC gate tests)
- `backend/tests/test_ws_handler.py` (new — 12 supporting tests)

---

## Change Log
- 2026-03-22: WebSocket /ws/analysis/{game_id} — pub-sub late-join replay, LLM enrichment, buffered flag, analysis_complete sentinel (Sai Chandan / Claude)

---

## Status
review
