# Story 1.2 — FastAPI Skeleton & Config Loading

## User Story
As a developer, I want a running FastAPI application that loads `config.yaml` at startup so that all services can read configuration without hardcoding values.

## Tasks
- Create `backend/app/main.py` with FastAPI app instance, lifespan context manager, CORS middleware (allow all origins for dev), and `/health` GET endpoint returning `{"status": "ok"}`
- Create `backend/app/config.py` with a `load_config()` function that reads `config.yaml` using PyYAML and returns a typed `AppConfig` Pydantic model
- `AppConfig` must include nested models: `StockfishConfig`, `ServerConfig`, `ClassificationConfig`, `LLMConfig`
- Config is loaded once at startup in the lifespan and stored as an app-level singleton (e.g., `app.state.config`)
- Create `backend/app/routers/__init__.py` and a placeholder `backend/app/routers/analysis.py` (empty router, registered in `main.py`)
- `uvicorn backend.app.main:app --reload` must start without errors

## Acceptance Criterion
`GET /health` returns `{"status": "ok"}` with HTTP 200, and `app.state.config.stockfish.depth` equals the value set in `config.yaml` when accessed from within a route handler.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
