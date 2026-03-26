"""Game state endpoint AC gate tests.

AC: After a complete analysis, GET /api/analysis/{game_id} returns HTTP 200
    with status="complete", a non-empty moves array, and non-null
    white_accuracy and black_accuracy values.
"""
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.api import AnalysisComplete, MoveCategory, MoveResult
from backend.app.store.memory_store import game_store

client = TestClient(app)

_VALID_PGN = """[Event "Test"][White "W"][Black "B"][Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *"""


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


import pytest


@pytest.mark.asyncio
async def test_ac_complete_game_returns_200_with_moves_and_accuracy():
    """AC gate: complete game returns 200, non-empty moves, non-null accuracy."""
    # Upload a game
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    assert resp.status_code == 202
    game_id = resp.json()["game_id"]

    # Manually populate as if analysis finished
    mr = _make_move_result(0)
    await game_store.append_move(game_id, mr)
    await game_store.set_status(game_id, "complete")
    await game_store.set_result(
        game_id,
        AnalysisComplete(white_accuracy=92.5, black_accuracy=88.0, total_moves=1),
    )

    resp = client.get(f"/api/analysis/{game_id}")
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "complete"
    assert len(data["moves"]) > 0, "moves array must be non-empty"
    assert data["white_accuracy"] is not None, "white_accuracy must not be null"
    assert data["black_accuracy"] is not None, "black_accuracy must not be null"
