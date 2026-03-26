# Story 2.2 — Stockfish Service

## User Story
As a developer, I want a Stockfish service that analyses board positions asynchronously so that the FastAPI event loop is never blocked.

## Tasks
- [x] Create `backend/app/services/stockfish_service.py`
- [x] Initialize Stockfish using the `stockfish` Python package; path from `config.yaml` `stockfish.path`, depth from `stockfish.depth`
- [x] Implement `async def analyse_position(board: chess.Board, depth: int) -> dict` using `asyncio.to_thread()` to wrap the blocking Stockfish call — NEVER call Stockfish directly in an async function
- [x] The dict returned must contain: `eval_cp: int`, `best_move_uci: str`, `best_move_san: str`, `top_candidates: list[dict]` (up to 3, each with `uci`, `san`, `centipawns`)
- [x] The perspective flip logic must live exclusively in this file — no other service performs the flip
- [x] Handle Stockfish initialization failure with a clear `RuntimeError`

## Acceptance Criterion
Calling `await analyse_position(board, depth=10)` from an async test returns a dict with `eval_cp`, `best_move_uci`, and `top_candidates` of length <= 3, and the call completes without blocking the event loop (verified by running a concurrent `asyncio.sleep(0)` alongside it without stalling).

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Stockfish binary:** Installed via `brew install stockfish` — `/opt/homebrew/bin/stockfish`. The `STOCKFISH_PATH` constant in the service defaults to this path; `config.yaml` `stockfish.path: null` triggers the default. In Docker/Linux, the binary must be on `$PATH` as `stockfish`.

**Stockfish API perspective (confirmed by probe):**
- `get_top_moves(n)` returns centipawns from the **side-to-move's perspective** (not always White's)
- After White plays e4 (board.turn = BLACK): raw = -55 (bad for Black = good for White)
- After Black plays e5 (board.turn = WHITE): raw = +22 (good for White)

**Flip rule implementation:**
```python
if board.turn == chess.BLACK:   # White just moved — raw is from Black's perspective
    eval_cp = -raw_eval          # negate to get White's (mover's) perspective
else:                            # Black just moved — raw is from White's perspective
    eval_cp = raw_eval           # no flip (stored as-is)
```

**Important note for story 2.4 (orchestrator):** The flip rule means eval_cp values for White moves (positive = good for White) and Black moves (positive = good for White/bad for Black) are NOT from the same player's perspective. The orchestrator must account for this when computing `cp_loss`. Specifically, `eval_before = -eval_after_previous` is needed for correct cp_loss on Black's moves — see story 2.4 implementation notes.

**Thread safety:** A single `threading.Lock` serialises calls to the shared Stockfish subprocess. All blocking work happens in `_analyse_sync()` which is only ever called via `asyncio.to_thread()`.

**Terminal positions:** If `get_top_moves()` returns an empty list (checkmate/stalemate), the service returns a zeroed result rather than raising.

**Mate score handling:** Mate scores (`"Mate"` key non-None) are converted to ±30,000 centipawn sentinel values so the classifier can treat them as extreme evaluations.

### Completion Notes
✅ All tasks complete. 68/68 tests pass (11 new + 57 regression). AC confirmed: dict with `eval_cp`, `best_move_uci`, `top_candidates ≤ 3` returned; `asyncio.sleep(0)` completes concurrently with Stockfish call. Stockfish 18 installed at `/opt/homebrew/bin/stockfish`.

---

## File List
- `backend/app/services/stockfish_service.py` (new)
- `backend/tests/test_stockfish_service.py` (new)
- `config.yaml` (updated path comment)

---

## Change Log
- 2026-03-22: Stockfish service — asyncio.to_thread, perspective flip, thread-safe lock, mate sentinel (Sai Chandan / Claude)

---

## Status
review
