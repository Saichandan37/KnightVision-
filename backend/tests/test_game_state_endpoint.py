"""GET /api/analysis/{game_id} supporting tests — shape, 404, partial, accuracy."""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.api import AnalysisComplete, GameMeta, MoveCategory, MoveResult
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


def _upload_game() -> str:
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    assert resp.status_code == 202
    return resp.json()["game_id"]


# ---------------------------------------------------------------------------
# 404 — unknown game
# ---------------------------------------------------------------------------

def test_unknown_game_id_returns_404():
    resp = client.get("/api/analysis/does-not-exist")
    assert resp.status_code == 404


def test_unknown_game_id_error_field():
    resp = client.get("/api/analysis/does-not-exist")
    assert "error" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Pending game
# ---------------------------------------------------------------------------

def test_pending_game_returns_200():
    game_id = _upload_game()
    resp = client.get(f"/api/analysis/{game_id}")
    assert resp.status_code == 200


def test_pending_game_status_is_pending():
    game_id = _upload_game()
    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["status"] == "pending"


def test_pending_game_has_empty_moves():
    game_id = _upload_game()
    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["moves"] == []


def test_pending_game_has_null_accuracy():
    game_id = _upload_game()
    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["white_accuracy"] is None
    assert data["black_accuracy"] is None


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_response_contains_all_required_keys():
    game_id = _upload_game()
    data = client.get(f"/api/analysis/{game_id}").json()
    required = {"game_id", "status", "meta", "moves", "white_accuracy", "black_accuracy"}
    assert required.issubset(data.keys())


def test_response_game_id_matches_request():
    game_id = _upload_game()
    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["game_id"] == game_id


# ---------------------------------------------------------------------------
# Partial (analysing) game
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analysing_game_returns_partial_moves():
    game_id = _upload_game()
    await game_store.set_status(game_id, "analysing")
    await game_store.append_move(game_id, _make_move_result(0))

    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["status"] == "analysing"
    assert len(data["moves"]) == 1


@pytest.mark.asyncio
async def test_analysing_game_has_null_accuracy():
    game_id = _upload_game()
    await game_store.set_status(game_id, "analysing")
    await game_store.append_move(game_id, _make_move_result(0))

    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["white_accuracy"] is None
    assert data["black_accuracy"] is None


# ---------------------------------------------------------------------------
# Complete game
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_complete_game_status():
    game_id = _upload_game()
    await game_store.append_move(game_id, _make_move_result(0))
    await game_store.set_status(game_id, "complete")
    await game_store.set_result(
        game_id,
        AnalysisComplete(white_accuracy=90.0, black_accuracy=85.0, total_moves=1),
    )

    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["status"] == "complete"


@pytest.mark.asyncio
async def test_complete_game_accuracy_values():
    game_id = _upload_game()
    await game_store.append_move(game_id, _make_move_result(0))
    await game_store.set_status(game_id, "complete")
    await game_store.set_result(
        game_id,
        AnalysisComplete(white_accuracy=92.5, black_accuracy=88.3, total_moves=1),
    )

    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["white_accuracy"] == pytest.approx(92.5)
    assert data["black_accuracy"] == pytest.approx(88.3)


@pytest.mark.asyncio
async def test_complete_game_moves_have_correct_shape():
    game_id = _upload_game()
    await game_store.append_move(game_id, _make_move_result(0))
    await game_store.set_status(game_id, "complete")
    await game_store.set_result(
        game_id,
        AnalysisComplete(white_accuracy=90.0, black_accuracy=85.0, total_moves=1),
    )

    data = client.get(f"/api/analysis/{game_id}").json()
    move = data["moves"][0]
    for field in ("move_index", "san", "uci", "category", "cp_loss", "comment"):
        assert field in move, f"missing field: {field}"


@pytest.mark.asyncio
async def test_complete_game_meta_populated_after_set():
    game_id = _upload_game()
    meta = GameMeta(
        white="Kasparov",
        black="Karpov",
        result="1-0",
        date="2024.01.01",
        white_elo=2851,
        black_elo=2780,
    )
    await game_store.set_meta(game_id, meta)
    await game_store.set_status(game_id, "complete")
    await game_store.set_result(
        game_id,
        AnalysisComplete(white_accuracy=90.0, black_accuracy=85.0, total_moves=0),
    )

    data = client.get(f"/api/analysis/{game_id}").json()
    assert data["meta"] is not None
    assert data["meta"]["white"] == "Kasparov"
    assert data["meta"]["black"] == "Karpov"
