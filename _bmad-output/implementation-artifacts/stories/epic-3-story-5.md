# Story 3.5 — HuggingFace Provider

## User Story
As a developer, I want a HuggingFace Inference API provider so that users have a third LLM option requiring only a free HuggingFace token.

## Tasks
- Create `backend/app/llm/huggingface_provider.py` with `HuggingFaceProvider(BaseLLMProvider)`
- API key from `.env` `HUGGINGFACE_API_KEY`
- Model: `mistralai/Mistral-7B-Instruct-v0.2` (Inference API endpoint)
- POST to `https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`
- Headers: `Authorization: Bearer {HUGGINGFACE_API_KEY}`
- Body: `{"inputs": prompt, "parameters": {"max_new_tokens": 100}}`
- Extract from response: `response[0]["generated_text"]` (strip the prompt prefix if echoed)
- Timeout: `config.yaml` `llm.timeout_seconds`
- On missing key or timeout: raise `RuntimeError` so fallback chain activates
- `async def check_health() -> bool`
- Register as `"huggingface"` in registry at startup

## Acceptance Criterion
With a valid `HUGGINGFACE_API_KEY`, `HuggingFaceProvider().generate("Name one chess tactic in one sentence.")` returns a non-empty string that does not include the prompt text as a prefix.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Prompt-prefix stripping:** The HuggingFace Inference API echoes the full input inside `generated_text`. Strip logic: `raw[len(prompt):].strip() if raw.startswith(prompt) else raw.strip()`. If stripping leaves an empty string (prompt echoed but no continuation), raises `RuntimeError("empty generated text")` — the fallback chain then activates.

**Error mapping:** Same pattern as Groq/Ollama — `TimeoutException`, `ConnectError`, `HTTPStatusError` → `RuntimeError`; also catches `KeyError/IndexError/TypeError` from `data[0]["generated_text"]` access for malformed responses.

**Guarded startup registration:** Identical pattern to Groq — `try/except RuntimeError` in lifespan so server starts without `HUGGINGFACE_API_KEY` set.

**`check_health()` uses minimal request** — `max_new_tokens=1`, prompt `"hi"`. Returns True only on HTTP 200, False for any error or exception. Never raises.

**Startup provider order in registry:** ollama → groq → huggingface → fallback. All three real providers fall back to the template fallback if all fail simultaneously.

### Completion Notes
✅ AC gate test passes. 197/197 total tests pass (18 new + 179 regression).
- `test_ac_generate_returns_nonempty_without_prompt_prefix` — prompt prefix stripped, non-empty string returned ✓

---

## File List
- `backend/app/llm/huggingface_provider.py` (new)
- `backend/app/main.py` (updated — guarded HuggingFace registration at startup)
- `backend/tests/services/test_huggingface_provider.py` (new — 1 AC gate test)
- `backend/tests/test_huggingface_provider.py` (new — 17 supporting tests)

---

## Change Log
- 2026-03-22: HuggingFaceProvider — Inference API, prompt-prefix stripping, fail-fast init, guarded startup registration (Sai Chandan / Claude)

---

## Status
review
