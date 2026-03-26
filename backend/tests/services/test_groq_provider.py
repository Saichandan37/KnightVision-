"""GroqProvider AC gate tests — mocked HTTP, no live API key required.

AC: generate() returns a non-empty string on a valid 200 response;
check_health() returns False on a non-200 / error without raising.
"""
from unittest.mock import AsyncMock, MagicMock, patch
import os

import pytest

from backend.app.llm.groq_provider import GroqProvider


def _ok_response(content: str = "Fork is a tactic where one piece attacks two.") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "choices": [{"message": {"content": content}}]
    }
    resp.raise_for_status = MagicMock()
    return resp


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key-abc")


# ---------------------------------------------------------------------------
# AC Gate tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ac_generate_returns_nonempty_string():
    """AC: valid 200 response → non-empty string returned."""
    provider = GroqProvider(timeout_seconds=10)
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=_ok_response())

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate("Name one chess tactic in one sentence.")

    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_ac_check_health_false_on_invalid_key():
    """AC: invalid/rejected key → check_health() returns False without raising."""
    provider = GroqProvider()
    resp = MagicMock()
    resp.status_code = 401
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=resp)

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.check_health()

    assert result is False
