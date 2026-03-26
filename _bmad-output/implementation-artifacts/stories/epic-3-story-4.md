# Story 3.4 — Groq Provider

## User Story
As a developer, I want a Groq provider so that users without a local GPU can get LLM commentary using Groq's free tier.

## Tasks
- Create `backend/app/llm/groq_provider.py` with `GroqProvider(BaseLLMProvider)`
- API key from `.env` `GROQ_API_KEY`
- Model: `llama3-8b-8192`
- POST to `https://api.groq.com/openai/v1/chat/completions` with OpenAI-compatible payload
- Headers: `Authorization: Bearer {GROQ_API_KEY}`, `Content-Type: application/json`
- Timeout: `config.yaml` `llm.timeout_seconds`
- Extract response text from `choices[0].message.content`
- On missing API key: raise `RuntimeError("GROQ_API_KEY not set")` at init time
- On timeout or HTTP error: raise `RuntimeError` so fallback chain activates
- `async def check_health() -> bool` — attempt a minimal completion; return True if 200, False otherwise
- Register as `"groq"` in registry at startup

## Acceptance Criterion
With a valid `GROQ_API_KEY`, calling `GroqProvider().generate("Name one chess tactic in one sentence.")` returns a non-empty string; with an invalid key, `check_health()` returns `False` without raising an unhandled exception.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Fail-fast at `__init__`:** Missing or empty `GROQ_API_KEY` raises `RuntimeError("GROQ_API_KEY not set")` immediately — prevents a confusing 401 error surfacing during the first generate call.

**Startup registration is guarded:** `main.py` wraps `GroqProvider(...)` in a `try/except RuntimeError` so the server starts cleanly even without a Groq key set. A `logger.warning` records the skip; no user-visible crash.

**Response shape guard:** `choices[0].message.content` access is wrapped in a `KeyError/IndexError` catch that raises `RuntimeError("Unexpected Groq response shape: ...")` — handles API changes or rate-limit error bodies that return a different JSON structure.

**`check_health()` uses a minimal real request** (`max_tokens=1`, prompt "hi") — no mock endpoint; returns True only on HTTP 200, False for any other status or exception. The 5-second hardcoded timeout is intentional (faster than the configurable generate timeout).

**OpenAI-compatible payload:** `messages` array with a single `user` role message. `max_tokens=150` balances response quality against latency for coaching commentary.

### Completion Notes
✅ Both AC gate tests pass. 179/179 total tests pass (17 new + 162 regression).
- `test_ac_generate_returns_nonempty_string` ✓
- `test_ac_check_health_false_on_invalid_key` ✓

---

## File List
- `backend/app/llm/groq_provider.py` (new)
- `backend/app/main.py` (updated — guarded Groq registration at startup)
- `backend/tests/services/test_groq_provider.py` (new — 2 AC gate tests)
- `backend/tests/test_groq_provider.py` (new — 15 supporting tests)

---

## Change Log
- 2026-03-22: GroqProvider — OpenAI-compatible API, Bearer auth, fail-fast init, guarded startup registration (Sai Chandan / Claude)

---

## Status
review
