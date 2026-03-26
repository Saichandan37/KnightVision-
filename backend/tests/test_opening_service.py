"""Opening service broader tests — known openings, edge cases, index behaviour."""
import chess

from backend.app.services.opening_service import detect_opening, _normalize_fen


def _fen_after_moves(*moves: str) -> str:
    board = chess.Board()
    for san in moves:
        board.push_san(san)
    return board.fen()


# ---------------------------------------------------------------------------
# Known opening positions
# ---------------------------------------------------------------------------

def test_ruy_lopez_detected():
    """1.e4 e5 2.Nf3 Nc6 3.Bb5 → Ruy Lopez (C60)."""
    fen = _fen_after_moves("e4", "e5", "Nf3", "Nc6", "Bb5")
    eco, name = detect_opening(fen)
    assert eco == "C60"
    assert "Ruy Lopez" in name


def test_queens_gambit_detected():
    """1.d4 d5 2.c4 → Queen's Gambit (D06)."""
    fen = _fen_after_moves("d4", "d5", "c4")
    eco, name = detect_opening(fen)
    assert eco == "D06"
    assert "Queen" in name


def test_french_defense_detected():
    """1.e4 e6 → French Defense (C00)."""
    fen = _fen_after_moves("e4", "e6")
    eco, name = detect_opening(fen)
    assert eco == "C00"
    assert "French" in name


def test_nimzo_indian_detected():
    """1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 → Nimzo-Indian (E20)."""
    fen = _fen_after_moves("d4", "Nf6", "c4", "e6", "Nc3", "Bb4")
    eco, name = detect_opening(fen)
    assert eco == "E20"
    assert "Nimzo" in name


def test_kings_indian_detected():
    """1.d4 Nf6 2.c4 g6 → King's Indian (E60)."""
    fen = _fen_after_moves("d4", "Nf6", "c4", "g6")
    eco, name = detect_opening(fen)
    assert eco == "E60"
    assert "King" in name


def test_sicilian_dragon_detected():
    """1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 → Sicilian Dragon (B70)."""
    fen = _fen_after_moves("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6")
    eco, name = detect_opening(fen)
    assert eco is not None
    assert eco.startswith("B7")
    assert "Dragon" in name


def test_caro_kann_detected():
    """1.e4 c6 → Caro-Kann (B10)."""
    fen = _fen_after_moves("e4", "c6")
    eco, name = detect_opening(fen)
    assert eco == "B10"
    assert "Caro" in name


def test_english_opening_detected():
    """1.c4 → English Opening (A10)."""
    fen = _fen_after_moves("c4")
    eco, name = detect_opening(fen)
    assert eco == "A10"
    assert "English" in name


def test_grunfeld_exchange_detected():
    """1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 → Grünfeld Exchange (D85)."""
    fen = _fen_after_moves("d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3", "bxc3", "Bg7")
    eco, name = detect_opening(fen)
    assert eco is not None
    assert eco.startswith("D8")
    assert "Grunfeld" in name or "Grünfeld" in name or "Exchange" in name


# ---------------------------------------------------------------------------
# No-match cases
# ---------------------------------------------------------------------------

def test_starting_position_returns_none():
    """The starting position itself is not in the ECO table."""
    fen = chess.Board().fen()
    eco, name = detect_opening(fen)
    # Starting position is not an ECO entry (no moves played)
    assert eco is None
    assert name is None


def test_completely_invalid_fen_returns_none():
    """Garbage FEN does not raise — returns (None, None)."""
    result = detect_opening("not a fen at all")
    assert result == (None, None)


def test_empty_string_returns_none():
    """Empty string does not raise."""
    result = detect_opening("")
    assert result == (None, None)


# ---------------------------------------------------------------------------
# FEN normalisation
# ---------------------------------------------------------------------------

def test_normalize_fen_strips_move_counters():
    full_fen = "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6"
    normalised = _normalize_fen(full_fen)
    assert normalised == "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -"


def test_normalize_fen_same_position_different_counters():
    """Two FENs that differ only in move counters should normalise to the same value."""
    fen_a = "rnbqkb1r/pp2pppp/3p1n2/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3"
    fen_b = "rnbqkb1r/pp2pppp/3p1n2/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 4"
    assert _normalize_fen(fen_a) == _normalize_fen(fen_b)


# ---------------------------------------------------------------------------
# Idempotency — call twice, same result (lru_cache stays warm)
# ---------------------------------------------------------------------------

def test_detect_opening_idempotent():
    fen = _fen_after_moves("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6")
    first = detect_opening(fen)
    second = detect_opening(fen)
    assert first == second
