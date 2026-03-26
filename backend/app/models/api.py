"""Shared Pydantic models for the KnightVision API, WebSocket layer, and services."""
from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Move classification
# ---------------------------------------------------------------------------

class MoveCategory(str, Enum):
    brilliant = "brilliant"
    great = "great"
    best = "best"
    good = "good"
    inaccuracy = "inaccuracy"
    mistake = "mistake"
    blunder = "blunder"


# ---------------------------------------------------------------------------
# Engine output
# ---------------------------------------------------------------------------

class CandidateMove(BaseModel):
    uci: str
    san: str
    centipawns: int


class MoveResult(BaseModel):
    move_index: int                              # 0-based ply counter
    move_number: int                             # 1-based chess notation (display)
    san: str                                     # Standard Algebraic Notation
    uci: str                                     # UCI notation (e.g. "e2e4")
    category: MoveCategory
    cp_loss: int                                 # max(0, eval_before - eval_after)
    eval_before_cp: int                          # Mover's eval before the move
    eval_after_cp: int                           # Mover's eval after the move (flipped)
    best_move_uci: str
    best_move_san: str
    top_candidates: List[CandidateMove]
    comment: str
    comment_source: Literal["llm", "fallback"]


# ---------------------------------------------------------------------------
# WebSocket message types
# ---------------------------------------------------------------------------

class WSMoveResult(MoveResult):
    """MoveResult enriched with a buffered flag for late-join replay."""
    buffered: bool = False


class WSHeartbeat(BaseModel):
    type: Literal["heartbeat"] = "heartbeat"
    timestamp: float


class WSError(BaseModel):
    type: Literal["error"] = "error"
    message: str


class AnalysisComplete(BaseModel):
    type: Literal["analysis_complete"] = "analysis_complete"
    white_accuracy: float
    black_accuracy: float
    total_moves: int


# ---------------------------------------------------------------------------
# Game metadata
# ---------------------------------------------------------------------------

class GameMeta(BaseModel):
    white: str
    black: str
    white_elo: Optional[int] = None
    black_elo: Optional[int] = None
    result: str
    date: Optional[str] = None
    opening_eco: Optional[str] = None
    opening_name: Optional[str] = None
