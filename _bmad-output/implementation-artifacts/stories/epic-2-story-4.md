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
