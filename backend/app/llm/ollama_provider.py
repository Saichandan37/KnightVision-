"""Ollama LLM provider — calls a locally-running Ollama server.

No API key required.  Users must have Ollama installed and the target model
pulled (`ollama pull llama3.1:8b`).

Configuration:
    base_url: OLLAMA_BASE_URL env var (default http://localhost:11434)
    timeout:  llm.timeout_seconds from config (passed at construction time)

On any timeout or connection error the provider raises RuntimeError so the
ProviderRegistry fallback chain activates automatically.

Usage:
    from backend.app.llm.ollama_provider import OllamaProvider

    provider = OllamaProvider(timeout_seconds=10)
    text = await provider.generate("Analyse this chess move briefly.")
"""
from __future__ import annotations

import logging
import os

import httpx

from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "http://localhost:11434"
_MODEL = "llama3.1:8b"
_GENERATE_PATH = "/api/generate"
_TAGS_PATH = "/api/tags"


class OllamaProvider(BaseLLMProvider):
    """Sends prompts to a local Ollama server and returns the model response."""

    def __init__(self, timeout_seconds: int = 10) -> None:
        self._base_url = os.environ.get("OLLAMA_BASE_URL", _DEFAULT_BASE_URL).rstrip("/")
        self._timeout = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "ollama"

    # ------------------------------------------------------------------
    # BaseLLMProvider contract
    # ------------------------------------------------------------------

    async def generate(self, prompt: str) -> str:
        """POST the prompt to Ollama and return the generated text.

        Raises:
            RuntimeError: on timeout, connection error, or non-2xx response —
                the registry fallback chain will catch this and try the next
                provider.
        """
        url = f"{self._base_url}{_GENERATE_PATH}"
        payload = {"model": _MODEL, "prompt": prompt, "stream": False}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                text = data.get("response", "").strip()
                if not text:
                    raise RuntimeError("Ollama returned an empty response")
                logger.debug("Ollama generated %d chars via %s", len(text), _MODEL)
                return text

        except httpx.TimeoutException as exc:
            raise RuntimeError(
                f"Ollama request timed out after {self._timeout}s"
            ) from exc
        except httpx.ConnectError as exc:
            raise RuntimeError(
                f"Cannot connect to Ollama at {self._base_url}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Ollama returned HTTP {exc.response.status_code}"
            ) from exc

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def check_health(self) -> bool:
        """Return True if the Ollama server responds to GET /api/tags."""
        url = f"{self._base_url}{_TAGS_PATH}"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception:
            return False
