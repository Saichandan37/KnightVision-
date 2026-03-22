# Story 1.4 — Pydantic Models

## User Story
As a developer, I want all shared data models defined in one place so that the API, services, and WebSocket layer all use the same typed structures.

## Tasks
- Create `backend/app/models/api.py` with these Pydantic models:
  - `MoveCategory` (str Enum): `brilliant`, `great`, `best`, `good`, `inaccuracy`, `mistake`, `blunder`
  - `CandidateMove`: `uci: str`, `san: str`, `centipawns: int`
  - `MoveResult`: `move_index: int`, `move_number: int`, `san: str`, `uci: str`, `category: MoveCategory`, `cp_loss: int`, `eval_before_cp: int`, `eval_after_cp: int`, `best_move_uci: str`, `best_move_san: str`, `top_candidates: list[CandidateMove]`, `comment: str`, `comment_source: Literal["llm", "fallback"]`
  - `WSMoveResult`: extends/wraps `MoveResult`, adds `buffered: bool = False`
  - `WSHeartbeat`: `type: Literal["heartbeat"] = "heartbeat"`, `timestamp: float`
  - `WSError`: `type: Literal["error"] = "error"`, `message: str`
  - `AnalysisComplete`: `type: Literal["analysis_complete"] = "analysis_complete"`, `white_accuracy: float`, `black_accuracy: float`, `total_moves: int`
  - `GameMeta`: `white: str`, `black: str`, `white_elo: Optional[int]`, `black_elo: Optional[int]`, `result: str`, `date: Optional[str]`, `opening_eco: Optional[str]`, `opening_name: Optional[str]`
- Create `backend/app/models/__init__.py` re-exporting all models

## Acceptance Criterion
`from backend.app.models.api import MoveResult, WSMoveResult, MoveCategory` executes without import errors, and `WSMoveResult(buffered=True, **move_result_dict)` correctly sets `buffered=True` on a constructed instance.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
