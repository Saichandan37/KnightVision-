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

---

## Dev Agent Record

### Implementation Notes

**Content-type dispatch via `Request`:** FastAPI can't natively mix `File`/`Form` with `Body(JSON)` in one endpoint. The `_extract_pgn(request)` helper reads `Content-Type` and dispatches:
- `multipart/form-data` OR `application/x-www-form-urlencoded` → `await request.form()`, tries `pgn_file` (UploadFile) then `pgn_text` (str)
- `application/json` → `await request.json()`, reads `pgn_text`
- Other → 415 Unsupported Media Type

Including `application/x-www-form-urlencoded` handles both HTML form submission and TestClient's `data=` parameter (which httpx sends as URL-encoded, not multipart).

**202 via `status_code=202` decorator:** FastAPI sets the success status code from the route decorator; `HTTPException` with 422/415 still overrides it for error paths.

**`parse_pgn()` for validation:** The existing service validates PGN and raises `ValueError` with a reason string. The endpoint catches it and returns `{"error": "Invalid PGN: {reason}"}` as the `detail` field.

**Analysis is NOT triggered here:** `game_store.create_game(game_id, pgn)` is called and status stays `"pending"`. The WebSocket handler (story 4.2) kicks off `run_analysis()` when the client connects.

### Completion Notes
✅ Both AC gate tests pass. 232/232 total tests pass (17 new + 215 regression).
- `test_ac_valid_pgn_json_returns_202_with_uuid` ✓
- `test_ac_invalid_pgn_returns_422_with_error_field` ✓

---

## File List
- `backend/app/routers/analysis.py` (updated — `POST /api/analysis/upload`, `_extract_pgn` helper, `UploadResponse` model)
- `backend/tests/services/test_upload_endpoint.py` (new — 2 AC gate tests)
- `backend/tests/test_upload_endpoint.py` (new — 15 supporting tests)

---

## Change Log
- 2026-03-22: POST /api/analysis/upload — content-type dispatch, PGN validation, 202 game_id response, no-analysis-on-upload guarantee (Sai Chandan / Claude)

---

## Status
review
