# Story 2.2 — Stockfish Service

## User Story
As a developer, I want a Stockfish service that analyses board positions asynchronously so that the FastAPI event loop is never blocked.

## Tasks
- Create `backend/app/services/stockfish_service.py`
- Initialize Stockfish using the `stockfish` Python package; path from `config.yaml` `stockfish.path`, depth from `stockfish.depth`
- Implement `async def analyse_position(board: chess.Board, depth: int) -> dict` using `asyncio.to_thread()` to wrap the blocking Stockfish call — NEVER call Stockfish directly in an async function
- The dict returned must contain: `eval_cp: int` (centipawns from the MOVER's perspective — apply perspective flip here and ONLY here: `eval_cp = -raw_stockfish_eval` when it is Black's turn after the move), `best_move_uci: str`, `best_move_san: str`, `top_candidates: list[dict]` (up to 3, each with `uci`, `san`, `centipawns`)
- The perspective flip logic must live exclusively in this file — no other service performs the flip
- Handle Stockfish initialization failure with a clear `RuntimeError`

## Acceptance Criterion
Calling `await analyse_position(board, depth=10)` from an async test returns a dict with `eval_cp`, `best_move_uci`, and `top_candidates` of length <= 3, and the call completes without blocking the event loop (verified by running a concurrent `asyncio.sleep(0)` alongside it without stalling).

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
