# Story 3.1 — BaseLLMProvider & Registry

## User Story
As a developer, I want a provider registry and abstract base class so that all LLM providers implement a consistent interface and the system can switch between them at runtime.

## Tasks
- Create `backend/app/llm/base.py` with `BaseLLMProvider` ABC
- Abstract method: `async def generate(self, prompt: str) -> str`
- Property: `provider_name: str`
- Create `backend/app/llm/registry.py` with `ProviderRegistry` class
- `ProviderRegistry` holds a dict of registered providers and a `current_provider` pointer
- Method `register(name: str, provider: BaseLLMProvider) -> None`
- Method `set_provider(name: str) -> None` (raises `ValueError` if not registered)
- Method `async generate_with_fallback(prompt: str) -> tuple[str, str]` — tries current provider, on any exception falls back through registered providers in order, returns `(comment_text, "llm")` or raises `LLMUnavailableError` if all fail
- `generate_with_fallback` is the ONLY way LLM is called throughout the codebase
- Create singleton `provider_registry = ProviderRegistry()` at module level

## Acceptance Criterion
A unit test registers two mock providers where the first always raises `RuntimeError`; calling `generate_with_fallback()` returns the second provider's output with source `"llm"` — the fallback chain works.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
