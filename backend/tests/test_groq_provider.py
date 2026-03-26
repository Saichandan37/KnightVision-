"""GroqProvider broader tests — init guards, payload shape, error paths, health."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from backend.app.llm.groq_provider import GroqProvider, _API_URL, _MODEL


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "sk-test-key")


def _mock_client(post_return=None, post_side_effect=None):
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    if post_return is not None:
        client.post = AsyncMock(return_value=post_return)
    if post_side_effect is not None:
        client.post = AsyncMock(side_effect=post_side_effect)
    return client


def _ok_resp(content: str = "good move") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Init guards
# ---------------------------------------------------------------------------

def test_missing_api_key_raises_at_init(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="GROQ_API_KEY not set"):
        GroqProvider()


def test_empty_api_key_raises_at_init(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "")
    with pytest.raises(RuntimeError, match="GROQ_API_KEY not set"):
        GroqProvider()


# ---------------------------------------------------------------------------
# provider_name
# ---------------------------------------------------------------------------

def test_provider_name():
    assert GroqProvider().provider_name == "groq"


# ---------------------------------------------------------------------------
# generate — success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_returns_stripped_content():
    provider = GroqProvider()
    mock_client = _mock_client(post_return=_ok_resp("  great move  "))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate("prompt")

    assert result == "great move"


@pytest.mark.asyncio
async def test_generate_posts_correct_payload():
    provider = GroqProvider(timeout_seconds=15)
    mock_client = _mock_client(post_return=_ok_resp())

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("my chess prompt")

    call_kwargs = mock_client.post.call_args
    body = call_kwargs.kwargs["json"]
    assert body["model"] == _MODEL
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][0]["content"] == "my chess prompt"
    assert "max_tokens" in body


@pytest.mark.asyncio
async def test_generate_sends_bearer_auth():
    provider = GroqProvider()
    mock_client = _mock_client(post_return=_ok_resp())

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("prompt")

    headers = mock_client.post.call_args.kwargs["headers"]
    assert headers["Authorization"] == "Bearer sk-test-key"


@pytest.mark.asyncio
async def test_generate_posts_to_correct_url():
    provider = GroqProvider()
    mock_client = _mock_client(post_return=_ok_resp())

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("prompt")

    url = mock_client.post.call_args.args[0]
    assert url == _API_URL


# ---------------------------------------------------------------------------
# generate — error paths → RuntimeError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_timeout_raises_runtime_error():
    provider = GroqProvider(timeout_seconds=5)
    mock_client = _mock_client(post_side_effect=httpx.TimeoutException("timeout"))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="timed out"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_connect_error_raises_runtime_error():
    provider = GroqProvider()
    mock_client = _mock_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="Cannot connect"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_http_401_raises_runtime_error():
    provider = GroqProvider()
    resp = MagicMock()
    resp.status_code = 401
    resp.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError("err", request=MagicMock(), response=resp)
    )
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="HTTP 401"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_empty_content_raises_runtime_error():
    provider = GroqProvider()
    mock_client = _mock_client(post_return=_ok_resp(""))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="empty"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_malformed_response_raises_runtime_error():
    provider = GroqProvider()
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"unexpected": "shape"}
    resp.raise_for_status = MagicMock()
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="response shape"):
            await provider.generate("prompt")


# ---------------------------------------------------------------------------
# check_health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_health_true_on_200():
    provider = GroqProvider()
    resp = MagicMock()
    resp.status_code = 200
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        assert await provider.check_health() is True


@pytest.mark.asyncio
async def test_check_health_false_on_exception():
    provider = GroqProvider()
    mock_client = _mock_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        assert await provider.check_health() is False


# ---------------------------------------------------------------------------
# Registry integration — groq falls back to fallback on error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_groq_falls_back_to_fallback_on_timeout():
    from backend.app.llm.registry import ProviderRegistry
    from backend.app.llm.fallback_provider import FallbackProvider, _TEMPLATES

    r = ProviderRegistry()
    r.register("groq", GroqProvider())
    r.register("fallback", FallbackProvider())
    r.set_provider("groq")

    mock_client = _mock_client(post_side_effect=httpx.TimeoutException("timeout"))

    with patch("backend.app.llm.groq_provider.httpx.AsyncClient", return_value=mock_client):
        text, source = await r.generate_with_fallback("category: mistake")

    assert text == _TEMPLATES["mistake"]
    assert source == "llm"
