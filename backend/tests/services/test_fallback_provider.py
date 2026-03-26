"""FallbackProvider AC gate tests — exact template strings and safe default.

AC: FallbackProvider().generate("...category: blunder...") returns the exact
blunder template; unrecognised category returns the 'good' template.
"""
import pytest

from backend.app.llm.fallback_provider import FallbackProvider


@pytest.mark.asyncio
async def test_ac_blunder_returns_exact_template():
    """AC: category 'blunder' → exact blunder template string."""
    provider = FallbackProvider()
    result = await provider.generate("Move analysis — category: blunder — cp_loss: 200")
    assert result == "A blunder that loses significant material or allows a decisive tactic."


@pytest.mark.asyncio
async def test_ac_unrecognised_category_returns_good_template():
    """AC: unrecognised category → 'good' template as safe default."""
    provider = FallbackProvider()
    result = await provider.generate("Move analysis — category: unknown_category")
    assert result == "A solid move that keeps the position balanced."
