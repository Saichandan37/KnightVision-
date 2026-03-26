"""BaseLLMProvider ABC and LLMUnavailableError.

All LLM provider implementations must subclass BaseLLMProvider and implement:
    - provider_name (property): unique string identifier
    - generate(prompt)        : async method returning the LLM's response text

Usage:
    from backend.app.llm.base import BaseLLMProvider, LLMUnavailableError
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class LLMUnavailableError(Exception):
    """Raised by ProviderRegistry when every registered provider has failed."""


class BaseLLMProvider(ABC):
    """Abstract base class that every LLM provider must implement."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique, human-readable identifier for this provider (e.g. 'ollama')."""

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Call the LLM and return the generated text.

        Args:
            prompt: The full prompt string to send to the model.

        Returns:
            The model's response as a plain string.

        Raises:
            Any exception on failure — the registry will catch it and fall back.
        """
