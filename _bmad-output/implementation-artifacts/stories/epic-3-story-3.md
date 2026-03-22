# Story 3.3 — Ollama Provider

## User Story
As a developer, I want an Ollama provider so that users running Ollama locally get LLM commentary without any API key.

## Tasks
- Create `backend/app/llm/ollama_provider.py` with `OllamaProvider(BaseLLMProvider)`
- Base URL from `.env` `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- Model: `llama3.1:8b` (hardcoded for Phase 1)
- POST to `{OLLAMA_BASE_URL}/api/generate` with `{"model": "llama3.1:8b", "prompt": prompt, "stream": false}`
- Timeout: `config.yaml` `llm.timeout_seconds` (default 10)
- On timeout or connection error: raise `RuntimeError` so the registry fallback chain activates
- `async def check_health() -> bool` — GET `{OLLAMA_BASE_URL}/api/tags`, return True if 200
- Register as `"ollama"` in registry at startup

## Acceptance Criterion
With Ollama running locally and `llama3.1:8b` pulled, calling `OllamaProvider().generate("Explain this chess move briefly.")` returns a non-empty string within the configured timeout; `check_health()` returns `True` when Ollama is running and `False` when it is not.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
