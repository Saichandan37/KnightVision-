"""ProviderRegistry — runtime LLM provider management with automatic fallback.

`generate_with_fallback` is the ONLY entry-point for LLM calls in the entire
codebase.  It tries the current provider first; if that fails it works through
all other registered providers in registration order.  If every provider fails
it raises LLMUnavailableError rather than silently returning an empty string.

Usage:
    from backend.app.llm.registry import provider_registry

    provider_registry.register("ollama", OllamaProvider(...))
    provider_registry.register("groq",   GroqProvider(...))
    provider_registry.set_provider("ollama")

    text, source = await provider_registry.generate_with_fallback(prompt)
    # source is always "llm" on success
"""
from __future__ import annotations

import logging
from typing import Optional

from .base import BaseLLMProvider, LLMUnavailableError

logger = logging.getLogger(__name__)


class ProviderRegistry:
    """Holds registered LLM providers and dispatches generation with fallback.

    Registration order determines the fallback sequence when the current
    provider fails.
    """

    def __init__(self) -> None:
        # Insertion-ordered dict: name → provider
        self._providers: dict[str, BaseLLMProvider] = {}
        self._current_name: Optional[str] = None

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, name: str, provider: BaseLLMProvider) -> None:
        """Add *provider* to the registry under *name*.

        Registering a name that already exists silently replaces the old entry.
        The current provider pointer is unchanged.
        """
        self._providers[name] = provider
        logger.debug("LLM provider registered: %s", name)

    # ------------------------------------------------------------------
    # Active-provider selection
    # ------------------------------------------------------------------

    def set_provider(self, name: str) -> None:
        """Set the active provider by name.

        Args:
            name: Must match a previously registered provider name.

        Raises:
            ValueError: if *name* is not in the registry.
        """
        if name not in self._providers:
            raise ValueError(
                f"Provider '{name}' is not registered. "
                f"Available: {list(self._providers)}"
            )
        self._current_name = name
        logger.info("Active LLM provider set to: %s", name)

    @property
    def current_provider(self) -> Optional[BaseLLMProvider]:
        """The currently active provider, or None if none has been set."""
        if self._current_name is None:
            return None
        return self._providers.get(self._current_name)

    @property
    def current_provider_name(self) -> Optional[str]:
        """Name of the currently active provider, or None."""
        return self._current_name

    @property
    def registered_names(self) -> list[str]:
        """Names of all registered providers in registration order."""
        return list(self._providers)

    # ------------------------------------------------------------------
    # Generation with fallback
    # ------------------------------------------------------------------

    async def generate_with_fallback(self, prompt: str) -> tuple[str, str]:
        """Try the current provider, then fall back through all others in order.

        The fallback sequence is:
            1. Current provider (if set).
            2. All other providers in registration order (skipping current).

        Args:
            prompt: The full prompt to send to the model.

        Returns:
            ``(comment_text, "llm")`` from the first provider that succeeds.

        Raises:
            LLMUnavailableError: if no registered provider succeeds (including
                the case where no providers are registered at all).
        """
        if not self._providers:
            raise LLMUnavailableError("No LLM providers are registered.")

        # Build the ordered attempt list: current first, then the rest
        attempt_order: list[tuple[str, BaseLLMProvider]] = []

        if self._current_name and self._current_name in self._providers:
            attempt_order.append(
                (self._current_name, self._providers[self._current_name])
            )

        for name, provider in self._providers.items():
            if name != self._current_name:
                attempt_order.append((name, provider))

        errors: list[str] = []

        for name, provider in attempt_order:
            try:
                text = await provider.generate(prompt)
                if name != self._current_name:
                    logger.warning(
                        "LLM fallback succeeded via '%s' (current='%s')",
                        name,
                        self._current_name,
                    )
                else:
                    logger.debug("LLM generation succeeded via '%s'", name)
                return text, "llm"
            except Exception as exc:
                logger.warning("LLM provider '%s' failed: %s", name, exc)
                errors.append(f"{name}: {exc}")

        raise LLMUnavailableError(
            f"All {len(attempt_order)} LLM provider(s) failed. "
            f"Errors: {'; '.join(errors)}"
        )
