# Story 2.4 — Analysis Orchestrator

## User Story
As a developer, I want an analysis orchestrator that coordinates the PGN parser, Stockfish service, and move classifier into a single pipeline so that a game ID maps to a complete list of `MoveResult` objects.

## Tasks
- Create `backend/app/services/analysis_orchestrator.py`
- Async function `run_analysis(game_id: str, pgn: str, config: AppConfig, on_move_result: Callable[[MoveResult], Awaitable[None]]) -> AnalysisComplete`
- Flow: parse PGN -> for each ply, analyse with Stockfish -> classify -> construct `MoveResult` -> call `on_move_result` callback -> append to store
- `move_index` is 0-based ply counter; `move_number` is `(move_index // 2) + 1`
- `eval_before_cp` for ply N = `eval_after_cp` of ply N-1 (starting position eval = 0)
- After all moves: compute `white_accuracy` and `black_accuracy` as `max(0, 100 - avg_cp_loss)` for each side
- Set game status to `analysing` at start, `complete` at end, `error` on exception
- The orchestrator must NOT call `on_move_result` with LLM commentary — that is injected by the calling layer (Epic 4)

## Acceptance Criterion
Given a 5-move test PGN, `run_analysis()` calls `on_move_result` exactly 5 times with correctly sequenced `move_index` values (0–4), and `AnalysisComplete.total_moves` equals 5.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Perspective fix for Black moves:** The Stockfish service returns `eval_cp` in White's perspective for *both* sides (after White's move the flip is applied; after Black's move the raw value is White's-perspective). To compute correct `cp_loss` for Black's plies, both `eval_before` and `eval_after` are negated (White's persp → Black's/mover's persp) before `max(0, eval_before - eval_after)`. This follows the explicit warning in story 2.2's implementation notes: "eval_before = -eval_after_previous is needed for correct cp_loss on Black's moves." The story 2.4 task spec (no negation) would produce inverted cp_loss for Black — the AC doesn't test this directly but correctness requires the negation.

**StockfishService injection:** `run_analysis()` accepts an optional `stockfish_service` parameter (default None → create from config). Tests pass a mock to avoid real Stockfish subprocess overhead.

**comment / comment_source fields:** MoveResult requires both fields. Orchestrator sets `comment=""` and `comment_source="fallback"` — LLM commentary is injected by the Epic 4 WebSocket layer.

**Store sequencing:** `on_move_result` callback is called first (enables live streaming before persistence), then `game_store.append_move`. Status transitions: `analysing` → `complete` on success, `error` on any exception.

**Accuracy formula:** `max(0.0, 100.0 - avg_cp_loss)` per side. Empty side (no moves) → 100.0.

### Completion Notes
✅ AC gate test passes. 97/97 total tests pass (8 new + 89 regression).
AC test: `test_ac_five_move_game_callback_count_and_indices` — 5-ply PGN, callback called exactly 5 times with move_index [0,1,2,3,4], `AnalysisComplete.total_moves == 5` ✓

---

## File List
- `backend/app/services/analysis_orchestrator.py` (new)
- `backend/tests/test_analysis_orchestrator.py` (new — 8 tests including AC gate)

---

## Change Log
- 2026-03-22: Analysis orchestrator — run_analysis(), perspective fix for Black cp_loss, status transitions, accuracy formula, AC gate + 7 supporting tests (Sai Chandan / Claude)

---

## Status
review
