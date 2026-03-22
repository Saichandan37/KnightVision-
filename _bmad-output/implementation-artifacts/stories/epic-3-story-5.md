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
