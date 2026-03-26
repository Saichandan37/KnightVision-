"""WebSocket handler AC gate tests.

AC: When a move_result message arrives with buffered=true, the frontend appends
    without board animation. When buffered=false (live), normal animation applies.
    Replaying 30 pre-computed moves must complete instantly (< 4 s).
"""
from __future__ import annotations

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


def _collect_ws_messages(ws, max_messages: int = 50) -> List[dict]:
    """Collect messages until analysis_complete or the socket closes."""
    msgs = []
    try:
        for _ in range(max_messages):
            msg = ws.receive_json()
            msgs.append(msg)
            if msg.get("type") == "analysis_complete":
                break
    except Exception:
        pass
    return msgs


# ---------------------------------------------------------------------------
# AC gate test 1 — live stream sends buffered=false
# ---------------------------------------------------------------------------

def test_ac_live_stream_moves_have_buffered_false(monkeypatch):
    """Fresh-game WS connection: live moves arrive with buffered=False."""

    async def mock_run_analysis(game_id, pgn, config, on_move_result, **kw):
        await game_store.set_status(game_id, "analysing")
        mr = _make_move_result(0)
        await on_move_result(mr)
        await game_store.append_move(game_id, mr)
        await game_store.set_status(game_id, "complete")
        return AnalysisComplete(white_accuracy=90.0, black_accuracy=80.0, total_moves=1)

    async def mock_llm(prompt):
        return ("test comment", "fallback")

    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", mock_run_analysis)
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback",
        mock_llm,
    )

    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    assert resp.status_code == 202
    game_id = resp.json()["game_id"]

    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect_ws_messages(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert len(move_msgs) >= 1, "Expected at least one move_result message"
    assert all(
        m["buffered"] is False for m in move_msgs
    ), "All live messages must have buffered=false"


# ---------------------------------------------------------------------------
# AC gate test 2 — late join replays buffered=true moves
# ---------------------------------------------------------------------------

def test_ac_late_join_moves_have_buffered_true(monkeypatch):
    """Late join to a completed game: all replayed moves have buffered=True."""

    async def mock_run_analysis(game_id, pgn, config, on_move_result, **kw):
        await game_store.set_status(game_id, "analysing")
        for i in range(3):
            mr = _make_move_result(i)
            await on_move_result(mr)
            await game_store.append_move(game_id, mr)
        await game_store.set_status(game_id, "complete")
        return AnalysisComplete(white_accuracy=90.0, black_accuracy=80.0, total_moves=3)

    async def mock_llm(prompt):
        return ("test comment", "fallback")

    monkeypatch.setattr("backend.app.routers.analysis.run_analysis", mock_run_analysis)
    monkeypatch.setattr(
        "backend.app.routers.analysis.provider_registry.generate_with_fallback",
        mock_llm,
    )

    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]

    # First connection: triggers and completes analysis
    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        _collect_ws_messages(ws)

    # Late join: game is now "complete"
    with client.websocket_connect(f"/ws/analysis/{game_id}") as ws:
        messages = _collect_ws_messages(ws)

    move_msgs = [m for m in messages if "buffered" in m]
    assert len(move_msgs) == 3, f"Expected 3 replayed moves, got {len(move_msgs)}"
    assert all(
        m["buffered"] is True for m in move_msgs
    ), "All replayed moves must have buffered=true"
