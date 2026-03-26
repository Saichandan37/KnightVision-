"""Opening detection service — matches positions against the bundled ECO table.

The ECO JSON is loaded once at first call and the FEN index is cached for the
process lifetime.  Detection is position-based (FEN lookup) so transpositions
that reach the same position as a known ECO entry are correctly identified.

FEN normalisation strips the half-move clock and full-move counter (last two
fields) so minor counter differences never cause a missed match.

Usage:
    from backend.app.services.opening_service import detect_opening

    eco, name = detect_opening(board.fen())
    # → ("B90", "Sicilian Defense: Najdorf Variation")  or  (None, None)
"""
from __future__ import annotations

import io
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

import chess.pgn

logger = logging.getLogger(__name__)

_ECO_JSON_PATH = Path(__file__).parent.parent / "data" / "eco.json"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_fen(fen: str) -> str:
    """Return the first four FEN fields (drop half-move clock + full-move number).

    Two positions reached by different move sequences may differ only in their
    move counters; stripping them lets the lookup treat such positions as equal.
    """
    return " ".join(fen.split()[:4])


@lru_cache(maxsize=1)
def _build_index() -> dict[str, tuple[str, str]]:
    """Parse eco.json once and build a FEN → (eco_code, name) mapping.

    Any entry whose PGN cannot be parsed is silently skipped so a malformed
    row never crashes the service.
    """
    with open(_ECO_JSON_PATH, encoding="utf-8") as fh:
        entries: list[dict] = json.load(fh)

    index: dict[str, tuple[str, str]] = {}
    skipped = 0

    for entry in entries:
        try:
            game = chess.pgn.read_game(io.StringIO(entry["pgn"]))
            if game is None:
                skipped += 1
                continue
            board = game.board()
            for move in game.mainline_moves():
                board.push(move)
            fen = _normalize_fen(board.fen())
            index[fen] = (entry["eco"], entry["name"])
        except Exception:
            skipped += 1

    logger.debug(
        "ECO index built — %d entries loaded, %d skipped", len(index), skipped
    )
    return index


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_opening(
    board_fen_after_move_10: str,
) -> tuple[Optional[str], Optional[str]]:
    """Return (eco_code, opening_name) for the given FEN, or (None, None).

    Compares the normalised FEN against the pre-built ECO index.  Never raises
    — any internal error results in a graceful (None, None) return.

    Args:
        board_fen_after_move_10: FEN string of the game position at the point
            to check (typically after the first 10 half-moves, but any depth
            that coincides with an ECO entry's final position will match).

    Returns:
        Tuple of (eco_code, opening_name), or (None, None) if not found.
    """
    try:
        index = _build_index()
        normalised = _normalize_fen(board_fen_after_move_10)
        result = index.get(normalised)
        if result is not None:
            logger.debug("Opening detected: %s — %s", result[0], result[1])
            return result
        return None, None
    except Exception:
        logger.exception("detect_opening failed — returning (None, None)")
        return None, None
