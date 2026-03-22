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
