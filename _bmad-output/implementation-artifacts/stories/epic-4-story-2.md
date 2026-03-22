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
