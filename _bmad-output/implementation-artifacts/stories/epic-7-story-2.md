# Story 7.2 — Hosted Deployment (Railway/Render + Groq)

## User Story
As a developer, I want a hosted deployment configuration so that users who can't run Docker locally can use KnightVision via a public URL with Groq as the LLM provider.

## Tasks
- Create `docker-compose.prod.yml` (override file) that removes the `ollama` service and sets `LLM_DEFAULT_PROVIDER=groq`
- Add `railway.json` or `render.yaml` deployment config pointing to the backend service
- Frontend: configure `VITE_API_BASE_URL` environment variable so the frontend points to the hosted backend (not localhost)
- Backend: ensure `GROQ_API_KEY` is read from environment (already done in Epic 3) — document in README which env vars to set in Railway/Render dashboard
- Ensure CORS in `main.py` allows the hosted frontend origin (configurable via `ALLOWED_ORIGINS` env var)
- Document the hosted deployment path in README: "Deploy to Railway" section with step-by-step

## Acceptance Criterion
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up` starts backend and frontend without the Ollama service; the backend's `GET /api/llm/status` response shows `ollama: false` and `groq: true` (given a valid Groq key); the frontend's API calls use `VITE_API_BASE_URL` instead of `localhost`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
