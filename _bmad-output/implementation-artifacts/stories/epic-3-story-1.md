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

---

## Dev Agent Record

### Implementation Notes

**Fallback order:** Attempt list = [current] + [all others in registration order]. `dict` insertion order (Python 3.7+) preserves registration sequence for deterministic fallback.

**`provider_name` as abstract property:** Declared with `@property @abstractmethod` so subclasses must provide it as a property (not just any attribute). Enforces the interface contract at class definition time.

**`LLMUnavailableError` in `base.py`:** Lives alongside the ABC so any import of the base module gets both. Avoids a separate exceptions file for a single error type.

**Singleton in `__init__.py`:** `provider_registry = ProviderRegistry()` exported at package level so the rest of the codebase uses `from backend.app.llm import provider_registry` — one canonical instance, no singletons module needed.

**No current provider set:** If `set_provider` has never been called, `generate_with_fallback` still works — it tries all registered providers in registration order (current pointer is None so the "skip current" logic never fires).

### Completion Notes
✅ AC gate test passes. 128/128 total tests pass (14 new + 114 regression).
AC: `test_ac_fallback_chain_returns_second_provider_output` — fail provider (current) raises RuntimeError, succeed provider returns "great move!" with source "llm" ✓

---

## File List
- `backend/app/llm/base.py` (new — BaseLLMProvider ABC, LLMUnavailableError)
- `backend/app/llm/registry.py` (new — ProviderRegistry)
- `backend/app/llm/__init__.py` (updated — exports + module-level singleton)
- `backend/tests/services/test_llm_registry.py` (new — 1 AC gate test)
- `backend/tests/test_llm_registry.py` (new — 13 supporting tests)

---

## Change Log
- 2026-03-22: BaseLLMProvider ABC, LLMUnavailableError, ProviderRegistry with fallback chain, module singleton (Sai Chandan / Claude)

---

## Status
review
