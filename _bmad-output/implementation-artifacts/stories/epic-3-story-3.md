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

---

## Dev Agent Record

### Implementation Notes

**HTTP client:** `httpx.AsyncClient` — async-native, already in requirements.txt. A fresh client is created per call (context manager) to avoid connection pool leaks in long-running servers.

**Error → RuntimeError mapping:** Three distinct httpx exception types each map to a RuntimeError with a descriptive message, triggering the registry fallback chain:
- `TimeoutException` → "timed out after Ns"
- `ConnectError` → "Cannot connect to Ollama at {url}"
- `HTTPStatusError` → "HTTP {status_code}"
An empty `response` field also raises RuntimeError ("empty response") since the registry treats it identically.

**`check_health()` never raises:** Catches all exceptions and returns `False` — used by Epic 4 startup logic to decide whether to activate the provider; must never crash.

**`OLLAMA_BASE_URL` env var:** Read at construction time (not module load) so monkeypatching in tests works without import-time side effects. Trailing slash stripped with `.rstrip("/")` to avoid double-slash URLs.

**Startup wiring:** `OllamaProvider` registered as `"ollama"` and set as active provider; `"fallback"` is registered second. If Ollama is unreachable, the registry automatically falls back to `FallbackProvider` on every call — no startup health-check gate needed.

**Tests are fully mocked:** All 16 tests patch `httpx.AsyncClient` — no live Ollama process required. The end-to-end integration with real Ollama is verified manually per the AC.

### Completion Notes
✅ All 3 AC gate tests pass. 162/162 total tests pass (16 new + 146 regression).
- `test_ac_generate_returns_nonempty_string` ✓
- `test_ac_check_health_true_on_200` ✓
- `test_ac_check_health_false_when_unreachable` ✓

---

## File List
- `backend/app/llm/ollama_provider.py` (new)
- `backend/app/main.py` (updated — register OllamaProvider at startup, set as active)
- `backend/tests/services/test_ollama_provider.py` (new — 3 AC gate tests)
- `backend/tests/test_ollama_provider.py` (new — 13 supporting tests)

---

## Change Log
- 2026-03-22: OllamaProvider — httpx async POST, timeout/connect/HTTP error mapping, check_health, startup registration (Sai Chandan / Claude)

---

## Status
review
