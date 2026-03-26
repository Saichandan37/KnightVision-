# Story 1.2 — FastAPI Skeleton & Config Loading

## User Story
As a developer, I want a running FastAPI application that loads `config.yaml` at startup so that all services can read configuration without hardcoding values.

## Tasks
- [x] Create `backend/app/main.py` with FastAPI app instance, lifespan context manager, CORS middleware (allow all origins for dev), and `/health` GET endpoint returning `{"status": "ok"}`
- [x] Create `backend/app/config.py` with a `load_config()` function that reads `config.yaml` using PyYAML and returns a typed `AppConfig` Pydantic model
- [x] `AppConfig` must include nested models: `StockfishConfig`, `ServerConfig`, `ClassificationConfig`, `LLMConfig`
- [x] Config is loaded once at startup in the lifespan and stored as an app-level singleton (e.g., `app.state.config`)
- [x] Create `backend/app/routers/__init__.py` and a placeholder `backend/app/routers/analysis.py` (empty router, registered in `main.py`)
- [x] `uvicorn backend.app.main:app --reload` must start without errors

## Acceptance Criterion
`GET /health` returns `{"status": "ok"}` with HTTP 200, and `app.state.config.stockfish.depth` equals the value set in `config.yaml` when accessed from within a route handler.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- Used relative imports in `main.py` (`from .config import ...`, `from .routers.analysis import ...`) so the module works both as `backend.app.main` (uvicorn from project root) and as `app.main` (pytest with `backend/` on sys.path)
- Added `backend/__init__.py` to make `backend` a proper package — required for `uvicorn backend.app.main:app` to resolve imports correctly
- `AppConfig` includes `ClassificationThresholds.blunder_threshold` as a computed property (not a config field) — blunder = anything above `mistake_max_cp_loss`
- `get_default_config()` resolves `config.yaml` from the project root by walking up from `backend/app/config.py`; falls back to CWD if not found at package root
- All test imports use `from backend.app.*` (full package path from project root)

### Completion Notes
✅ All tasks complete. 10/10 tests pass. `uvicorn backend.app.main:app --port 8001` starts cleanly and `GET /health` returns `{"status": "ok"}` with HTTP 200. `app.state.config.stockfish.depth == 18` confirmed in test.

---

## File List
- `backend/__init__.py` (new — makes backend a proper package)
- `backend/app/main.py` (new)
- `backend/app/config.py` (new)
- `backend/app/routers/analysis.py` (new — placeholder router)
- `backend/tests/test_config.py` (new)
- `backend/tests/test_main.py` (new)

---

## Change Log
- 2026-03-22: FastAPI skeleton, config loading, health endpoint, CORS middleware, analysis router placeholder (Sai Chandan / Claude)

---

## Status
review
