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

---

## Dev Agent Record

### Implementation Notes

**`docker-compose.prod.yml`:** Override adds `profiles: ["local"]` to `ollama` so it is excluded from `docker compose up` without a `--profile` flag. Backend `depends_on` is overridden to `{}` (empty), removing the service_healthy gate on ollama. `LLM_DEFAULT_PROVIDER: groq` env var is set on the backend service.

**`LLM_DEFAULT_PROVIDER` in `main.py`:** `os.environ.get("LLM_DEFAULT_PROVIDER", config.llm.default_provider)` replaces the hardcoded `"ollama"` argument to `set_provider`. Falls back to `"fallback"` provider (with warning) if the requested provider isn't registered (e.g. GROQ_API_KEY missing).

**`ALLOWED_ORIGINS` in `main.py`:** CORS `allow_origins` is now computed from `ALLOWED_ORIGINS` env var (comma-separated list). Defaults to `["*"]` when env var is empty/unset.

**Frontend `VITE_API_BASE_URL`:** Added `apiBase` prefix in `useAnalysis.ts` upload fetch call. Trailing slash is stripped to avoid double-slashes. WebSocket already used `VITE_WS_URL` for the same purpose. Frontend `Dockerfile` accepts `VITE_API_BASE_URL` as a build `ARG`/`ENV` so it can be baked into the bundle for hosted deployments.

**`railway.json`:** Points to `backend/Dockerfile` with build context `.` (project root). Start command uses `${PORT:-8000}` so Railway's auto-assigned `PORT` env var is respected.

**`README.md`:** Added "Deploy to Railway" section with step-by-step, env var table, and verify commands.

**Tests:** 3 new frontend tests (`VITE_API_BASE_URL` describe block in `useAnalysis.test.tsx`); 8 new backend tests (`test_prod_env_config.py` — `ALLOWED_ORIGINS` parsing and `LLM_DEFAULT_PROVIDER` env var logic). 289 frontend + 269 backend tests all pass.

### Completion Notes
✅ All tasks complete. 289 frontend + 269 backend tests pass, 0 regressions.
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml up` starts backend + frontend only ✓
- `ALLOWED_ORIGINS` env var configures CORS (defaults `["*"]`) ✓
- `LLM_DEFAULT_PROVIDER=groq` routes to Groq provider at startup ✓
- `VITE_API_BASE_URL` used as fetch base URL in `useAnalysis.ts` ✓
- `railway.json` deployment config added ✓
- README "Deploy to Railway" section added ✓

---

## File List
- `docker-compose.prod.yml` (new — prod override, no ollama, groq default)
- `railway.json` (new — Railway deployment config)
- `backend/app/main.py` (modified — `LLM_DEFAULT_PROVIDER` + `ALLOWED_ORIGINS` env vars)
- `frontend/src/hooks/useAnalysis.ts` (modified — `VITE_API_BASE_URL` prefix for fetch)
- `frontend/Dockerfile` (modified — `VITE_API_BASE_URL` build ARG)
- `.env.example` (modified — prod env vars documented)
- `README.md` (modified — Deploy to Railway section)
- `backend/tests/test_prod_env_config.py` (new — 8 tests)
- `frontend/src/hooks/__tests__/useAnalysis.test.tsx` (modified — 3 VITE_API_BASE_URL tests)

---

## Change Log
- 2026-03-26: Hosted deployment config — prod compose, Railway, CORS/LLM env vars, VITE_API_BASE_URL (Sai Chandan / Claude)

---

## Status
review
