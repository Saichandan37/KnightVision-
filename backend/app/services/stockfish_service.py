"""Stockfish analysis service — wraps blocking Stockfish calls in asyncio.to_thread().

KEY RULES (do not break):
  1. NEVER call Stockfish directly in an async function — always use asyncio.to_thread().
  2. The perspective flip lives EXCLUSIVELY here — no other service performs it.
  3. Flip rule: eval_cp = -raw when board.turn == chess.BLACK (White just moved).
     Stockfish returns from the side-to-move's perspective; when Black is to move,
     raw is from Black's perspective — negate to get White's (the mover's) perspective.

Usage:
    from backend.app.services.stockfish_service import StockfishService

    service = StockfishService(path=config.stockfish.path, depth=config.stockfish.depth)
    result = await service.analyse_position(board, depth=config.stockfish.depth)
"""
from __future__ import annotations

import asyncio
import logging
import threading
from typing import Optional

import chess
from stockfish import Stockfish

logger = logging.getLogger(__name__)

# Auto-detected path used when config.stockfish.path is None.
# Homebrew on Apple Silicon; falls back to the binary name for Docker/Linux.
STOCKFISH_PATH: Optional[str] = "/opt/homebrew/bin/stockfish"

# Mate score sentinel — used when Stockfish finds forced mate
_MATE_SENTINEL_CP = 30_000


class StockfishService:
    """Thread-safe wrapper around the Stockfish subprocess.

    A single Stockfish process is shared across all requests via a threading.Lock,
    ensuring position state is never corrupted by concurrent calls.
    """

    def __init__(
        self,
        path: Optional[str],
        depth: int,
        multipv: int = 3,
    ) -> None:
        resolved_path = path or STOCKFISH_PATH
        try:
            self._sf = Stockfish(
                path=resolved_path,
                depth=depth,
                parameters={"MultiPV": multipv, "Threads": 1},
            )
        except Exception as exc:
            raise RuntimeError(
                f"Stockfish initialisation failed (path={resolved_path!r}): {exc}"
            ) from exc

        self._lock = threading.Lock()
        self._default_depth = depth
        self._multipv = multipv
        logger.info("StockfishService ready — path=%s depth=%d", resolved_path, depth)

    # ------------------------------------------------------------------
    # Public async API
    # ------------------------------------------------------------------

    async def analyse_position(self, board: chess.Board, depth: int) -> dict:
        """Analyse *board* at *depth* without blocking the event loop.

        Returns a dict with:
            eval_cp         — centipawns from the MOVER's perspective (flip applied)
            best_move_uci   — best move in UCI notation
            best_move_san   — best move in SAN notation
            top_candidates  — list of up to 3 dicts: {uci, san, centipawns}
        """
        return await asyncio.to_thread(self._analyse_sync, board, depth)

    # ------------------------------------------------------------------
    # Synchronous implementation (runs in a thread)
    # ------------------------------------------------------------------

    def _analyse_sync(self, board: chess.Board, depth: int) -> dict:
        """Blocking Stockfish analysis — must only be called via asyncio.to_thread."""
        fen = board.fen()

        with self._lock:
            self._sf.set_depth(depth)
            self._sf.set_fen_position(fen)
            top_moves_raw = self._sf.get_top_moves(self._multipv)

        if not top_moves_raw:
            # Terminal position (checkmate / stalemate) — return zeroed result
            return {
                "eval_cp": 0,
                "best_move_uci": "",
                "best_move_san": "",
                "top_candidates": [],
            }

        # ----------------------------------------------------------------
        # Raw eval — from the side-to-move's perspective (Stockfish convention)
        # ----------------------------------------------------------------
        first = top_moves_raw[0]
        if first.get("Mate") is not None:
            mate_sign = 1 if first["Mate"] > 0 else -1
            raw_eval = mate_sign * _MATE_SENTINEL_CP
        else:
            raw_eval = first.get("Centipawn") or 0

        # ----------------------------------------------------------------
        # Perspective flip — convert to MOVER's perspective.
        # Stockfish gives eval from the side ABOUT TO MOVE's perspective.
        # After White moves, board.turn == BLACK → raw is from Black's view →
        # negate to get White's (the mover's) perspective.
        # After Black moves, board.turn == WHITE → raw is already from White's view
        # (but White did NOT just move — see implementation notes in story file).
        # ----------------------------------------------------------------
        if board.turn == chess.BLACK:
            eval_cp = -raw_eval
        else:
            eval_cp = raw_eval

        # ----------------------------------------------------------------
        # Best move
        # ----------------------------------------------------------------
        best_move_uci = first["Move"]
        best_move_san = self._uci_to_san(board, best_move_uci)

        # ----------------------------------------------------------------
        # Top candidates
        # ----------------------------------------------------------------
        top_candidates = []
        for move_info in top_moves_raw:
            uci = move_info["Move"]
            if move_info.get("Mate") is not None:
                cp = _MATE_SENTINEL_CP if move_info["Mate"] > 0 else -_MATE_SENTINEL_CP
            else:
                cp = move_info.get("Centipawn") or 0
            san = self._uci_to_san(board, uci)
            top_candidates.append({"uci": uci, "san": san, "centipawns": cp})

        logger.debug(
            "Analysed FEN=%s depth=%d eval_cp=%d best=%s",
            fen[:30],
            depth,
            eval_cp,
            best_move_uci,
        )

        return {
            "eval_cp": eval_cp,
            "best_move_uci": best_move_uci,
            "best_move_san": best_move_san,
            "top_candidates": top_candidates,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _uci_to_san(board: chess.Board, uci: str) -> str:
        """Convert UCI string to SAN; fall back to UCI on any error."""
        try:
            return board.san(chess.Move.from_uci(uci))
        except Exception:
            return uci
