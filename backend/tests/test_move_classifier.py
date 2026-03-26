"""Broader move classifier tests — boundary values, all categories, custom thresholds."""
import pytest
from backend.app.services.move_classifier import classify_move, ClassificationThresholds
from backend.app.models.api import MoveCategory


# ---------------------------------------------------------------------------
# All category boundaries with default thresholds
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("cp_loss,expected", [
    (0,   MoveCategory.best),       # exactly 0, no sacrifice
    (1,   MoveCategory.great),      # just above 0
    (5,   MoveCategory.great),      # at great_max boundary
    (6,   MoveCategory.good),       # just above great_max
    (20,  MoveCategory.good),       # at good_max boundary
    (21,  MoveCategory.inaccuracy), # just above good_max
    (50,  MoveCategory.inaccuracy), # at inaccuracy_max boundary
    (51,  MoveCategory.mistake),    # just above inaccuracy_max
    (150, MoveCategory.mistake),    # at mistake_max boundary
    (151, MoveCategory.blunder),    # just above mistake_max
    (200, MoveCategory.blunder),    # clearly a blunder
    (500, MoveCategory.blunder),    # large blunder
])
def test_classify_move_boundaries(cp_loss, expected):
    assert classify_move(cp_loss) == expected


# ---------------------------------------------------------------------------
# Brilliant (sacrifice stub — always False in Phase 1)
# ---------------------------------------------------------------------------

def test_brilliant_requires_is_sacrifice_true():
    """cp_loss=0 + sacrifice=True → brilliant."""
    assert classify_move(cp_loss=0, is_sacrifice=True) == MoveCategory.brilliant


def test_no_brilliant_without_sacrifice():
    """cp_loss=0 + sacrifice=False (default) → best, not brilliant."""
    assert classify_move(cp_loss=0, is_sacrifice=False) == MoveCategory.best


# ---------------------------------------------------------------------------
# Custom thresholds
# ---------------------------------------------------------------------------

def test_custom_thresholds_tighter_mistake():
    tight = ClassificationThresholds(
        great_max_cp_loss=3,
        good_max_cp_loss=15,
        inaccuracy_max_cp_loss=40,
        mistake_max_cp_loss=100,
    )
    assert classify_move(cp_loss=101, thresholds=tight) == MoveCategory.blunder
    assert classify_move(cp_loss=100, thresholds=tight) == MoveCategory.mistake
    assert classify_move(cp_loss=41,  thresholds=tight) == MoveCategory.mistake
    assert classify_move(cp_loss=40,  thresholds=tight) == MoveCategory.inaccuracy


def test_custom_thresholds_great_boundary():
    t = ClassificationThresholds(great_max_cp_loss=10)
    assert classify_move(cp_loss=10, thresholds=t) == MoveCategory.great
    assert classify_move(cp_loss=11, thresholds=t) == MoveCategory.good


# ---------------------------------------------------------------------------
# cp_loss is always >= 0 (classifier should handle 0 without error)
# ---------------------------------------------------------------------------

def test_zero_cp_loss_is_best():
    assert classify_move(0) == MoveCategory.best


def test_large_cp_loss_is_blunder():
    assert classify_move(30_000) == MoveCategory.blunder
