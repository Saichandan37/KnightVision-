"""PGN parser — validates PGN text and extracts GameMeta + board positions.

Usage:
    from backend.app.services.pgn_parser import parse_pgn

    meta, boards = parse_pgn(pgn_text)
    # boards[0] = position after ply 1 (first half-move)
"""
from __future__ import annotations

import io
import logging
from typing import Optional

import chess
import chess.pgn

from ..models.api import GameMeta

logger = logging.getLogger(__name__)


def _parse_elo(value: Optional[str]) -> Optional[int]:
    """Convert a PGN Elo header value to int, or None if absent/non-numeric."""
    if not value or value == "?":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_pgn(pgn_text: str) -> tuple[GameMeta, list[chess.Board]]:
    """Parse *pgn_text* and return (GameMeta, list[chess.Board]).

    The board list contains one snapshot per half-move (ply), starting AFTER
    the first move. boards[0] = position after ply 1, boards[N-1] = final position.

    Args:
        pgn_text: Raw PGN string (single or multi-game; only the first is parsed).

    Returns:
        Tuple of (GameMeta, list[chess.Board]).

    Raises:
        ValueError: If the PGN is invalid or contains zero moves.
    """
    if not pgn_text or not pgn_text.strip():
        raise ValueError("PGN text is empty")

    stream = io.StringIO(pgn_text)
    game = chess.pgn.read_game(stream)

    if game is None:
        raise ValueError("Could not parse PGN — no valid game found")

    # Collect boards by replaying all moves
    boards: list[chess.Board] = []
    board = game.board()
    for move in game.mainline_moves():
        board.push(move)
        boards.append(board.copy())

    if not boards:
        raise ValueError("PGN contains no moves")

    headers = game.headers

    meta = GameMeta(
        white=headers.get("White", "Unknown"),
        black=headers.get("Black", "Unknown"),
        white_elo=_parse_elo(headers.get("WhiteElo")),
        black_elo=_parse_elo(headers.get("BlackElo")),
        result=headers.get("Result", "*"),
        date=headers.get("Date") or None,
        opening_eco=headers.get("ECO") or None,
        opening_name=headers.get("Opening") or None,
    )

    logger.debug(
        "Parsed PGN: %s vs %s, %d plies",
        meta.white,
        meta.black,
        len(boards),
    )

    return meta, boards
