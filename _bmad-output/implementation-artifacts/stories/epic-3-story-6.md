# Story 3.6 — LLM Commentary Prompt & Runtime Switching

## User Story
As a developer, I want a coaching prompt builder and a runtime provider-switching endpoint so that the LLM layer produces contextual comments and users can switch providers without restarting the server.

## Tasks
- Create `backend/app/llm/prompt_builder.py` with `build_coaching_prompt(move: MoveResult) -> str`
- Prompt must include: move SAN, category, cp_loss, best_move_san, top 3 candidate SANs, eval before/after
- Prompt instruction: "You are a chess coach. In 1-2 sentences, explain why this move is a {category} and what the better idea was. Be specific — name the tactical or positional concept."
- Add `POST /api/llm/provider` endpoint to `backend/app/routers/analysis.py`: body `{"provider": "ollama"|"groq"|"huggingface"}`, calls `provider_registry.set_provider(name)`, returns `{"active_provider": name}`
- Add `GET /api/llm/status` endpoint: returns `{"providers": {"ollama": bool, "groq": bool, "huggingface": bool}, "active": str}` — calls each provider's `check_health()` concurrently using `asyncio.gather`

## Acceptance Criterion
`POST /api/llm/provider` with body `{"provider": "groq"}` returns HTTP 200 with `{"active_provider": "groq"}`; a subsequent analysis uses Groq for commentary; `GET /api/llm/status` returns health booleans for all three providers without blocking for more than `timeout_seconds * 1.1` seconds.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`llm_router` in `analysis.py`:** The story says to add endpoints to `analysis.py`. Rather than adding them to the existing `/api/analysis` router, a separate `llm_router = APIRouter(prefix="/api/llm")` is declared in the same file and registered in `main.py` alongside `analysis_router`. Both exported from `analysis.py`.

**`_check(name)` helper in the router:** Looks up the provider by name in `provider_registry._providers` (direct dict access — avoids needing a new public lookup API). Returns `False` immediately if provider is not registered (key was absent at startup). All three names always appear in the status response regardless of registration.

**`asyncio.gather` for concurrent health checks:** All three `check_health()` calls run concurrently. Each individual `_check()` already catches exceptions and returns `False`, so `gather` never raises.

**`current_provider_name` and `registered_names` properties added to `ProviderRegistry`:** Needed by the status endpoint to return `active` name without accessing `_current_name` directly. Added cleanly alongside existing `current_provider` property.

**`POST /api/llm/provider` → 400 on unregistered name:** `set_provider` raises `ValueError`; caught and re-raised as `HTTPException(400)` with the error detail. Missing body field → FastAPI's built-in 422.

**Prompt format:** Structured with labelled fields (SAN, UCI, category, cp_loss, best move, candidates, evals) followed by the coaching instruction. The `category.value` string ("blunder", "inaccuracy", etc.) appears both in the context and in the instruction — the FallbackProvider regex picks it up via `category: {value}`.

### Completion Notes
✅ Both AC gate tests pass. 215/215 total tests pass (18 new + 197 regression).
- `test_ac_switch_provider_returns_200_and_active_name` ✓
- `test_ac_status_returns_health_booleans` ✓

---

## File List
- `backend/app/llm/prompt_builder.py` (new)
- `backend/app/llm/registry.py` (updated — `current_provider_name`, `registered_names` properties)
- `backend/app/routers/analysis.py` (updated — `llm_router` with POST /provider, GET /status)
- `backend/app/main.py` (updated — registers `llm_router`)
- `backend/tests/services/test_llm_endpoints.py` (new — 2 AC gate tests)
- `backend/tests/test_prompt_builder.py` (new — 16 supporting tests)

---

## Change Log
- 2026-03-22: Prompt builder, POST /api/llm/provider, GET /api/llm/status with asyncio.gather health checks, registry name properties (Sai Chandan / Claude)

---

## Status
review
