"""Opening service AC gate tests — EXACTLY 2 tests as specified in story AC.

AC: Given the Sicilian Najdorf after 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6,
detect_opening() returns an ECO code starting with 'B9' and a name containing 'Sicilian'.
Given a random non-standard position, it returns (None, None) without raising.
"""
import chess

from backend.app.services.opening_service import detect_opening


def _fen_after_moves(*moves: str) -> str:
    """Replay SAN move list from the starting position and return the FEN."""
    board = chess.Board()
    for san in moves:
        board.push_san(san)
    return board.fen()


def test_ac_sicilian_najdorf_detection():
    """AC: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 → ECO starts with 'B9', name contains 'Sicilian'."""
    fen = _fen_after_moves("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6")
    eco, name = detect_opening(fen)

    assert eco is not None, "Expected an ECO code but got None"
    assert name is not None, "Expected an opening name but got None"
    assert eco.startswith("B9"), f"Expected ECO starting with 'B9', got '{eco}'"
    assert "Sicilian" in name, f"Expected 'Sicilian' in name, got '{name}'"


def test_ac_no_match_returns_none_without_raising():
    """AC: A non-standard position returns (None, None) and does not raise."""
    # FEN of a position unlikely to appear in any ECO entry
    weird_fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 100 99"
    result = detect_opening(weird_fen)
    assert result == (None, None), f"Expected (None, None) but got {result}"
