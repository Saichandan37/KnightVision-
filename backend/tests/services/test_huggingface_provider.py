"""HuggingFaceProvider AC gate tests — mocked HTTP, no live API key required.

AC: generate() returns a non-empty string that does NOT include the prompt
text as a prefix (echoed prefix is stripped).
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.app.llm.huggingface_provider import HuggingFaceProvider


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch):
    monkeypatch.setenv("HUGGINGFACE_API_KEY", "hf-test-key")


def _mock_client(generated_text: str) -> AsyncMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = [{"generated_text": generated_text}]
    resp.raise_for_status = MagicMock()

    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    client.post = AsyncMock(return_value=resp)
    return client


@pytest.mark.asyncio
async def test_ac_generate_returns_nonempty_without_prompt_prefix():
    """AC: non-empty string returned; prompt prefix is stripped when echoed."""
    prompt = "Name one chess tactic in one sentence."
    # HF API echoes the prompt then appends the generated continuation
    generated_text = f"{prompt} A fork attacks two pieces simultaneously."

    provider = HuggingFaceProvider(timeout_seconds=10)
    mock_client = _mock_client(generated_text)

    with patch("backend.app.llm.huggingface_provider.httpx.AsyncClient", return_value=mock_client):
        result = await provider.generate(prompt)

    assert isinstance(result, str)
    assert len(result) > 0
    assert not result.startswith(prompt), "Prompt prefix was not stripped"
    assert "fork" in result.lower() or "Fork" in result
