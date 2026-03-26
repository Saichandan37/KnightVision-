"""LLM endpoint AC gate tests.

AC: POST /api/llm/provider with {"provider": "groq"} returns HTTP 200 with
{"active_provider": "groq"}; GET /api/llm/status returns health booleans for
all three providers.
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.llm import provider_registry
from backend.app.llm.base import BaseLLMProvider


class _StubProvider(BaseLLMProvider):
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(self, prompt: str) -> str:
        return "ok"

    async def check_health(self) -> bool:
        return True


@pytest.fixture()
def client_with_groq():
    """TestClient with 'groq' registered so set_provider('groq') works."""
    provider_registry.register("groq", _StubProvider("groq"))
    provider_registry.register("ollama", _StubProvider("ollama"))
    provider_registry.set_provider("ollama")
    with TestClient(app) as c:
        yield c
    # Restore: remove test stubs so they don't bleed into other tests
    provider_registry._providers.pop("groq", None)
    provider_registry._providers.pop("ollama", None)


def test_ac_switch_provider_returns_200_and_active_name(client_with_groq):
    """AC: POST /api/llm/provider {"provider": "groq"} → 200, {"active_provider": "groq"}."""
    response = client_with_groq.post("/api/llm/provider", json={"provider": "groq"})
    assert response.status_code == 200
    assert response.json() == {"active_provider": "groq"}


def test_ac_status_returns_health_booleans():
    """AC: GET /api/llm/status returns health booleans for all three providers."""
    with patch("backend.app.routers.analysis._check", new=AsyncMock(return_value=False)):
        with TestClient(app) as client:
            response = client.get("/api/llm/status")

    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert "ollama" in data["providers"]
    assert "groq" in data["providers"]
    assert "huggingface" in data["providers"]
    assert "active" in data
