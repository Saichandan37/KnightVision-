# Story 1.1 — Project Init & Directory Structure

## User Story
As a developer, I want the repository scaffold in place so that every subsequent story has the correct directories, config files, and tooling to work within.

## Tasks
- [x] Create the top-level directory structure: `backend/`, `frontend/`, `docs/`, `tests/`
- [x] Inside `backend/`: `app/`, `app/routers/`, `app/services/`, `app/models/`, `app/store/`, `app/llm/`, `tests/`, `tests/services/`
- [x] Inside `frontend/`: `src/`, `src/components/`, `src/store/`, `src/hooks/`, `src/types/`, `public/`
- [x] Add root `config.yaml` with keys: `stockfish.depth`, `stockfish.path`, `server.host`, `server.port`, `server.log_level`, `classification.thresholds` (7 tiers), `llm.default_provider`, `llm.timeout_seconds`
- [x] Add `.env.example` with `GROQ_API_KEY=`, `HUGGINGFACE_API_KEY=`, `OLLAMA_BASE_URL=http://localhost:11434`
- [x] Add `requirements.txt` with: `fastapi>=0.111`, `uvicorn[standard]>=0.29`, `websockets>=12`, `python-chess>=1.11` (package name is `chess` on PyPI), `pydantic>=2.7`, `pyyaml>=6.0`, `httpx>=0.27`, `stockfish>=3.28`
- [x] Add `package.json` (frontend) with: `react@18`, `react-dom@18`, `typescript@5`, `vite@5`, `zustand@4`, `react-chessboard@4`, `chess.js@1`, `tailwindcss@3`, `recharts@2`
- [x] Add `pyproject.toml` or `setup.cfg` for linting (ruff, black)
- [x] Verify `backend/` and `frontend/` are importable/buildable skeletons (empty `__init__.py` where needed, `vite.config.ts` present)

## Acceptance Criterion
Running `pip install -r requirements.txt` and `npm install` in their respective directories completes without errors, and `python -c "import fastapi, chess, stockfish, pydantic, yaml"` exits with code 0.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- `chess` package on PyPI (not `python-chess`) — `chess>=1.11` in requirements.txt, `import chess` unchanged in code
- `pydantic-settings>=2.3` and `python-multipart>=0.0.9` added to requirements.txt as needed by later stories (FastAPI file upload and settings)
- `config.yaml` placed at repo root (not inside `backend/`) so Docker Compose and the backend service both resolve it from the same location
- Frontend skeleton includes `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`
- Vitest configured in `vite.config.ts` `test` block; `jsdom` environment set for React component tests
- `.gitkeep` files used to commit otherwise-empty directories

### Completion Notes
✅ All tasks complete. AC verified: `python3 -c "import fastapi, chess, stockfish, pydantic, yaml"` exits 0. `pip install -r requirements.txt` and `npm install` both complete without errors.

---

## File List
- `backend/requirements.txt`
- `backend/app/__init__.py`
- `backend/app/routers/__init__.py`
- `backend/app/services/__init__.py`
- `backend/app/models/__init__.py`
- `backend/app/store/__init__.py`
- `backend/app/llm/__init__.py`
- `backend/app/data/.gitkeep`
- `backend/tests/__init__.py`
- `backend/tests/services/__init__.py`
- `config.yaml`
- `.env.example`
- `pyproject.toml`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tsconfig.node.json`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/test-setup.ts`
- `frontend/src/components/.gitkeep`
- `frontend/src/store/.gitkeep`
- `frontend/src/hooks/.gitkeep`
- `frontend/src/types/.gitkeep`
- `frontend/src/api/.gitkeep`
- `frontend/src/utils/.gitkeep`
- `frontend/public/.gitkeep`
- `tests/` (directory created)

---

## Change Log
- 2026-03-22: Initial implementation — project scaffold created (Sai Chandan / Claude)

---

## Status
review
