"""FallbackProvider broader tests — all categories, regex variants, edge cases."""
import pytest

from backend.app.llm.fallback_provider import FallbackProvider, _TEMPLATES


@pytest.fixture
def provider() -> FallbackProvider:
    return FallbackProvider()


# ---------------------------------------------------------------------------
# provider_name
# ---------------------------------------------------------------------------

def test_provider_name(provider):
    assert provider.provider_name == "fallback"


# ---------------------------------------------------------------------------
# All seven categories return exact template strings
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("category,expected", list(_TEMPLATES.items()))
async def test_all_categories_return_exact_template(provider, category, expected):
    result = await provider.generate(f"some prompt category: {category} trailing text")
    assert result == expected


# ---------------------------------------------------------------------------
# Case-insensitivity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_category_uppercase(provider):
    result = await provider.generate("category: BLUNDER")
    assert result == _TEMPLATES["blunder"]


@pytest.mark.asyncio
async def test_category_mixed_case(provider):
    result = await provider.generate("Category: Inaccuracy")
    assert result == _TEMPLATES["inaccuracy"]


# ---------------------------------------------------------------------------
# Regex format variants
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_category_without_colon(provider):
    """'category blunder' (space instead of colon) should also match."""
    result = await provider.generate("move category blunder details")
    assert result == _TEMPLATES["blunder"]


@pytest.mark.asyncio
async def test_category_in_middle_of_prompt(provider):
    result = await provider.generate(
        "Move 15 (Qxf7) — category: mistake — cp_loss: 80 — please comment."
    )
    assert result == _TEMPLATES["mistake"]


# ---------------------------------------------------------------------------
# No match / empty → safe default
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_category_in_prompt_returns_default(provider):
    result = await provider.generate("analyse this position")
    assert result == _TEMPLATES["good"]


@pytest.mark.asyncio
async def test_empty_prompt_returns_default(provider):
    result = await provider.generate("")
    assert result == _TEMPLATES["good"]


@pytest.mark.asyncio
async def test_unrecognised_category_returns_default(provider):
    result = await provider.generate("category: superblunder")
    assert result == _TEMPLATES["good"]


# ---------------------------------------------------------------------------
# Integration: FallbackProvider works in the registry fallback chain
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fallback_provider_in_registry():
    from backend.app.llm.registry import ProviderRegistry
    from backend.app.llm.base import BaseLLMProvider

    class _AlwaysFail(BaseLLMProvider):
        @property
        def provider_name(self) -> str:
            return "fail"
        async def generate(self, prompt: str) -> str:
            raise RuntimeError("unavailable")

    r = ProviderRegistry()
    r.register("fail", _AlwaysFail())
    r.register("fallback", FallbackProvider())
    r.set_provider("fail")

    text, source = await r.generate_with_fallback("category: best something")
    assert text == _TEMPLATES["best"]
    assert source == "llm"
