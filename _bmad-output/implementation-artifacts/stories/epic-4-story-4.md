# Story 4.4 — Game State & Metadata Endpoint

## User Story
As a developer, I want a REST endpoint to retrieve game metadata and full move results so that the frontend can reconstruct state on page reload without re-analysis.

## Tasks
- Add `GET /api/analysis/{game_id}` to `backend/app/routers/analysis.py`
- Returns: `{"game_id": str, "status": str, "meta": GameMeta | null, "moves": list[MoveResult], "white_accuracy": float | null, "black_accuracy": float | null}`
- If game not found: HTTP 404 with `{"error": "Game not found"}`
- If analysis not yet complete: return partial moves list with `status: "analysing"`
- This endpoint is the source of truth for the LLM provider status bar (health check is separate: `GET /api/llm/status`)

## Acceptance Criterion
After a complete analysis, `GET /api/analysis/{game_id}` returns HTTP 200 with `status: "complete"`, a non-empty `moves` array, and non-null `white_accuracy` and `black_accuracy` values.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`GET /api/analysis/{game_id}` on existing `router`:** Added directly to the `/api/analysis` router. Route is `@router.get("/{game_id}")` → full path `/api/analysis/{game_id}`. Returns a plain `dict` (`response_model=None`) to avoid Pydantic serialisation conflicts between optional fields.

**Accuracy sourced from `game_store.get_result()`:** The `AnalysisComplete` object (stored by the WS handler's `_analysis_task`) carries `white_accuracy` and `black_accuracy`. If `None` (game pending or analysing), those fields are `null` in the response.

**404 via `KeyError` from store:** `game_store.get_status(game_id)` raises `KeyError` when the game does not exist. Caught and re-raised as `HTTPException(404, detail={"error": "Game not found"})`.

**`meta.model_dump()`:** Pydantic v2 method used to serialise `GameMeta` to a plain dict. `None` when meta hasn't been set yet (pre-analysis).

### Completion Notes
✅ AC gate test passes. 261/261 total tests pass (15 new + 246 regression).
- `test_ac_complete_game_returns_200_with_moves_and_accuracy` ✓

---

## File List
- `backend/app/routers/analysis.py` (updated — `GET /api/analysis/{game_id}`, `GameStateResponse` model)
- `backend/tests/services/test_game_state_endpoint.py` (new — 1 AC gate test)
- `backend/tests/test_game_state_endpoint.py` (new — 14 supporting tests)

---

## Change Log
- 2026-03-22: GET /api/analysis/{game_id} — game state, partial moves, accuracy from stored result (Sai Chandan / Claude)

---

## Status
review
