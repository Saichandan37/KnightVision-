"""HuggingFaceProvider broader tests — init guard, payload, prefix stripping, errors."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from backend.app.llm.huggingface_provider import HuggingFaceProvider, _API_URL, _MODEL


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch):
    monkeypatch.setenv("HUGGINGFACE_API_KEY", "hf-sk-test")


def _mock_client(post_return=None, post_side_effect=None) -> AsyncMock:
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    if post_return is not None:
        client.post = AsyncMock(return_value=post_return)
    if post_side_effect is not None:
        client.post = AsyncMock(side_effect=post_side_effect)
    return client


def _ok_resp(generated_text: str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = [{"generated_text": generated_text}]
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Init guards
# ---------------------------------------------------------------------------

def test_missing_api_key_raises_at_init(monkeypatch):
    monkeypatch.delenv("HUGGINGFACE_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="HUGGINGFACE_API_KEY not set"):
        HuggingFaceProvider()


def test_empty_api_key_raises_at_init(monkeypatch):
    monkeypatch.setenv("HUGGINGFACE_API_KEY", "")
    with pytest.raises(RuntimeError, match="HUGGINGFACE_API_KEY not set"):
        HuggingFaceProvider()


# ---------------------------------------------------------------------------
# provider_name
# ---------------------------------------------------------------------------

def test_provider_name():
    assert HuggingFaceProvider().provider_name == "huggingface"


# ---------------------------------------------------------------------------
# generate — prompt prefix stripping
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_strips_echoed_prompt():
    """When API echoes prompt + continuation, only continuation is returned."""
    prompt = "Explain this move."
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp(f"{prompt} It controls the center."))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate(prompt)

    assert result == "It controls the center."
    assert not result.startswith(prompt)


@pytest.mark.asyncio
async def test_generate_no_prefix_returned_as_is():
    """When API returns only new text (no echo), return it directly."""
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp("Strong central control."))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate("some prompt")

    assert result == "Strong central control."


@pytest.mark.asyncio
async def test_generate_strips_surrounding_whitespace():
    prompt = "prompt"
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp(f"{prompt}   nice move   "))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate(prompt)

    assert result == "nice move"


# ---------------------------------------------------------------------------
# generate — payload and headers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_posts_correct_payload():
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp("ok"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("chess prompt")

    call_kwargs = mock_client.post.call_args
    body = call_kwargs.kwargs["json"]
    assert body["inputs"] == "chess prompt"
    assert body["parameters"]["max_new_tokens"] == 100


@pytest.mark.asyncio
async def test_generate_sends_bearer_auth():
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp("ok"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("prompt")

    headers = mock_client.post.call_args.kwargs["headers"]
    assert headers["Authorization"] == "Bearer hf-sk-test"


@pytest.mark.asyncio
async def test_generate_posts_to_correct_url():
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_return=_ok_resp("ok"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        await provider.generate("prompt")

    url = mock_client.post.call_args.args[0]
    assert url == _API_URL
    assert _MODEL in url


# ---------------------------------------------------------------------------
# generate — error paths → RuntimeError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_timeout_raises_runtime_error():
    provider = HuggingFaceProvider(timeout_seconds=3)
    mock_client = _mock_client(post_side_effect=httpx.TimeoutException("timeout"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="timed out"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_connect_error_raises_runtime_error():
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="Cannot connect"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_http_503_raises_runtime_error():
    provider = HuggingFaceProvider()
    resp = MagicMock()
    resp.status_code = 503
    resp.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError("err", request=MagicMock(), response=resp)
    )
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="HTTP 503"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_malformed_response_raises_runtime_error():
    provider = HuggingFaceProvider()
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"unexpected": "dict"}
    resp.raise_for_status = MagicMock()
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="response shape"):
            await provider.generate("prompt")


@pytest.mark.asyncio
async def test_generate_empty_after_strip_raises_runtime_error():
    """Prompt echoed but no continuation → empty text → RuntimeError."""
    prompt = "explain this"
    provider = HuggingFaceProvider()
    # API returns only the prompt with trailing whitespace, no new content
    mock_client = _mock_client(post_return=_ok_resp(f"{prompt}   "))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="empty"):
            await provider.generate(prompt)


# ---------------------------------------------------------------------------
# check_health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_health_true_on_200():
    provider = HuggingFaceProvider()
    resp = MagicMock()
    resp.status_code = 200
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        assert await provider.check_health() is True


@pytest.mark.asyncio
async def test_check_health_false_on_non_200():
    provider = HuggingFaceProvider()
    resp = MagicMock()
    resp.status_code = 401
    mock_client = _mock_client(post_return=resp)

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        assert await provider.check_health() is False


@pytest.mark.asyncio
async def test_check_health_false_on_exception():
    provider = HuggingFaceProvider()
    mock_client = _mock_client(post_side_effect=httpx.ConnectError("refused"))

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        assert await provider.check_health() is False
