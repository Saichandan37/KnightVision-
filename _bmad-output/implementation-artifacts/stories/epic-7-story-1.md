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
