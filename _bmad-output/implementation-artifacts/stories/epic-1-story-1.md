# Story 1.1 — Project Init & Directory Structure

## User Story
As a developer, I want the repository scaffold in place so that every subsequent story has the correct directories, config files, and tooling to work within.

## Tasks
- Create the top-level directory structure: `backend/`, `frontend/`, `docs/`, `tests/`
- Inside `backend/`: `app/`, `app/routers/`, `app/services/`, `app/models/`, `app/store/`, `app/llm/`, `tests/`, `tests/services/`
- Inside `frontend/`: `src/`, `src/components/`, `src/store/`, `src/hooks/`, `src/types/`, `public/`
- Add root `config.yaml` with keys: `stockfish.depth`, `stockfish.path`, `server.host`, `server.port`, `server.log_level`, `classification.thresholds` (7 tiers), `llm.default_provider`, `llm.timeout_seconds`
- Add `.env.example` with `GROQ_API_KEY=`, `HUGGINGFACE_API_KEY=`, `OLLAMA_BASE_URL=http://localhost:11434`
- Add `requirements.txt` with: `fastapi>=0.111`, `uvicorn[standard]>=0.29`, `websockets>=12`, `python-chess>=1.11` (package name is `chess` on PyPI), `pydantic>=2.7`, `pyyaml>=6.0`, `httpx>=0.27`, `stockfish>=3.28`
- Add `package.json` (frontend) with: `react@18`, `react-dom@18`, `typescript@5`, `vite@5`, `zustand@4`, `react-chessboard@4`, `chess.js@1`, `tailwindcss@3`, `recharts@2`
- Add `pyproject.toml` or `setup.cfg` for linting (ruff, black)
- Verify `backend/` and `frontend/` are importable/buildable skeletons (empty `__init__.py` where needed, `vite.config.ts` present)

## Acceptance Criterion
Running `pip install -r requirements.txt` and `npm install` in their respective directories completes without errors, and `python -c "import fastapi, chess, stockfish, pydantic, yaml"` exits with code 0.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
