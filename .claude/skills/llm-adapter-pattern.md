# Skill: LLM Adapter Pattern

## Purpose
Implement a pluggable LLM commentary layer that can switch between Ollama (local/offline), Groq (cloud), and HuggingFace (cloud) at **runtime without server restart**. The LLM generates natural-language explanations for chess moves. It is always optional — a fallback template system activates automatically on timeout or failure.

---

## Architecture

```
BaseLLMProvider (ABC)
├── OllamaProvider      → localhost:11434  (local, always free, no rate limit)
├── GroqProvider        → api.groq.com     (free tier: 30 req/min, 14,400/day)
├── HuggingFaceProvider → api-inference.huggingface.co (free tier, rate varies)
└── FallbackProvider    → template strings (always available, no network)

ProviderRegistry
├── Holds instances of all providers
├── Tracks active_provider_id (mutable string, thread-safe)
├── Routes generate() to active provider with asyncio timeout
└── Catches ALL exceptions and falls back to FallbackProvider
```

---

## BaseLLMProvider ABC

```python
# backend/llm/base.py
from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique string ID: 'ollama' | 'groq' | 'huggingface'"""

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for UI, e.g. 'Ollama (Local)'"""

    @property
    @abstractmethod
    def model(self) -> str:
        """Model identifier string"""

    @property
    def provider_type(self) -> str:
        return "cloud"  # Override in local providers

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """
        Generate commentary text. Max ~120 tokens output.
        Raises LLMProviderError on any failure (timeout, HTTP error, parse error).
        """

    @abstractmethod
    async def health_check(self) -> bool:
        """Quick connectivity check. Must return within 3-5 seconds."""


class LLMProviderError(Exception):
    """Raised by any provider on generation failure. Triggers fallback."""
```

---

## Provider Implementations

### Ollama (Recommended — Local)
```python
# backend/llm/ollama_provider.py
import httpx
from .base import BaseLLMProvider, LLMProviderError

class OllamaProvider(BaseLLMProvider):
    provider_id = "ollama"
    display_name = "Ollama (Local)"
    provider_type = "local"

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.1:8b"):
        self.base_url = base_url.rstrip("/")
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "options": {"temperature": 0.7, "num_predict": 120}
                    }
                )
                resp.raise_for_status()
                return resp.json()["message"]["content"].strip()
            except Exception as e:
                raise LLMProviderError(f"Ollama: {e}") from e

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3) as c:
                return (await c.get(f"{self.base_url}/api/tags")).status_code == 200
        except Exception:
            return False
```

### Groq (Cloud Free Tier)
```python
# backend/llm/groq_provider.py
import httpx
from .base import BaseLLMProvider, LLMProviderError

class GroqProvider(BaseLLMProvider):
    provider_id = "groq"
    display_name = "Groq (Cloud)"
    _URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        self.api_key = api_key
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=20) as client:
            try:
                resp = await client.post(
                    self._URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": [{"role": "user", "content": prompt}],
                          "max_tokens": 120, "temperature": 0.7}
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                raise LLMProviderError(f"Groq: {e}") from e

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=4) as c:
                r = await c.get("https://api.groq.com/openai/v1/models",
                                headers={"Authorization": f"Bearer {self.api_key}"})
                return r.status_code == 200
        except Exception:
            return False
```

### HuggingFace Inference API
```python
# backend/llm/huggingface_provider.py
import httpx
from .base import BaseLLMProvider, LLMProviderError

class HuggingFaceProvider(BaseLLMProvider):
    provider_id = "huggingface"
    display_name = "HuggingFace Inference"
    _BASE = "https://api-inference.huggingface.co/models"

    def __init__(self, api_key: str, model: str = "HuggingFaceH4/zephyr-7b-beta"):
        self.api_key = api_key
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.post(
                    f"{self._BASE}/{self.model}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"inputs": prompt, "parameters": {"max_new_tokens": 120, "temperature": 0.7}}
                )
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list):
                    return data[0].get("generated_text", "").replace(prompt, "").strip()
                return str(data)
            except Exception as e:
                raise LLMProviderError(f"HuggingFace: {e}") from e

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{self._BASE}/{self.model}",
                                headers={"Authorization": f"Bearer {self.api_key}"})
                return r.status_code in (200, 503)  # 503 = loading, still reachable
        except Exception:
            return False
```

---

## Provider Registry (Runtime Switching)

```python
# backend/llm/provider_registry.py
import asyncio
from typing import Dict
from .base import BaseLLMProvider, LLMProviderError
from .fallback import FallbackProvider

class ProviderRegistry:
    def __init__(self, providers: Dict[str, BaseLLMProvider], default_id: str, timeout: int = 10):
        self._providers = providers
        self._active_id = default_id
        self._timeout = timeout
        self._fallback = FallbackProvider()

    @property
    def active_id(self) -> str:
        return self._active_id

    @property
    def active_provider(self) -> BaseLLMProvider:
        return self._providers.get(self._active_id, self._fallback)

    def switch(self, provider_id: str) -> None:
        if provider_id not in self._providers:
            raise ValueError(f"Unknown provider '{provider_id}'")
        self._active_id = provider_id

    async def generate_with_fallback(self, prompt: str, category: str, best_move_san: str) -> tuple[str, str]:
        """Returns (comment_text, 'llm'|'fallback')"""
        try:
            text = await asyncio.wait_for(
                self.active_provider.generate(prompt),
                timeout=self._timeout
            )
            return text, "llm"
        except (LLMProviderError, asyncio.TimeoutError, Exception):
            return FallbackProvider.get_fallback_comment(category, best_move_san), "fallback"

    async def get_all_info(self) -> list[dict]:
        return [
            {
                "id": pid,
                "name": p.display_name,
                "is_active": pid == self._active_id,
                "is_available": await p.health_check(),
                "model": p.model,
                "type": p.provider_type,
            }
            for pid, p in self._providers.items()
        ]
```

---

## Fallback Provider

```python
# backend/llm/fallback.py
from .base import BaseLLMProvider

_TEMPLATES = {
    "Brilliant":  "A brilliant sacrifice! The engine confirms this is the only winning continuation in a deeply tactical position.",
    "Great":      "An excellent move, significantly stronger than the alternatives available here.",
    "Best":       "The engine's top pick — the objectively strongest move in this position.",
    "Good":       "A solid, reasonable move that keeps the position stable.",
    "Inaccuracy": "A slight inaccuracy. {best_move} would have maintained a better position.",
    "Mistake":    "A mistake that gives the opponent an advantage. {best_move} was the correct approach.",
    "Blunder":    "A serious blunder! {best_move} was essential to stay in the game.",
}

class FallbackProvider(BaseLLMProvider):
    provider_id = "fallback"
    display_name = "Template Fallback"
    provider_type = "local"

    @property
    def model(self) -> str:
        return "template"

    async def generate(self, prompt: str) -> str:
        return "Analysis unavailable."  # Should not be called directly

    async def health_check(self) -> bool:
        return True

    @staticmethod
    def get_fallback_comment(category: str, best_move_san: str) -> str:
        t = _TEMPLATES.get(category, "This move was played in this position.")
        return t.format(best_move=best_move_san)
```

---

## FastAPI Dependency Injection

```python
# backend/main.py — initialise registry at startup
from llm.provider_registry import ProviderRegistry
from llm.ollama_provider import OllamaProvider
from llm.groq_provider import GroqProvider
from llm.huggingface_provider import HuggingFaceProvider

def create_registry(settings) -> ProviderRegistry:
    providers = {
        "ollama": OllamaProvider(settings.llm.ollama.base_url, settings.llm.ollama.model),
        "groq": GroqProvider(settings.llm.groq.api_key, settings.llm.groq.model),
        "huggingface": HuggingFaceProvider(settings.llm.huggingface.api_key, settings.llm.huggingface.model),
    }
    return ProviderRegistry(providers, default_id=settings.llm.active_provider, timeout=settings.llm.timeout_seconds)

# Store as app state
app.state.llm_registry = create_registry(settings)

# Dependency for routers
def get_llm_registry(request: Request) -> ProviderRegistry:
    return request.app.state.llm_registry
```

---

## Rules for Developer Agents

1. **NEVER call `provider.generate()` directly** — always go through `registry.generate_with_fallback()`. This ensures timeout and fallback are always applied.
2. **LLM is commentary-only.** It never evaluates positions. Only Stockfish centipawn scores determine move category.
3. **Switching providers is synchronous** (`registry.switch()`) — the health check runs separately. The provider may be unavailable; that's fine — fallback triggers on the next `generate_with_fallback()` call.
4. **Provider switch does NOT restart the server** and does NOT affect in-progress analysis for other games.
5. **API keys come from `.env` only** — never hardcode, never log them.
6. Groq free tier: 30 req/min. For a 54-move game = 54 LLM calls. If rate-limited, the fallback triggers gracefully.
