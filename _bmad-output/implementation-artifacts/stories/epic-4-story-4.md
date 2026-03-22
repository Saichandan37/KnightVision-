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
