# Chess AI Agent — LLM Provider Spec (Dynamic Switching)
> **Version:** 1.0 (Phase 1)
> Covers the pluggable LLM adapter architecture, all three providers, prompt design, fallback system, and runtime switching.

---

## 1. Design Goal

The LLM generates **human-readable commentary** for each chess move. It is always optional — the app works fully without it. The system must:

1. Support **three free providers** switchable at runtime with zero server restarts
2. **Never block the analysis pipeline** — LLM failure → instant fallback comment
3. Present a **unified interface** so providers are interchangeable with one line of config

**Important distinction:**
- **Stockfish** = chess engine. Evaluates positions. Always on. Not replaceable.
- **LLM** = commentary layer. Generates readable text. Swappable. Optional.

---

## 2. Provider Adapter Architecture

```
BaseLLMProvider (ABC)
├── OllamaProvider      → localhost:11434 (local, offline)
├── GroqProvider        → api.groq.com (cloud, free tier)
├── HuggingFaceProvider → api-inference.huggingface.co (cloud, free tier)
└── FallbackProvider    → template strings (always available)

ProviderRegistry
├── holds references to all provider instances
├── tracks active_provider (mutable at runtime)
└── routes generate() calls to active provider with timeout + fallback
```

### Abstract Base Class
```python
# backend/llm/base.py
from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique ID: 'ollama' | 'huggingface' | 'groq'"""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        ...

    @property
    @abstractmethod
    def model(self) -> str:
        ...

    @property
    def provider_type(self) -> str:
        return "cloud"  # override in local providers

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate a completion. Raises LLMProviderError on failure."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if provider is reachable and ready."""
        ...


class LLMProviderError(Exception):
    pass
```

---

## 3. Provider Implementations

### 3.1 Ollama (Local / Recommended)
```python
# backend/llm/ollama_provider.py
import httpx
from .base import BaseLLMProvider, LLMProviderError

class OllamaProvider(BaseLLMProvider):
    provider_id = "ollama"
    display_name = "Ollama (Local)"
    provider_type = "local"

    def __init__(self, base_url: str, model: str):
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
                raise LLMProviderError(f"Ollama error: {e}") from e

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False
```

### 3.2 Groq (Cloud, Free Tier)
```python
# backend/llm/groq_provider.py
# Uses OpenAI-compatible API — same code works for any OpenAI-compat endpoint
import httpx
from .base import BaseLLMProvider, LLMProviderError

class GroqProvider(BaseLLMProvider):
    provider_id = "groq"
    display_name = "Groq (Cloud)"
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=20) as client:
            try:
                resp = await client.post(
                    self.BASE_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 120,
                        "temperature": 0.7
                    }
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                raise LLMProviderError(f"Groq error: {e}") from e

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=4) as client:
                resp = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return resp.status_code == 200
        except Exception:
            return False
```

### 3.3 HuggingFace Inference API
```python
# backend/llm/huggingface_provider.py
import httpx
from .base import BaseLLMProvider, LLMProviderError

class HuggingFaceProvider(BaseLLMProvider):
    provider_id = "huggingface"
    display_name = "HuggingFace Inference"
    BASE_URL = "https://api-inference.huggingface.co/models"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.post(
                    f"{self.BASE_URL}/{self.model}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"inputs": prompt, "parameters": {"max_new_tokens": 120, "temperature": 0.7}}
                )
                resp.raise_for_status()
                data = resp.json()
                # HF returns a list of dicts for text-generation models
                if isinstance(data, list):
                    return data[0].get("generated_text", "").replace(prompt, "").strip()
                return str(data)
            except Exception as e:
                raise LLMProviderError(f"HuggingFace error: {e}") from e

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/{self.model}",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return resp.status_code in (200, 503)  # 503 = model loading, still available
        except Exception:
            return False
```

### 3.4 Fallback Provider (Always Available)
```python
# backend/llm/fallback.py
from .base import BaseLLMProvider

FALLBACK_TEMPLATES = {
    "Brilliant":  "A brilliant move! The engine confirms this is the only winning continuation in a deeply tactical position — a sacrifice that pays off beautifully.",
    "Great":      "An excellent choice. This is significantly stronger than the alternatives and demonstrates good positional understanding.",
    "Best":       "The engine's top pick — objectively the strongest move in this position.",
    "Good":       "A solid, reasonable move that keeps the position stable without conceding ground.",
    "Inaccuracy": "A slight inaccuracy. {best_move} would have maintained a better position.",
    "Mistake":    "A mistake that hands the opponent an advantage. {best_move} was the correct continuation.",
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
        # Fallback is never called via generate() directly
        # Use get_fallback_comment() instead
        return "Analysis unavailable."

    async def health_check(self) -> bool:
        return True  # Always available

    @staticmethod
    def get_fallback_comment(category: str, best_move_san: str) -> str:
        template = FALLBACK_TEMPLATES.get(category, "This move was played in this position.")
        return template.format(best_move=best_move_san)
```

---

## 4. Provider Registry (Runtime Switching)
```python
# backend/llm/provider_registry.py
import asyncio
from typing import Dict
from .base import BaseLLMProvider, LLMProviderError
from .fallback import FallbackProvider

class ProviderRegistry:
    """
    Manages all LLM provider instances.
    Active provider is mutable at runtime — call switch_provider() to change it.
    """

    def __init__(self, providers: Dict[str, BaseLLMProvider], default_id: str, timeout_seconds: int = 10):
        self._providers = providers
        self._active_id = default_id
        self._timeout = timeout_seconds
        self._fallback = FallbackProvider()

    @property
    def active_provider(self) -> BaseLLMProvider:
        return self._providers.get(self._active_id, self._fallback)

    @property
    def active_id(self) -> str:
        return self._active_id

    def switch_provider(self, provider_id: str) -> None:
        if provider_id not in self._providers:
            raise ValueError(f"Unknown provider '{provider_id}'")
        self._active_id = provider_id

    async def generate_with_fallback(self, prompt: str, category: str, best_move_san: str) -> tuple[str, str]:
        """
        Returns (comment_text, comment_source).
        comment_source is "llm" or "fallback".
        """
        try:
            text = await asyncio.wait_for(
                self.active_provider.generate(prompt),
                timeout=self._timeout
            )
            return text, "llm"
        except (LLMProviderError, asyncio.TimeoutError, Exception):
            return FallbackProvider.get_fallback_comment(category, best_move_san), "fallback"

    async def get_all_provider_info(self) -> list[dict]:
        results = []
        for pid, provider in self._providers.items():
            available = await provider.health_check()
            results.append({
                "id": pid,
                "name": provider.display_name,
                "is_active": pid == self._active_id,
                "is_available": available,
                "model": provider.model,
                "type": provider.provider_type
            })
        return results
```

---

## 5. LLM Prompt Template

The prompt is built by `analysis_orchestrator.py` using move data from Stockfish:

```python
def build_commentary_prompt(move: dict) -> str:
    return f"""You are a chess coach reviewing a game. Write a 1-2 sentence comment about this specific move for a club-level player (Elo 800-1500). Be concrete — mention the tactic, positional idea, or mistake. Do not start with "This move".

Move #{move['move_number']} ({move['colour'].capitalize()} plays {move['move_san']})
Position FEN: {move['fen_before']}
Category: {move['category']} ({move['category_symbol']})
Centipawn loss: {move['cp_loss']}
Engine's best was: {move['best_move_san']}
{f"Opening: {move['opening_name']} ({move['opening_eco']})" if move.get('opening_name') else ""}

Comment:"""
```

**Prompt guidelines:**
- Keep prompts under 300 tokens — faster inference, lower rate limit consumption
- Instruct for 1-2 sentences only — brevity is important for the UI card
- Provide context without spoiling the position description (FEN is enough for capable models)
- For Brilliant moves, the prompt can invite slightly more excitement in the commentary

---

## 6. Runtime Switching — Full Flow

```
User clicks "Switch to Groq" in SettingsPanel
  → POST /api/llm/provider { "provider_id": "groq" }
  → ProviderRegistry.switch_provider("groq")
  → Health check runs async
  → If available: returns { status: "switched" }
  → If unavailable: sets active but fallback activates on next generate() call
  → Returns { status: "unavailable_fallback_active" }
  → Frontend shows toast: "Groq unavailable — using template comments"

Next move analysis:
  → ProviderRegistry.generate_with_fallback(prompt, category, best_move_san)
  → If Groq responds within 10s: returns LLM comment
  → If timeout/error: returns fallback template comment
  → comment_source field in response indicates which was used
```

---

## 7. Environment Variables (`.env`)

```bash
# .env (never committed to git)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Ollama needs no API key — runs locally
```

---

## 8. Getting Free API Keys

| Provider | How to get free key | Limits |
|----------|---------------------|--------|
| Groq | https://console.groq.com → Create API Key | 30 req/min, 14,400 req/day |
| HuggingFace | https://huggingface.co/settings/tokens → New Token (read) | Varies by model |
| Ollama | No key needed | No limits |

For a 54-move game: 54 LLM calls. Groq free tier can handle ~267 full game analyses per day.

---

*End of llm-provider-spec.md — v1.0*
