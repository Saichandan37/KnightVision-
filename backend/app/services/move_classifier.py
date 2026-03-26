"""Move classifier — maps centipawn loss to a MoveCategory.

Threshold mapping (default, configurable via config.yaml):
    cp_loss == 0, is_sacrifice  → brilliant
    cp_loss == 0                → best
    cp_loss   1– 5              → great
    cp_loss   6–20              → good
    cp_loss  21–50              → inaccuracy
    cp_loss  51–150             → mistake
    cp_loss  > 150              → blunder

Sacrifice detection is a stub returning False for Phase 1.
Brilliant is therefore never returned in Phase 1.

Usage:
    from backend.app.services.move_classifier import classify_move

    category = classify_move(cp_loss=0)    # → MoveCategory.best
    category = classify_move(cp_loss=35)   # → MoveCategory.inaccuracy
    category = classify_move(cp_loss=200)  # → MoveCategory.blunder
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from ..models.api import MoveCategory

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Thresholds dataclass — mirrors config.yaml classification.thresholds
# ---------------------------------------------------------------------------

@dataclass
class ClassificationThresholds:
    great_max_cp_loss: int = 5
    good_max_cp_loss: int = 20
    inaccuracy_max_cp_loss: int = 50
    mistake_max_cp_loss: int = 150
    # blunder  = anything above mistake_max_cp_loss
    # brilliant = cp_loss == 0 AND is_sacrifice (Phase 1 stub: never triggered)
    # best      = cp_loss == 0 AND NOT is_sacrifice


_DEFAULT_THRESHOLDS = ClassificationThresholds()


# ---------------------------------------------------------------------------
# Phase 1 sacrifice stub
# ---------------------------------------------------------------------------

def detect_sacrifice() -> bool:
    """Phase 1 stub — sacrifice detection is deferred. Always returns False."""
    return False


# ---------------------------------------------------------------------------
# Public classifier
# ---------------------------------------------------------------------------

def classify_move(
    cp_loss: int,
    is_sacrifice: bool = False,
    thresholds: Optional[ClassificationThresholds] = None,
) -> MoveCategory:
    """Classify a move by its centipawn loss.

    Args:
        cp_loss:       max(0, eval_before_cp - eval_after_cp) — always >= 0.
        is_sacrifice:  True when the move involves a material sacrifice (Phase 1: stub).
        thresholds:    Optional override; defaults to config-aligned defaults.

    Returns:
        MoveCategory enum value.
    """
    t = thresholds or _DEFAULT_THRESHOLDS

    # Brilliant — Phase 1 stub: is_sacrifice is always False, never reached
    if cp_loss == 0 and is_sacrifice:
        return MoveCategory.brilliant

    # Best — engine's top choice (exactly zero loss, no sacrifice)
    if cp_loss == 0:
        return MoveCategory.best

    # Great — very strong, near-perfect (cp_loss 1–great_max)
    if cp_loss <= t.great_max_cp_loss:
        return MoveCategory.great

    # Good — solid move (great_max < cp_loss <= good_max)
    if cp_loss <= t.good_max_cp_loss:
        return MoveCategory.good

    # Inaccuracy (good_max < cp_loss <= inaccuracy_max)
    if cp_loss <= t.inaccuracy_max_cp_loss:
        return MoveCategory.inaccuracy

    # Mistake (inaccuracy_max < cp_loss <= mistake_max)
    if cp_loss <= t.mistake_max_cp_loss:
        return MoveCategory.mistake

    # Blunder — everything above mistake threshold
    return MoveCategory.blunder
