"""Prompt builder and LLM endpoint broader tests."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from backend.app.llm.prompt_builder import build_coaching_prompt
from backend.app.models.api import CandidateMove, MoveCategory, MoveResult
from backend.app.llm.base import BaseLLMProvider
from backend.app.llm import provider_registry


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_move(
    category: MoveCategory = MoveCategory.blunder,
    cp_loss: int = 200,
    san: str = "Qxf7",
    best_move_san: str = "Nf3",
) -> MoveResult:
    return MoveResult(
        move_index=4,
        move_number=3,
        san=san,
        uci="d1f7",
        category=category,
        cp_loss=cp_loss,
        eval_before_cp=30,
        eval_after_cp=-170,
        best_move_uci="g1f3",
        best_move_san=best_move_san,
        top_candidates=[
            CandidateMove(uci="g1f3", san="Nf3", centipawns=30),
            CandidateMove(uci="e2e4", san="e4", centipawns=25),
            CandidateMove(uci="d2d4", san="d4", centipawns=20),
        ],
        comment="",
        comment_source="fallback",
    )


# ---------------------------------------------------------------------------
# Prompt builder — content
# ---------------------------------------------------------------------------

def test_prompt_contains_san():
    prompt = build_coaching_prompt(_make_move(san="Qxf7"))
    assert "Qxf7" in prompt


def test_prompt_contains_category():
    prompt = build_coaching_prompt(_make_move(category=MoveCategory.blunder))
    assert "blunder" in prompt


def test_prompt_contains_cp_loss():
    prompt = build_coaching_prompt(_make_move(cp_loss=175))
    assert "175" in prompt


def test_prompt_contains_best_move():
    prompt = build_coaching_prompt(_make_move(best_move_san="Nf3"))
    assert "Nf3" in prompt


def test_prompt_contains_top_candidates():
    move = _make_move()
    prompt = build_coaching_prompt(move)
    for c in move.top_candidates:
        assert c.san in prompt


def test_prompt_contains_eval_before_and_after():
    prompt = build_coaching_prompt(_make_move())
    assert "30" in prompt   # eval_before_cp
    assert "-170" in prompt  # eval_after_cp


def test_prompt_contains_coaching_instruction():
    prompt = build_coaching_prompt(_make_move())
    assert "chess coach" in prompt
    assert "1-2 sentences" in prompt
    assert "tactical or positional concept" in prompt


def test_prompt_instruction_includes_category_name():
    prompt = build_coaching_prompt(_make_move(category=MoveCategory.inaccuracy))
    assert "inaccuracy" in prompt


def test_prompt_with_empty_candidates():
    move = _make_move()
    move = move.model_copy(update={"top_candidates": []})
    prompt = build_coaching_prompt(move)
    assert "none available" in prompt


def test_prompt_truncates_to_three_candidates():
    """Only the first three candidates appear even if more are present."""
    from backend.app.models.api import CandidateMove
    move = _make_move()
    extra = move.model_copy(update={"top_candidates": [
        CandidateMove(uci="a", san="a1", centipawns=1),
        CandidateMove(uci="b", san="b2", centipawns=2),
        CandidateMove(uci="c", san="c3", centipawns=3),
        CandidateMove(uci="d", san="d4", centipawns=4),  # 4th — should NOT appear
    ]})
    prompt = build_coaching_prompt(extra)
    assert "d4" not in prompt
    assert "c3" in prompt


# ---------------------------------------------------------------------------
# POST /api/llm/provider
# ---------------------------------------------------------------------------

class _OkProvider(BaseLLMProvider):
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
def client():
    from backend.app.main import app
    provider_registry.register("ollama", _OkProvider("ollama"))
    provider_registry.register("groq", _OkProvider("groq"))
    provider_registry.set_provider("ollama")
    with TestClient(app) as c:
        yield c
    provider_registry._providers.pop("groq", None)
    provider_registry._providers.pop("ollama", None)


def test_switch_provider_updates_active(client):
    resp = client.post("/api/llm/provider", json={"provider": "groq"})
    assert resp.status_code == 200
    assert resp.json()["active_provider"] == "groq"
    assert provider_registry.current_provider_name == "groq"


def test_switch_provider_unknown_returns_400(client):
    resp = client.post("/api/llm/provider", json={"provider": "unknown_llm"})
    assert resp.status_code == 400


def test_switch_provider_missing_body_returns_422(client):
    resp = client.post("/api/llm/provider", json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/llm/status
# ---------------------------------------------------------------------------

def test_status_shape(client):
    with patch("backend.app.routers.analysis._check", new=AsyncMock(return_value=True)):
        resp = client.get("/api/llm/status")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["providers"].keys()) == {"ollama", "groq", "huggingface"}
    assert isinstance(data["providers"]["ollama"], bool)
    assert "active" in data


def test_status_active_reflects_current_provider(client):
    provider_registry.set_provider("groq")
    with patch("backend.app.routers.analysis._check", new=AsyncMock(return_value=False)):
        resp = client.get("/api/llm/status")
    assert resp.json()["active"] == "groq"
    provider_registry.set_provider("ollama")


def test_status_unregistered_provider_returns_false():
    """Providers not in the registry report False health."""
    from backend.app.main import app
    # Ensure huggingface is NOT registered
    provider_registry._providers.pop("huggingface", None)
    with TestClient(app) as client:
        # Only mock ollama/groq so huggingface hits the real _check path
        with patch("backend.app.routers.analysis._check", new=AsyncMock(side_effect=[True, True, False])):
            resp = client.get("/api/llm/status")
    assert resp.status_code == 200
    assert resp.json()["providers"]["huggingface"] is False
