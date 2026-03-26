"""Tests for PGN parser service."""
import chess
import pytest

from backend.app.services.pgn_parser import parse_pgn
from backend.app.models.api import GameMeta

# ---------------------------------------------------------------------------
# Fixtures — real PGN strings
# ---------------------------------------------------------------------------

# 10-move game (20 plies) — Scholar's Mate attempt + continuation
PGN_10_MOVES = """\
[Event "Test"]
[White "Alice"]
[Black "Bob"]
[WhiteElo "1200"]
[BlackElo "1100"]
[Result "1-0"]
[Date "2024.01.15"]
[ECO "C20"]
[Opening "King's Pawn Game"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0
"""

# Minimal valid 1-move game
PGN_1_MOVE = """\
[White "A"]
[Black "B"]
[Result "*"]

1. e4 *
"""

# Multi-game PGN — parser must take only the first
PGN_MULTI = """\
[White "A"]
[Black "B"]
[Result "*"]

1. e4 *

[White "C"]
[Black "D"]
[Result "*"]

1. d4 *
"""

# Sicilian — 10 real plies
PGN_SICILIAN = """\
[White "Magnus"]
[Black "Hikaru"]
[WhiteElo "2852"]
[BlackElo "2800"]
[Result "1/2-1/2"]
[Date "2024.03.01"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1/2-1/2
"""


# ---------------------------------------------------------------------------
# AC: 10-move game → (GameMeta with white populated, list of 10 boards)
# ---------------------------------------------------------------------------

def test_parse_pgn_10_moves_board_count():
    meta, boards = parse_pgn(PGN_10_MOVES)
    # Scholar's Mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7# = 7 half-moves
    # The fixture above ends on move 4 = 7 plies
    assert len(boards) == 7


def test_parse_pgn_sicilian_10_plies():
    """10 half-moves → list of exactly 10 boards."""
    meta, boards = parse_pgn(PGN_SICILIAN)
    assert len(boards) == 10


def test_parse_pgn_meta_white_populated():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.white == "Magnus"


def test_parse_pgn_meta_black_populated():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.black == "Hikaru"


def test_parse_pgn_meta_elo_parsed():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.white_elo == 2852
    assert meta.black_elo == 2800


def test_parse_pgn_meta_result():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.result == "1/2-1/2"


def test_parse_pgn_meta_date():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.date == "2024.03.01"


def test_parse_pgn_eco_and_opening_parsed():
    meta, _ = parse_pgn(PGN_10_MOVES)
    assert meta.opening_eco == "C20"
    assert meta.opening_name == "King's Pawn Game"


def test_parse_pgn_eco_none_when_absent():
    meta, _ = parse_pgn(PGN_SICILIAN)
    assert meta.opening_eco is None
    assert meta.opening_name is None


# ---------------------------------------------------------------------------
# Board snapshots
# ---------------------------------------------------------------------------

def test_boards_are_chess_board_instances():
    _, boards = parse_pgn(PGN_SICILIAN)
    for b in boards:
        assert isinstance(b, chess.Board)


def test_board_index_0_is_after_first_move():
    """boards[0] should be the position after 1.e4 — e4 pawn on e4."""
    _, boards = parse_pgn(PGN_SICILIAN)
    board = boards[0]
    # After 1.e4: pawn on e4
    assert board.piece_at(chess.E4) is not None
    assert board.piece_at(chess.E4).piece_type == chess.PAWN


def test_board_index_1_is_after_second_ply():
    """boards[1] = position after 1...c5 — Black pawn on c5."""
    _, boards = parse_pgn(PGN_SICILIAN)
    board = boards[1]
    assert board.piece_at(chess.C5) is not None
    assert board.piece_at(chess.C5).piece_type == chess.PAWN


# ---------------------------------------------------------------------------
# Single-game: multi-game PGN takes only first
# ---------------------------------------------------------------------------

def test_multi_game_pgn_uses_first_game():
    meta, boards = parse_pgn(PGN_MULTI)
    assert meta.white == "A"
    assert len(boards) == 1  # only 1.e4


# ---------------------------------------------------------------------------
# AC: invalid PGN raises ValueError
# ---------------------------------------------------------------------------

def test_invalid_pgn_raises_value_error():
    with pytest.raises(ValueError):
        parse_pgn("this is not a pgn")


def test_empty_string_raises_value_error():
    with pytest.raises(ValueError):
        parse_pgn("")


def test_headers_only_no_moves_raises_value_error():
    pgn = "[White \"A\"]\n[Black \"B\"]\n[Result \"*\"]\n\n"
    with pytest.raises(ValueError):
        parse_pgn(pgn)


# ---------------------------------------------------------------------------
# Optional Elo — non-numeric or absent
# ---------------------------------------------------------------------------

def test_missing_elo_returns_none():
    pgn = "[White \"A\"]\n[Black \"B\"]\n[Result \"*\"]\n\n1. e4 *\n"
    meta, _ = parse_pgn(pgn)
    assert meta.white_elo is None
    assert meta.black_elo is None


def test_non_numeric_elo_returns_none():
    pgn = '[White "A"]\n[Black "B"]\n[WhiteElo "?"]\n[Result "*"]\n\n1. e4 *\n'
    meta, _ = parse_pgn(pgn)
    assert meta.white_elo is None
