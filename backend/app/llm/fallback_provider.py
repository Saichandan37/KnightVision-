"""FallbackProvider — template-based coaching comments that need no external service.

When every real LLM provider is unreachable this provider guarantees a human-
readable coaching comment by extracting the MoveCategory from the prompt via
regex and returning a fixed template string.

The `generate()` method is intentionally synchronous in its logic (no I/O),
but the async signature satisfies the BaseLLMProvider contract.

Usage:
    from backend.app.llm.fallback_provider import FallbackProvider

    provider = FallbackProvider()
    text = await provider.generate("...category: blunder...")
    # → "A blunder that loses significant material or allows a decisive tactic."
"""
from __future__ import annotations

import re

from .base import BaseLLMProvider

# One template per MoveCategory value (must stay in sync with MoveCategory enum)
_TEMPLATES: dict[str, str] = {
    "brilliant":  "A brilliant sacrifice — this move creates complications the opponent cannot handle.",
    "great":      "An excellent move that finds the best practical option.",
    "best":       "The engine's top choice — well played.",
    "good":       "A solid move that keeps the position balanced.",
    "inaccuracy": "A slight inaccuracy — there was a better option available.",
    "mistake":    "A mistake that gives the opponent a meaningful advantage.",
    "blunder":    "A blunder that loses significant material or allows a decisive tactic.",
}

_DEFAULT_TEMPLATE = _TEMPLATES["good"]

# Matches "category: blunder", "category blunder", "Category: Blunder", etc.
_CATEGORY_RE = re.compile(r"\bcategory[:\s]+(\w+)", re.IGNORECASE)


class FallbackProvider(BaseLLMProvider):
    """Returns hardcoded template strings — never calls an external service."""

    @property
    def provider_name(self) -> str:
        return "fallback"

    async def generate(self, prompt: str) -> str:
        """Extract MoveCategory from *prompt* and return the matching template.

        Falls back to the `good` template when the category is absent or
        unrecognised, so the method never raises.
        """
        match = _CATEGORY_RE.search(prompt)
        if match:
            category = match.group(1).lower()
            return _TEMPLATES.get(category, _DEFAULT_TEMPLATE)
        return _DEFAULT_TEMPLATE
