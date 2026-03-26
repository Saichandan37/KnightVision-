"""Tests for shared Pydantic models — structure, defaults, AC validation."""
import pytest
from backend.app.models.api import (
    MoveCategory,
    CandidateMove,
    MoveResult,
    WSMoveResult,
    WSHeartbeat,
    WSError,
    AnalysisComplete,
    GameMeta,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_move_result_dict() -> dict:
    return dict(
        move_index=0,
        move_number=1,
        san="e4",
        uci="e2e4",
        category=MoveCategory.best,
        cp_loss=0,
        eval_before_cp=20,
        eval_after_cp=20,
        best_move_uci="e2e4",
        best_move_san="e4",
        top_candidates=[
            CandidateMove(uci="e2e4", san="e4", centipawns=20),
        ],
        comment="The engine's top choice.",
        comment_source="llm",
    )


# ---------------------------------------------------------------------------
# MoveCategory
# ---------------------------------------------------------------------------

def test_move_category_values():
    assert set(MoveCategory) == {
        MoveCategory.brilliant,
        MoveCategory.great,
        MoveCategory.best,
        MoveCategory.good,
        MoveCategory.inaccuracy,
        MoveCategory.mistake,
        MoveCategory.blunder,
    }


def test_move_category_is_str():
    assert isinstance(MoveCategory.blunder, str)
    assert MoveCategory.blunder == "blunder"


# ---------------------------------------------------------------------------
# CandidateMove
# ---------------------------------------------------------------------------

def test_candidate_move_fields():
    c = CandidateMove(uci="d2d4", san="d4", centipawns=15)
    assert c.uci == "d2d4"
    assert c.san == "d4"
    assert c.centipawns == 15


# ---------------------------------------------------------------------------
# MoveResult
# ---------------------------------------------------------------------------

def test_move_result_construction():
    m = MoveResult(**make_move_result_dict())
    assert m.move_index == 0
    assert m.category == MoveCategory.best
    assert m.comment_source == "llm"


def test_move_result_comment_source_fallback():
    d = make_move_result_dict()
    d["comment_source"] = "fallback"
    m = MoveResult(**d)
    assert m.comment_source == "fallback"


def test_move_result_comment_source_invalid():
    d = make_move_result_dict()
    d["comment_source"] = "openai"  # not allowed
    with pytest.raises(Exception):
        MoveResult(**d)


# ---------------------------------------------------------------------------
# WSMoveResult — AC: buffered=True via **dict unpacking
# ---------------------------------------------------------------------------

def test_ws_move_result_default_buffered_false():
    ws = WSMoveResult(**make_move_result_dict())
    assert ws.buffered is False


def test_ws_move_result_buffered_true_via_kwarg():
    """AC: WSMoveResult(buffered=True, **move_result_dict) sets buffered=True."""
    ws = WSMoveResult(buffered=True, **make_move_result_dict())
    assert ws.buffered is True


def test_ws_move_result_inherits_move_result_fields():
    ws = WSMoveResult(buffered=False, **make_move_result_dict())
    assert ws.san == "e4"
    assert ws.category == MoveCategory.best


# ---------------------------------------------------------------------------
# WebSocket message types
# ---------------------------------------------------------------------------

def test_ws_heartbeat_defaults():
    hb = WSHeartbeat(timestamp=1234567890.0)
    assert hb.type == "heartbeat"
    assert hb.timestamp == 1234567890.0


def test_ws_error_fields():
    err = WSError(message="something went wrong")
    assert err.type == "error"
    assert err.message == "something went wrong"


def test_analysis_complete_fields():
    ac = AnalysisComplete(white_accuracy=85.5, black_accuracy=72.3, total_moves=54)
    assert ac.type == "analysis_complete"
    assert ac.white_accuracy == 85.5
    assert ac.total_moves == 54


# ---------------------------------------------------------------------------
# GameMeta — optional fields
# ---------------------------------------------------------------------------

def test_game_meta_required_fields():
    gm = GameMeta(white="Magnus", black="Hikaru", result="1-0")
    assert gm.white == "Magnus"
    assert gm.white_elo is None
    assert gm.opening_eco is None


def test_game_meta_all_fields():
    gm = GameMeta(
        white="Magnus",
        black="Hikaru",
        white_elo=2852,
        black_elo=2800,
        result="1-0",
        date="2024.01.15",
        opening_eco="B90",
        opening_name="Sicilian: Najdorf",
    )
    assert gm.white_elo == 2852
    assert gm.opening_eco == "B90"


# ---------------------------------------------------------------------------
# __init__.py re-exports
# ---------------------------------------------------------------------------

def test_models_init_re_exports():
    from backend.app.models import (
        MoveCategory, MoveResult, WSMoveResult,
        WSHeartbeat, WSError, AnalysisComplete, GameMeta,
    )
    assert MoveResult is not None
