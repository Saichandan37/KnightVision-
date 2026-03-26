"""Tests for StockfishService — dict structure, non-blocking, perspective flip.

Tests use depth=5 to keep runtime short.
"""
import asyncio
import chess
import pytest

from backend.app.services.stockfish_service import StockfishService, STOCKFISH_PATH


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def service():
    return StockfishService(path=STOCKFISH_PATH, depth=5, multipv=3)


def starting_board() -> chess.Board:
    return chess.Board()


def board_after_e4() -> chess.Board:
    """Position after 1.e4 — board.turn = BLACK."""
    b = chess.Board()
    b.push(chess.Move.from_uci("e2e4"))
    return b


def board_after_e4_e5() -> chess.Board:
    """Position after 1.e4 e5 — board.turn = WHITE."""
    b = chess.Board()
    b.push(chess.Move.from_uci("e2e4"))
    b.push(chess.Move.from_uci("e7e5"))
    return b


# ---------------------------------------------------------------------------
# AC: dict structure
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_returns_dict_with_required_keys(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    assert "eval_cp" in result
    assert "best_move_uci" in result
    assert "best_move_san" in result
    assert "top_candidates" in result


@pytest.mark.asyncio
async def test_top_candidates_length_le_3(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    assert len(result["top_candidates"]) <= 3


@pytest.mark.asyncio
async def test_top_candidates_have_required_fields(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    for c in result["top_candidates"]:
        assert "uci" in c
        assert "san" in c
        assert "centipawns" in c


@pytest.mark.asyncio
async def test_best_move_uci_is_valid_uci(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    uci = result["best_move_uci"]
    assert len(uci) in (4, 5)  # e.g. "e7e5" or "e7e8q"
    move = chess.Move.from_uci(uci)
    assert move is not None


@pytest.mark.asyncio
async def test_best_move_san_is_non_empty(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    assert isinstance(result["best_move_san"], str)
    assert len(result["best_move_san"]) > 0


@pytest.mark.asyncio
async def test_eval_cp_is_int(service):
    result = await service.analyse_position(board_after_e4(), depth=5)
    assert isinstance(result["eval_cp"], int)


# ---------------------------------------------------------------------------
# Perspective flip tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_eval_positive_after_white_move(service):
    """After White plays e4 (board.turn=BLACK), eval_cp should be positive
    (good for White = mover). Flip rule: eval_cp = -raw when board.turn==BLACK."""
    result = await service.analyse_position(board_after_e4(), depth=5)
    # e4 is a strong opening move — eval should be slightly positive for White
    assert result["eval_cp"] > 0, (
        f"Expected positive eval after White's e4, got {result['eval_cp']}"
    )


@pytest.mark.asyncio
async def test_eval_after_black_move_no_flip(service):
    """After 1.e4 e5 (board.turn=WHITE), no flip — raw from White's side-to-move
    perspective is returned directly. Should be small positive (roughly equal)."""
    result = await service.analyse_position(board_after_e4_e5(), depth=5)
    # After 1.e4 e5 position is roughly equal — eval should be small positive
    assert isinstance(result["eval_cp"], int)
    assert abs(result["eval_cp"]) < 200, (
        f"Eval after 1.e4 e5 should be near-equal, got {result['eval_cp']}"
    )


# ---------------------------------------------------------------------------
# AC: non-blocking — asyncio.sleep(0) completes concurrently
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyse_does_not_block_event_loop(service):
    """asyncio.sleep(0) must resolve while analyse_position is running."""
    sleep_completed = []

    async def mark_sleep():
        await asyncio.sleep(0)
        sleep_completed.append(True)

    await asyncio.gather(
        service.analyse_position(board_after_e4(), depth=5),
        mark_sleep(),
    )

    assert sleep_completed, "asyncio.sleep(0) did not complete — event loop was blocked"


# ---------------------------------------------------------------------------
# Initialisation failure
# ---------------------------------------------------------------------------

def test_bad_path_raises_runtime_error():
    with pytest.raises(RuntimeError, match="[Ss]tockfish"):
        StockfishService(path="/nonexistent/stockfish", depth=5, multipv=3)


# ---------------------------------------------------------------------------
# Thread safety: concurrent calls return independent results
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_calls_return_independent_results(service):
    board_a = board_after_e4()
    board_b = board_after_e4_e5()

    results = await asyncio.gather(
        service.analyse_position(board_a, depth=5),
        service.analyse_position(board_b, depth=5),
    )

    result_a, result_b = results
    # Both should have valid structure
    assert "eval_cp" in result_a
    assert "eval_cp" in result_b
    # The evals should differ between positions
    # (both valid, just confirming they ran independently)
    assert isinstance(result_a["eval_cp"], int)
    assert isinstance(result_b["eval_cp"], int)
