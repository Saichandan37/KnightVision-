"""Groq LLM provider — calls the Groq cloud API (OpenAI-compatible endpoint).

No local GPU required; uses Groq's free tier.  Requires GROQ_API_KEY to be
set in the environment or a .env file.

Configuration:
    api_key:  GROQ_API_KEY env var — raises RuntimeError at init if missing
    timeout:  llm.timeout_seconds from config (passed at construction time)

On timeout or HTTP error the provider raises RuntimeError so the registry
fallback chain activates automatically.

Usage:
    from backend.app.llm.groq_provider import GroqProvider

    provider = GroqProvider(timeout_seconds=10)
    text = await provider.generate("Analyse this chess move briefly.")
"""
from __future__ import annotations

import logging
import os

import httpx

from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

_API_URL = "https://api.groq.com/openai/v1/chat/completions"
_MODEL = "llama3-8b-8192"
_MAX_TOKENS = 150


class GroqProvider(BaseLLMProvider):
    """Sends prompts to the Groq cloud API using the OpenAI-compatible endpoint."""

    def __init__(self, timeout_seconds: int = 10) -> None:
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        self._api_key = api_key
        self._timeout = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "groq"

    # ------------------------------------------------------------------
    # BaseLLMProvider contract
    # ------------------------------------------------------------------

    async def generate(self, prompt: str) -> str:
        """POST the prompt to Groq and return the generated text.

        Raises:
            RuntimeError: on timeout, connection error, or non-2xx response.
        """
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": _MAX_TOKENS,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                text = data["choices"][0]["message"]["content"].strip()
                if not text:
                    raise RuntimeError("Groq returned an empty response")
                logger.debug("Groq generated %d chars via %s", len(text), _MODEL)
                return text

        except httpx.TimeoutException as exc:
            raise RuntimeError(
                f"Groq request timed out after {self._timeout}s"
            ) from exc
        except httpx.ConnectError as exc:
            raise RuntimeError("Cannot connect to Groq API") from exc
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Groq returned HTTP {exc.response.status_code}"
            ) from exc
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected Groq response shape: {exc}") from exc

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def check_health(self) -> bool:
        """Return True if Groq API accepts a minimal completion request."""
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": _MODEL,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(_API_URL, json=payload, headers=headers)
                return response.status_code == 200
        except Exception:
            return False
