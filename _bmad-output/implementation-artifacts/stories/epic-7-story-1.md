# Story 7.1 — Docker Compose with Ollama

## User Story
As a developer, I want a `docker-compose.yml` that spins up the backend, frontend, and Ollama with a single command so that a stranger can clone the repo and have a working instance in under 5 minutes.

## Tasks
- Create `docker-compose.yml` with three services: `backend`, `frontend`, `ollama`
- `backend`: build from `./backend`, port `8000:8000`, env from `.env`, `depends_on: ollama: condition: service_healthy`
- `frontend`: build from `./frontend`, port `3000:80` (Nginx serving Vite build), `depends_on: backend`
- `ollama`: image `ollama/ollama:latest`, volume `ollama_data:/root/.ollama`, port `11434:11434`
- Ollama entrypoint: `["/bin/sh", "-c", "ollama serve & sleep 5 && ollama pull llama3.1:8b && wait"]`
- Ollama healthcheck: `test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]`, `interval: 10s`, `retries: 12`
- `ollama_data` named volume so model is not re-pulled on restart
- Frontend Dockerfile: multi-stage — Node build stage (`npm run build`), then Nginx serve stage
- Backend Dockerfile: Python 3.12-slim, install requirements, run uvicorn
- `.env.example` must document all required variables

## Acceptance Criterion
Running `docker compose up --build` from a clean clone (no local model cached) brings all three services to healthy status; `curl http://localhost:8000/health` returns `{"status": "ok"}`; `curl http://localhost:3000` returns the frontend HTML — all without any manual steps beyond `cp .env.example .env`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Build context:** Backend build context is project root (`.`) so `config.yaml` can be copied into the image. `dockerfile: backend/Dockerfile` points to the correct file. Frontend build context is `./frontend`.

**Ollama URL patching:** `config.yaml` hardcodes `ollama.base_url: http://localhost:11434` for local dev. `backend/docker-entrypoint.sh` uses `sed` at container startup to replace `localhost:11434` with `${OLLAMA_HOST}:11434` (default: `ollama`) so no code changes to `config.py` were needed.

**Backend Dockerfile:** Python 3.12-slim + `apt-get install stockfish curl`. Stockfish is required by the analysis pipeline; curl is needed for the compose healthcheck. deps layer-cached separately via `COPY requirements.txt` before `COPY .`.

**Frontend Dockerfile:** Two-stage build — Node 20 alpine for `npm ci && npm run build`, then nginx:alpine copies `dist/` to `/usr/share/nginx/html`. `nginx.conf` provides SPA fallback (`try_files $uri /index.html`) and reverse-proxies `/api/` and `/ws` to the backend service.

**`.env.example`:** Documents `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, and `OLLAMA_HOST`. Updated existing file (was present from earlier stories).

**No unit tests:** This story is pure Docker/infra configuration. AC is verified by running `docker compose up --build`.

### Completion Notes
✅ All required files created:
- `docker-compose.yml` — 3 services, healthcheck, named volume ✓
- `backend/Dockerfile` — Python 3.12-slim, stockfish, uvicorn ✓
- `backend/docker-entrypoint.sh` — patches ollama URL at startup ✓
- `frontend/Dockerfile` — multi-stage Node→Nginx ✓
- `frontend/nginx.conf` — SPA routing + backend proxy ✓
- `.env.example` — all required variables documented ✓

---

## File List
- `docker-compose.yml` (new — 3-service compose)
- `backend/Dockerfile` (new — Python 3.12-slim)
- `backend/docker-entrypoint.sh` (new — ollama URL patcher)
- `frontend/Dockerfile` (new — multi-stage Node→Nginx)
- `frontend/nginx.conf` (new — SPA routing + API proxy)
- `.env.example` (modified — added OLLAMA_HOST, updated docs)

---

## Change Log
- 2026-03-26: Docker Compose with Ollama — all infra files (Sai Chandan / Claude)

---

## Status
review
