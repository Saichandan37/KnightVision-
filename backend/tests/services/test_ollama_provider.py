"""OllamaProvider AC gate tests — mocked HTTP, no live Ollama required.

AC: generate() returns a non-empty string when Ollama responds successfully;
check_health() returns True on 200 and False when unreachable.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.app.llm.ollama_provider import OllamaProvider


def _mock_response(status_code: int = 200, json_data: dict = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {"response": "A solid defensive move."}
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        from httpx import HTTPStatusError, Request, Response
        resp.raise_for_status.side_effect = HTTPStatusError(
            "error", request=MagicMock(), response=resp
        )
    return resp


@pytest.mark.asyncio
async def test_ac_generate_returns_nonempty_string():
    """AC: successful Ollama response → non-empty string."""
    provider = OllamaProvider(timeout_seconds=10)
    mock_resp = _mock_response(json_data={"response": "Excellent central control."})

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await provider.generate("Explain this chess move briefly.")

    assert isinstance(result, str)
    assert len(result) > 0
    assert result == "Excellent central control."


@pytest.mark.asyncio
async def test_ac_check_health_true_on_200():
    """AC: check_health() returns True when Ollama responds 200."""
    provider = OllamaProvider()
    health_resp = MagicMock()
    health_resp.status_code = 200

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=health_resp)
        mock_client_cls.return_value = mock_client

        result = await provider.check_health()

    assert result is True


@pytest.mark.asyncio
async def test_ac_check_health_false_when_unreachable():
    """AC: check_health() returns False when Ollama is not running."""
    import httpx
    provider = OllamaProvider()

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("refused"))
        mock_client_cls.return_value = mock_client

        result = await provider.check_health()

    assert result is False
