"""Analysis orchestrator tests — AC gate + supporting coverage."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.config import get_default_config
from backend.app.models.api import AnalysisComplete, MoveCategory, MoveResult
from backend.app.services.analysis_orchestrator import run_analysis
from backend.app.store.memory_store import game_store


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# 5-ply PGN: e4 e5 Nf3 Nc6 Bb5 (Ruy Lopez opening, 5 half-moves)
_PGN_5_MOVES = """
[Event "Test"]
[White "W"]
[Black "B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *
""".strip()


def _make_mock_sf(eval_cp: int = 30) -> MagicMock:
    """Return a mock StockfishService that answers instantly."""
    sf = MagicMock()
    sf.analyse_position = AsyncMock(
        return_value={
            "eval_cp": eval_cp,
            "best_move_uci": "e2e4",
            "best_move_san": "e4",
            "top_candidates": [
                {"uci": "e2e4", "san": "e4", "centipawns": eval_cp}
            ],
        }
    )
    return sf


async def _setup_game(game_id: str, pgn: str) -> None:
    await game_store.create_game(game_id, pgn)


# ---------------------------------------------------------------------------
# AC Gate test — MUST pass before story is accepted
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ac_five_move_game_callback_count_and_indices():
    """AC: run_analysis() calls on_move_result exactly 5 times (move_index 0–4)
    and returns AnalysisComplete.total_moves == 5."""
    game_id = "ac-gate-5-moves"
    await _setup_game(game_id, _PGN_5_MOVES)

    collected: list[MoveResult] = []

    async def capture(move_result: MoveResult) -> None:
        collected.append(move_result)

    config = get_default_config()
    result = await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=capture,
        stockfish_service=_make_mock_sf(),
    )

    # Callback count
    assert len(collected) == 5, f"Expected 5 callbacks, got {len(collected)}"

    # Sequenced move_index values
    indices = [mr.move_index for mr in collected]
    assert indices == [0, 1, 2, 3, 4], f"move_index sequence wrong: {indices}"

    # AnalysisComplete
    assert isinstance(result, AnalysisComplete)
    assert result.total_moves == 5


# ---------------------------------------------------------------------------
# move_number derivation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_move_number_derivation():
    """move_number = (move_index // 2) + 1."""
    game_id = "move-number-test"
    await _setup_game(game_id, _PGN_5_MOVES)

    collected: list[MoveResult] = []

    async def capture(mr: MoveResult) -> None:
        collected.append(mr)

    config = get_default_config()
    await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=capture,
        stockfish_service=_make_mock_sf(),
    )

    # Ply 0,1 → move_number 1; ply 2,3 → 2; ply 4 → 3
    expected = [1, 1, 2, 2, 3]
    actual = [mr.move_number for mr in collected]
    assert actual == expected


# ---------------------------------------------------------------------------
# Store appends
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_moves_appended_to_store():
    game_id = "store-append-test"
    await _setup_game(game_id, _PGN_5_MOVES)

    config = get_default_config()
    await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=AsyncMock(),
        stockfish_service=_make_mock_sf(),
    )

    moves = await game_store.get_moves(game_id)
    assert len(moves) == 5


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_status_transitions_to_complete():
    game_id = "status-complete-test"
    await _setup_game(game_id, _PGN_5_MOVES)

    config = get_default_config()
    await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=AsyncMock(),
        stockfish_service=_make_mock_sf(),
    )

    status = await game_store.get_status(game_id)
    assert status == "complete"


@pytest.mark.asyncio
async def test_status_transitions_to_error_on_bad_pgn():
    game_id = "status-error-test"
    await _setup_game(game_id, "not a pgn")

    config = get_default_config()
    with pytest.raises(ValueError):
        await run_analysis(
            game_id=game_id,
            pgn="not a pgn",
            config=config,
            on_move_result=AsyncMock(),
            stockfish_service=_make_mock_sf(),
        )

    status = await game_store.get_status(game_id)
    assert status == "error"


# ---------------------------------------------------------------------------
# Accuracy formula
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_accuracy_formula():
    """max(0, 100 - avg_cp_loss) per side."""
    game_id = "accuracy-test"
    await _setup_game(game_id, _PGN_5_MOVES)

    # Mock returns eval_cp=0 always → cp_loss = max(0, 0 - 0) = 0 → accuracy 100
    config = get_default_config()
    result = await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=AsyncMock(),
        stockfish_service=_make_mock_sf(eval_cp=0),
    )

    assert result.white_accuracy == 100.0
    assert result.black_accuracy == 100.0


# ---------------------------------------------------------------------------
# cp_loss perspective correctness
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cp_loss_non_negative():
    """cp_loss must always be >= 0."""
    game_id = "cp-loss-nonneg"
    await _setup_game(game_id, _PGN_5_MOVES)

    config = get_default_config()
    collected: list[MoveResult] = []

    async def capture(mr: MoveResult) -> None:
        collected.append(mr)

    await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=capture,
        stockfish_service=_make_mock_sf(eval_cp=50),
    )

    for mr in collected:
        assert mr.cp_loss >= 0, f"Negative cp_loss at ply {mr.move_index}: {mr.cp_loss}"


# ---------------------------------------------------------------------------
# comment_source is "fallback" (no LLM in orchestrator)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_comment_source_is_fallback():
    game_id = "comment-source-test"
    await _setup_game(game_id, _PGN_5_MOVES)

    config = get_default_config()
    collected: list[MoveResult] = []

    async def capture(mr: MoveResult) -> None:
        collected.append(mr)

    await run_analysis(
        game_id=game_id,
        pgn=_PGN_5_MOVES,
        config=config,
        on_move_result=capture,
        stockfish_service=_make_mock_sf(),
    )

    for mr in collected:
        assert mr.comment_source == "fallback"
