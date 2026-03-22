# Story 4.1 — PGN Upload Endpoint

## User Story
As a developer, I want a PGN upload endpoint that accepts a PGN file or text, validates it, stores it, and immediately returns a game ID so that the frontend can open a WebSocket to receive analysis results.

## Tasks
- Add `POST /api/analysis/upload` to `backend/app/routers/analysis.py`
- Accept multipart form with `pgn_file: UploadFile` OR JSON body with `pgn_text: str` — support both
- Client-side validation note: frontend also validates with chess.js before upload, but backend must validate independently
- Validate PGN using `parse_pgn()` — return HTTP 422 with `{"error": "Invalid PGN: {reason}"}` on failure
- On success: generate `game_id = str(uuid4())`, call `game_store.create_game(game_id, pgn)`, set status to `"pending"`
- Return HTTP 202: `{"game_id": game_id, "status": "pending"}`
- Do NOT start analysis in this endpoint — analysis starts when the WebSocket connects (Epic 4, Story 2)

## Acceptance Criterion
`POST /api/analysis/upload` with a valid PGN returns HTTP 202 with a UUID `game_id` within 500ms; posting an invalid PGN string returns HTTP 422 with an `error` field describing the problem.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
