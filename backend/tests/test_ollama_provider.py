"""OllamaProvider broader tests — timeout, connection error, HTTP errors, env config."""
from unittest.mock import AsyncMock, MagicMock, patch
import os

import httpx
import pytest

from backend.app.llm.ollama_provider import OllamaProvider, _MODEL, _DEFAULT_BASE_URL


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patched_client(post_return=None, get_return=None, post_side_effect=None, get_side_effect=None):
    """Context manager factory for patching httpx.AsyncClient."""
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    if post_return is not None:
        mock_client.post = AsyncMock(return_value=post_return)
    if post_side_effect is not None:
        mock_client.post = AsyncMock(side_effect=post_side_effect)
    if get_return is not None:
        mock_client.get = AsyncMock(return_value=get_return)
    if get_side_effect is not None:
        mock_client.get = AsyncMock(side_effect=get_side_effect)
    return mock_client


def _ok_response(text: str = "nice move") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"response": text}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# provider_name
# ---------------------------------------------------------------------------

def test_provider_name():
    assert OllamaProvider().provider_name == "ollama"


# ---------------------------------------------------------------------------
# Default base URL and env override
# ---------------------------------------------------------------------------

def test_default_base_url():
    provider = OllamaProvider()
    assert provider._base_url == _DEFAULT_BASE_URL


def test_env_override_base_url(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://my-server:11434")
    provider = OllamaProvider()
    assert provider._base_url == "http://my-server:11434"


def test_trailing_slash_stripped(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434/")
    provider = OllamaProvider()
    assert not provider._base_url.endswith("/")


# ---------------------------------------------------------------------------
# generate — success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_returns_stripped_response():
    provider = OllamaProvider()
    mock_client = _patched_client(post_return=_ok_response("  great move  "))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate("prompt")

    assert result == "great move"


@pytest.mark.asyncio
async def test_generate_posts_correct_payload():
    provider = OllamaProvider(timeout_seconds=15)
    mock_client = _patched_client(post_return=_ok_response())

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("my prompt")

    call_kwargs = mock_client.post.call_args
    assert call_kwargs.kwargs["json"]["model"] == _MODEL
    assert call_kwargs.kwargs["json"]["prompt"] == "my prompt"
    assert call_kwargs.kwargs["json"]["stream"] is False


# ---------------------------------------------------------------------------
# generate — error paths → RuntimeError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_timeout_raises_runtime_error():
    provider = OllamaProvider(timeout_seconds=1)
    mock_client = _patched_client(post_side_effect=httpx.TimeoutException("timeout"))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="timed out"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_connect_error_raises_runtime_error():
    provider = OllamaProvider()
    mock_client = _patched_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="Cannot connect"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_http_error_raises_runtime_error():
    provider = OllamaProvider()
    resp = MagicMock()
    resp.status_code = 503
    http_err = httpx.HTTPStatusError("error", request=MagicMock(), response=resp)
    resp.raise_for_status = MagicMock(side_effect=http_err)
    mock_client = _patched_client(post_return=resp)

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="HTTP 503"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_empty_response_raises_runtime_error():
    provider = OllamaProvider()
    mock_client = _patched_client(post_return=_ok_response(""))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="empty"):
            await provider.generate("prompt")


# ---------------------------------------------------------------------------
# check_health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_health_returns_false_on_non_200():
    provider = OllamaProvider()
    resp = MagicMock()
    resp.status_code = 503
    mock_client = _patched_client(get_return=resp)

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.check_health()

    assert result is False


@pytest.mark.asyncio
async def test_check_health_returns_false_on_any_exception():
    provider = OllamaProvider()
    mock_client = _patched_client(get_side_effect=Exception("boom"))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.check_health()

    assert result is False


# ---------------------------------------------------------------------------
# Registry integration — ollama falls back to fallback on error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ollama_falls_back_to_fallback_on_connect_error():
    from backend.app.llm.registry import ProviderRegistry
    from backend.app.llm.fallback_provider import FallbackProvider

    r = ProviderRegistry()
    r.register("ollama", OllamaProvider())
    r.register("fallback", FallbackProvider())
    r.set_provider("ollama")

    mock_client = _patched_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.ollama_provider.httpx.AsyncClient", return_value=mock_client):
        text, source = await r.generate_with_fallback("category: best")

    from backend.app.llm.fallback_provider import _TEMPLATES
    assert text == _TEMPLATES["best"]
    assert source == "llm"
