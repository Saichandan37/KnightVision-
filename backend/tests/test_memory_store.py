"""Tests for MemoryGameStore — isolation, concurrency, and all CRUD methods.

The AC test is: two games, 3 moves each appended concurrently via asyncio.gather,
each game has exactly 3 moves, no cross-contamination.
"""
import asyncio
import pytest

from backend.app.models.api import (
    CandidateMove,
    GameMeta,
    MoveCategory,
    MoveResult,
)
from backend.app.store.memory_store import MemoryGameStore


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_move(index: int, san: str = "e4") -> MoveResult:
    return MoveResult(
        move_index=index,
        move_number=(index // 2) + 1,
        san=san,
        uci="e2e4",
        category=MoveCategory.best,
        cp_loss=0,
        eval_before_cp=20,
        eval_after_cp=20,
        best_move_uci="e2e4",
        best_move_san="e4",
        top_candidates=[CandidateMove(uci="e2e4", san="e4", centipawns=20)],
        comment="Best move.",
        comment_source="llm",
    )


def make_meta(white: str = "Alice") -> GameMeta:
    return GameMeta(white=white, black="Bob", result="*")


# ---------------------------------------------------------------------------
# Basic CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_game_sets_pending_status():
    store = MemoryGameStore()
    await store.create_game("g1", "1.e4 e5")
    assert await store.get_status("g1") == "pending"


@pytest.mark.asyncio
async def test_create_game_stores_pgn():
    store = MemoryGameStore()
    await store.create_game("g1", "1.e4 e5")
    assert await store.get_pgn("g1") == "1.e4 e5"


@pytest.mark.asyncio
async def test_get_moves_empty_on_creation():
    store = MemoryGameStore()
    await store.create_game("g1", "pgn")
    assert await store.get_moves("g1") == []


@pytest.mark.asyncio
async def test_append_move_increases_count():
    store = MemoryGameStore()
    await store.create_game("g1", "pgn")
    await store.append_move("g1", make_move(0))
    moves = await store.get_moves("g1")
    assert len(moves) == 1
    assert moves[0].move_index == 0


@pytest.mark.asyncio
async def test_set_and_get_status():
    store = MemoryGameStore()
    await store.create_game("g1", "pgn")
    await store.set_status("g1", "analysing")
    assert await store.get_status("g1") == "analysing"


@pytest.mark.asyncio
async def test_set_and_get_meta():
    store = MemoryGameStore()
    await store.create_game("g1", "pgn")
    meta = make_meta("Magnus")
    await store.set_meta("g1", meta)
    retrieved = await store.get_meta("g1")
    assert retrieved is not None
    assert retrieved.white == "Magnus"


@pytest.mark.asyncio
async def test_get_meta_returns_none_before_set():
    store = MemoryGameStore()
    await store.create_game("g1", "pgn")
    assert await store.get_meta("g1") is None


# ---------------------------------------------------------------------------
# AC: concurrent appends, two games, no cross-contamination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_appends_no_cross_contamination():
    """AC: two games, 3 moves each appended concurrently, exact counts, no mixing."""
    store = MemoryGameStore()
    await store.create_game("game_a", "pgn_a")
    await store.create_game("game_b", "pgn_b")

    async def append_moves(game_id: str, indices: list[int]):
        for i in indices:
            await store.append_move(game_id, make_move(i, san=f"m{i}"))

    await asyncio.gather(
        append_moves("game_a", [0, 1, 2]),
        append_moves("game_b", [0, 1, 2]),
    )

    moves_a = await store.get_moves("game_a")
    moves_b = await store.get_moves("game_b")

    # Each game has exactly 3 moves
    assert len(moves_a) == 3
    assert len(moves_b) == 3

    # No cross-contamination — both games have independent move lists
    indices_a = {m.move_index for m in moves_a}
    indices_b = {m.move_index for m in moves_b}
    assert indices_a == {0, 1, 2}
    assert indices_b == {0, 1, 2}

    # Verify the store singleton has the same result
    from backend.app.store.memory_store import game_store
    # The singleton is a separate instance from `store` — just verify it exists
    assert game_store is not None


# ---------------------------------------------------------------------------
# Unknown game_id raises KeyError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_status_unknown_raises():
    store = MemoryGameStore()
    with pytest.raises(KeyError):
        await store.get_status("nonexistent")


@pytest.mark.asyncio
async def test_get_moves_unknown_raises():
    store = MemoryGameStore()
    with pytest.raises(KeyError):
        await store.get_moves("nonexistent")
