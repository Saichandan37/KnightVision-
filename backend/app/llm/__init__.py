from .base import BaseLLMProvider, LLMUnavailableError
from .registry import ProviderRegistry

# Module-level singleton — import this everywhere LLM generation is needed
provider_registry = ProviderRegistry()

__all__ = [
    "BaseLLMProvider",
    "LLMUnavailableError",
    "ProviderRegistry",
    "provider_registry",
]
