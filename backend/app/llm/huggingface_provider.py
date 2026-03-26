"""HuggingFace Inference API provider — third LLM option, free tier available.

Requires only a HuggingFace account token (free).  Uses the serverless
Inference API endpoint for Mistral-7B-Instruct.

Configuration:
    api_key:  HUGGINGFACE_API_KEY env var — raises RuntimeError at init if missing
    timeout:  llm.timeout_seconds from config (passed at construction time)

The HuggingFace Inference API echoes the input prompt inside `generated_text`;
this provider strips the prompt prefix so callers always receive only the new
generated content.

Usage:
    from backend.app.llm.huggingface_provider import HuggingFaceProvider

    provider = HuggingFaceProvider(timeout_seconds=10)
    text = await provider.generate("Analyse this chess move briefly.")
"""
from __future__ import annotations

import logging
import os

import httpx

from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"
_API_URL = f"https://api-inference.huggingface.co/models/{_MODEL}"
_MAX_NEW_TOKENS = 100


class HuggingFaceProvider(BaseLLMProvider):
    """Sends prompts to the HuggingFace serverless Inference API."""

    def __init__(self, timeout_seconds: int = 10) -> None:
        api_key = os.environ.get("HUGGINGFACE_API_KEY", "")
        if not api_key:
            raise RuntimeError("HUGGINGFACE_API_KEY not set")
        self._api_key = api_key
        self._timeout = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "huggingface"

    # ------------------------------------------------------------------
    # BaseLLMProvider contract
    # ------------------------------------------------------------------

    async def generate(self, prompt: str) -> str:
        """POST the prompt to the HuggingFace Inference API and return new text.

        The API echoes the input inside `generated_text`; the prompt prefix is
        stripped so the returned string contains only the model's new output.

        Raises:
            RuntimeError: on timeout, connection error, or non-2xx response.
        """
        headers = {"Authorization": f"Bearer {self._api_key}"}
        payload = {
            "inputs": prompt,
            "parameters": {"max_new_tokens": _MAX_NEW_TOKENS},
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                raw = data[0]["generated_text"]

        except httpx.TimeoutException as exc:
            raise RuntimeError(
                f"HuggingFace request timed out after {self._timeout}s"
            ) from exc
        except httpx.ConnectError as exc:
            raise RuntimeError("Cannot connect to HuggingFace API") from exc
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"HuggingFace returned HTTP {exc.response.status_code}"
            ) from exc
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(
                f"Unexpected HuggingFace response shape: {exc}"
            ) from exc

        # Strip echoed prompt prefix — HF Inference API includes the input
        text = raw[len(prompt):].strip() if raw.startswith(prompt) else raw.strip()

        if not text:
            raise RuntimeError("HuggingFace returned an empty generated text")

        logger.debug("HuggingFace generated %d chars via %s", len(text), _MODEL)
        return text

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def check_health(self) -> bool:
        """Return True if the HuggingFace API accepts a minimal request."""
        headers = {"Authorization": f"Bearer {self._api_key}"}
        payload = {"inputs": "hi", "parameters": {"max_new_tokens": 1}}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(_API_URL, json=payload, headers=headers)
                return response.status_code == 200
        except Exception:
            return False
