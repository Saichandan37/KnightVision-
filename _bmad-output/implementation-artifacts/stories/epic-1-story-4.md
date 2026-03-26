# Story 1.4 — Pydantic Models

## User Story
As a developer, I want all shared data models defined in one place so that the API, services, and WebSocket layer all use the same typed structures.

## Tasks
- [x] Create `backend/app/models/api.py` with these Pydantic models:
  - [x] `MoveCategory` (str Enum): `brilliant`, `great`, `best`, `good`, `inaccuracy`, `mistake`, `blunder`
  - [x] `CandidateMove`: `uci: str`, `san: str`, `centipawns: int`
  - [x] `MoveResult`: `move_index: int`, `move_number: int`, `san: str`, `uci: str`, `category: MoveCategory`, `cp_loss: int`, `eval_before_cp: int`, `eval_after_cp: int`, `best_move_uci: str`, `best_move_san: str`, `top_candidates: list[CandidateMove]`, `comment: str`, `comment_source: Literal["llm", "fallback"]`
  - [x] `WSMoveResult`: extends/wraps `MoveResult`, adds `buffered: bool = False`
  - [x] `WSHeartbeat`: `type: Literal["heartbeat"] = "heartbeat"`, `timestamp: float`
  - [x] `WSError`: `type: Literal["error"] = "error"`, `message: str`
  - [x] `AnalysisComplete`: `type: Literal["analysis_complete"] = "analysis_complete"`, `white_accuracy: float`, `black_accuracy: float`, `total_moves: int`
  - [x] `GameMeta`: `white: str`, `black: str`, `white_elo: Optional[int]`, `black_elo: Optional[int]`, `result: str`, `date: Optional[str]`, `opening_eco: Optional[str]`, `opening_name: Optional[str]`
- [x] Create `backend/app/models/__init__.py` re-exporting all models

## Acceptance Criterion
`from backend.app.models.api import MoveResult, WSMoveResult, MoveCategory` executes without import errors, and `WSMoveResult(buffered=True, **move_result_dict)` correctly sets `buffered=True` on a constructed instance.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- `MoveCategory` extends both `str` and `Enum` so instances compare equal to plain strings (e.g. `MoveCategory.blunder == "blunder"`) — required for JSON serialisation and switch statements
- `WSMoveResult` inherits directly from `MoveResult` with one additional field (`buffered: bool = False`) — Pydantic v2 inheritance works cleanly; `WSMoveResult(buffered=True, **move_result_dict)` passes the AC verbatim
- `comment_source: Literal["llm", "fallback"]` — Pydantic v2 validates this strictly; passing any other value raises `ValidationError`
- All optional fields in `GameMeta` default to `None` — no `Optional` wrapper needed in Pydantic v2 when using `= None`
- `__init__.py` uses explicit `__all__` to make re-exports clear for IDEs and static analysis

### Completion Notes
✅ All tasks complete. 29/29 tests pass (15 new model tests + 14 regression). AC confirmed: `WSMoveResult(buffered=True, **make_move_result_dict()).buffered is True`.

---

## File List
- `backend/app/models/api.py` (new)
- `backend/app/models/__init__.py` (modified — was empty, now re-exports all models)
- `backend/tests/test_models.py` (new)

---

## Change Log
- 2026-03-22: Pydantic models — MoveCategory, CandidateMove, MoveResult, WSMoveResult, WSHeartbeat, WSError, AnalysisComplete, GameMeta (Sai Chandan / Claude)

---

## Status
review
