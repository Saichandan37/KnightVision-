"""WebSocket handler supporting tests — connection lifecycle, message structure, error cases."""
from __future__ import annotations

import time
from typing import List
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.api import AnalysisComplete, MoveCategory, MoveResult
from backend.app.store.memory_store import game_store

_VALID_PGN = """[Event "Test"][White "W"][Black "B"][Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *"""

client = TestClient(app)


def _make_move_result(move_index: int) -> MoveResult:
    return MoveResult(
        move_index=move_index,
        move_number=(move_index // 2) + 1,
        san="e4",
        uci="e2e4",
        category=MoveCategory.best,
        cp_loss=0,
        eval_before_cp=0,
        eval_after_cp=30,
        best_move_uci="e2e4",
        best_move_san="e4",
        top_candidates=[],
        comment="",
        comment_source="fallback",
    )


def _make_mock_analysis(num_moves: int = 1):
    async def _mock(game_id, pgn, config, on_move_result, **kw):
        await game_store.set_status(game_id, "analysing")
        for i in range(num_moves):
            mr = _make_move_result(i)
            await on_move_result(mr)
            await game_store.append_move(game_id, mr)
        await game_store.set_status(game_id, "complete")
        return AnalysisComplete(
            white_accuracy=90.0, black_accuracy=80.0, total_moves=num_moves
        )

    return _mock


async def _mock_llm(prompt):
    return ("coaching comment", "fallback")


def _collect(ws, max_msgs: int = 60) -> List[dict]:
    """Collect messages until analysis_complete or the socket closes."""
    msgs = []
    try:
        for _ in range(max_msgs):
            msg = ws.receive_json()
            msgs.append(msg)
            if msg.get("type") == "analysis_complete":
                break
    except Exception:
        pass
    return msgs


# ---------------------------------------------------------------------------
# Connection error cases
# ---------------------------------------------------------------------------

def test_unknown_game_id_receives_error_and_closes():
    """WS connect with unknown game_id → error message with type='error'."""
    with client.websocket_connect("/ws/analysis/nonexistent-id") as ws:
        msg = ws.receive_json()
    assert msg["type"] == "error"
    assert "not found" in msg["message"].lower()


# ---------------------------------------------------------------------------
# Message structure — live stream
# ---------------------------------------------------------------------------

def test_live_move_message_contains_required_fields(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(1))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert move_msgs, "Expected move messages"
    msg = move_msgs[0]
    for field in ("move_index", "san", "uci", "category", "cp_loss", "buffered", "comment"):
        assert field in msg, f"Missing field: {field}"


def test_live_move_has_comment_field(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(1))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert move_msgs[0]["comment"] == "coaching comment"


def test_live_move_comment_source_is_fallback(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(1))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert move_msgs[0]["comment_source"] == "fallback"


# ---------------------------------------------------------------------------
# AnalysisComplete message
# ---------------------------------------------------------------------------

def test_analysis_complete_message_sent_after_moves(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(2))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    complete_msgs = [m for m in messages if m.get("type") == "analysis_complete"]
    assert len(complete_msgs) == 1


def test_analysis_complete_has_accuracy_fields(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(1))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    complete = next(m for m in messages if m.get("type") == "analysis_complete")
    assert "white_accuracy" in complete
    assert "black_accuracy" in complete
    assert "total_moves" in complete


def test_analysis_complete_is_last_message(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(2))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    assert messages[-1].get("type") == "analysis_complete"


# ---------------------------------------------------------------------------
# Ordering — move_result messages come before analysis_complete
# ---------------------------------------------------------------------------

def test_move_messages_precede_analysis_complete(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(3))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    complete_idx = next(
        i for i, m in enumerate(messages) if m.get("type") == "analysis_complete"
    )
    move_msgs = [m for m in messages if "buffered" in m]
    for m in move_msgs:
        assert messages.index(m) < complete_idx


# ---------------------------------------------------------------------------
# Late join — buffered replay
# ---------------------------------------------------------------------------

def test_late_join_receives_analysis_complete(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(2))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        _collect(ws)

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    complete_msgs = [m for m in messages if m.get("type") == "analysis_complete"]
    assert len(complete_msgs) == 1


def test_late_join_correct_move_count(monkeypatch):
    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(4))
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        _collect(ws)

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert len(move_msgs) == 4


# ---------------------------------------------------------------------------
# 30-move buffered replay performance
# ---------------------------------------------------------------------------

def test_30_buffered_moves_replay_under_4_seconds(monkeypatch):
    """Replaying 30 pre-computed buffered moves must complete in < 4 s."""
    monkeypatch.setattr(
        "backend.app.routers.analysis.run_analysis", _make_mock_analysis(30)
    )
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback", _mock_llm
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        _collect(ws, max_msgs=40)

    start = time.monotonic()
    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws, max_msgs=40)
    elapsed = time.monotonic() - start

    move_msgs = [m for m in messages if "buffered" in m]
    assert len(move_msgs) == 30
    assert all(m["buffered"] for m in move_msgs)
    assert elapsed < 4.0, f"Buffered replay took {elapsed:.2f}s — expected < 4s"


# ---------------------------------------------------------------------------
# LLM error is handled gracefully
# ---------------------------------------------------------------------------

def test_llm_unavailable_error_falls_back_gracefully(monkeypatch):
    from backend.app.llm import LLMUnavailableError

    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", _make_mock_analysis(1))

    async def mock_llm_fails(prompt):
        raise LLMUnavailableError("all providers failed")

    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback",
        mock_llm_fails,
    )
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    # Should still receive move messages (empty comment is OK)
    assert len(move_msgs) >= 1
    assert move_msgs[0]["comment"] == ""
