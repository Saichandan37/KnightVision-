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
