"""ProviderRegistry broader tests — registration, set_provider, fallback edge cases."""
import pytest

from backend.app.llm.base import BaseLLMProvider, LLMUnavailableError
from backend.app.llm.registry import ProviderRegistry


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

class _OkProvider(BaseLLMProvider):
    def __init__(self, name: str, response: str = "ok") -> None:
        self._name = name
        self._response = response

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(self, prompt: str) -> str:
        return self._response


class _FailProvider(BaseLLMProvider):
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(self, prompt: str) -> str:
        raise RuntimeError(f"{self._name} unavailable")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_and_current_provider_none_until_set():
    r = ProviderRegistry()
    r.register("a", _OkProvider("a"))
    assert r.current_provider is None


def test_set_provider_updates_current():
    r = ProviderRegistry()
    p = _OkProvider("a")
    r.register("a", p)
    r.set_provider("a")
    assert r.current_provider is p


def test_set_provider_unknown_raises_value_error():
    r = ProviderRegistry()
    with pytest.raises(ValueError, match="not registered"):
        r.set_provider("nonexistent")


def test_register_replaces_existing_name():
    r = ProviderRegistry()
    old = _OkProvider("a", "old")
    new = _OkProvider("a", "new")
    r.register("a", old)
    r.register("a", new)  # replace
    r.set_provider("a")
    assert r.current_provider is new


# ---------------------------------------------------------------------------
# generate_with_fallback — happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_with_current_provider():
    r = ProviderRegistry()
    r.register("a", _OkProvider("a", "hello"))
    r.set_provider("a")
    text, source = await r.generate_with_fallback("prompt")
    assert text == "hello"
    assert source == "llm"


@pytest.mark.asyncio
async def test_generate_no_current_set_falls_to_first_registered():
    """When no current provider is set, tries all in registration order."""
    r = ProviderRegistry()
    r.register("a", _OkProvider("a", "from-a"))
    # No set_provider called
    text, source = await r.generate_with_fallback("prompt")
    assert text == "from-a"
    assert source == "llm"


# ---------------------------------------------------------------------------
# generate_with_fallback — fallback chain
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fallback_skips_current_tries_next_in_order():
    r = ProviderRegistry()
    r.register("fail1", _FailProvider("fail1"))
    r.register("fail2", _FailProvider("fail2"))
    r.register("ok", _OkProvider("ok", "success"))
    r.set_provider("fail1")
    text, source = await r.generate_with_fallback("p")
    assert text == "success"
    assert source == "llm"


@pytest.mark.asyncio
async def test_all_providers_fail_raises_llm_unavailable():
    r = ProviderRegistry()
    r.register("a", _FailProvider("a"))
    r.register("b", _FailProvider("b"))
    r.set_provider("a")
    with pytest.raises(LLMUnavailableError):
        await r.generate_with_fallback("p")


@pytest.mark.asyncio
async def test_no_providers_registered_raises_llm_unavailable():
    r = ProviderRegistry()
    with pytest.raises(LLMUnavailableError, match="No LLM providers"):
        await r.generate_with_fallback("p")


@pytest.mark.asyncio
async def test_current_fails_other_tried_first_among_remaining():
    """Registration order is preserved for fallback after current."""
    r = ProviderRegistry()
    r.register("fail", _FailProvider("fail"))
    r.register("second", _OkProvider("second", "from-second"))
    r.register("third", _OkProvider("third", "from-third"))
    r.set_provider("fail")
    text, _ = await r.generate_with_fallback("p")
    assert text == "from-second"  # second in registration order


# ---------------------------------------------------------------------------
# BaseLLMProvider — ABC enforcement
# ---------------------------------------------------------------------------

def test_cannot_instantiate_base_provider():
    with pytest.raises(TypeError):
        BaseLLMProvider()  # type: ignore[abstract]


def test_concrete_provider_must_implement_both_abstracts():
    class Incomplete(BaseLLMProvider):
        @property
        def provider_name(self) -> str:
            return "incomplete"
        # Missing generate()

    with pytest.raises(TypeError):
        Incomplete()  # type: ignore[abstract]


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

def test_module_singleton_is_provider_registry():
    from backend.app.llm import provider_registry, ProviderRegistry
    assert isinstance(provider_registry, ProviderRegistry)
