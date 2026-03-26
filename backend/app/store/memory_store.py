"""In-memory game store — per-game state, thread-safe via asyncio.Lock.

All state is lost on server restart. No persistence in Phase 1.

Usage:
    from backend.app.store.memory_store import game_store
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Dict, List, Optional

from ..models.api import GameMeta, MoveResult

if TYPE_CHECKING:
    from ..models.api import AnalysisComplete


# ---------------------------------------------------------------------------
# Internal game record
# ---------------------------------------------------------------------------

@dataclass
class _GameRecord:
    pgn: str
    status: str = "pending"
    moves: List[MoveResult] = field(default_factory=list)
    meta: Optional[GameMeta] = None
    analysis_result: Optional["AnalysisComplete"] = None
    subscribers: list = field(default_factory=list)  # list[asyncio.Queue]
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

class MemoryGameStore:
    """Thread-safe in-memory store keyed by game_id (UUID string)."""

    def __init__(self) -> None:
        self._games: Dict[str, _GameRecord] = {}
        self._registry_lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Game lifecycle
    # ------------------------------------------------------------------

    async def create_game(self, game_id: str, pgn: str) -> None:
        """Register a new game in pending state."""
        async with self._registry_lock:
            self._games[game_id] = _GameRecord(pgn=pgn)

    def _get_record(self, game_id: str) -> _GameRecord:
        try:
            return self._games[game_id]
        except KeyError:
            raise KeyError(f"Game '{game_id}' not found in store")

    # ------------------------------------------------------------------
    # Moves
    # ------------------------------------------------------------------

    async def append_move(self, game_id: str, move: MoveResult) -> None:
        record = self._get_record(game_id)
        async with record.lock:
            record.moves.append(move)

    async def get_moves(self, game_id: str) -> List[MoveResult]:
        record = self._get_record(game_id)
        async with record.lock:
            return list(record.moves)

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    async def set_status(self, game_id: str, status: str) -> None:
        record = self._get_record(game_id)
        async with record.lock:
            record.status = status

    async def get_status(self, game_id: str) -> str:
        record = self._get_record(game_id)
        return record.status

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    async def set_meta(self, game_id: str, meta: GameMeta) -> None:
        record = self._get_record(game_id)
        async with record.lock:
            record.meta = meta

    async def get_meta(self, game_id: str) -> Optional[GameMeta]:
        record = self._get_record(game_id)
        return record.meta

    # ------------------------------------------------------------------
    # PGN
    # ------------------------------------------------------------------

    async def get_pgn(self, game_id: str) -> str:
        record = self._get_record(game_id)
        return record.pgn

    # ------------------------------------------------------------------
    # Analysis result (final AnalysisComplete from the orchestrator)
    # ------------------------------------------------------------------

    async def set_result(self, game_id: str, result: "AnalysisComplete") -> None:
        record = self._get_record(game_id)
        async with record.lock:
            record.analysis_result = result

    async def get_result(self, game_id: str) -> Optional["AnalysisComplete"]:
        record = self._get_record(game_id)
        return record.analysis_result

    # ------------------------------------------------------------------
    # Pub-sub — WebSocket subscribers per game
    # ------------------------------------------------------------------

    async def subscribe(self, game_id: str) -> asyncio.Queue:
        """Register a new subscriber queue for live move broadcasts."""
        record = self._get_record(game_id)
        q: asyncio.Queue = asyncio.Queue()
        async with record.lock:
            record.subscribers.append(q)
        return q

    async def unsubscribe(self, game_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber queue (called on WS disconnect / cleanup)."""
        try:
            record = self._get_record(game_id)
            async with record.lock:
                try:
                    record.subscribers.remove(queue)
                except ValueError:
                    pass
        except KeyError:
            pass

    async def broadcast(self, game_id: str, item: object) -> None:
        """Put *item* into every registered subscriber queue.

        item=None is the sentinel signalling analysis completion.
        """
        try:
            record = self._get_record(game_id)
            async with record.lock:
                subs = list(record.subscribers)
        except KeyError:
            return
        for q in subs:
            await q.put(item)


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere
# ---------------------------------------------------------------------------

game_store = MemoryGameStore()
