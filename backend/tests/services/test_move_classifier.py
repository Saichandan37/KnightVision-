"""Move classifier gate tests — EXACTLY 3 tests as specified in story AC.

These are the mandatory acceptance criterion tests. All three must pass.
cp_loss is passed directly — no Stockfish involvement.
"""
from backend.app.services.move_classifier import classify_move
from backend.app.models.api import MoveCategory


def test_blunder_cp_loss_200():
    """cp_loss > 150 must classify as Blunder."""
    result = classify_move(cp_loss=200)
    assert result == MoveCategory.blunder


def test_best_cp_loss_0():
    """cp_loss = 0 (no sacrifice) must classify as Best."""
    result = classify_move(cp_loss=0)
    assert result == MoveCategory.best


def test_inaccuracy_cp_loss_35():
    """cp_loss 20–50 must classify as Inaccuracy."""
    result = classify_move(cp_loss=35)
    assert result == MoveCategory.inaccuracy
