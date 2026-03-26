"""LLM registry AC gate test — fallback chain with two mock providers.

AC: registers two mock providers where the first always raises RuntimeError;
calling generate_with_fallback() returns the second provider's output with
source "llm" — the fallback chain works.
"""
import pytest

from backend.app.llm.base import BaseLLMProvider, LLMUnavailableError
from backend.app.llm.registry import ProviderRegistry


# ---------------------------------------------------------------------------
# Minimal mock providers
# ---------------------------------------------------------------------------

class _AlwaysFailProvider(BaseLLMProvider):
    @property
    def provider_name(self) -> str:
        return "always_fail"

    async def generate(self, prompt: str) -> str:
        raise RuntimeError("Intentional test failure")


class _AlwaysSucceedProvider(BaseLLMProvider):
    def __init__(self, response: str = "test commentary") -> None:
        self._response = response

    @property
    def provider_name(self) -> str:
        return "always_succeed"

    async def generate(self, prompt: str) -> str:
        return self._response


# ---------------------------------------------------------------------------
# AC Gate test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ac_fallback_chain_returns_second_provider_output():
    """AC: first provider raises RuntimeError; fallback returns second provider's
    output with source 'llm'."""
    registry = ProviderRegistry()
    registry.register("fail", _AlwaysFailProvider())
    registry.register("succeed", _AlwaysSucceedProvider("great move!"))
    registry.set_provider("fail")  # current provider is the failing one

    text, source = await registry.generate_with_fallback("analyse this move")

    assert text == "great move!"
    assert source == "llm"
