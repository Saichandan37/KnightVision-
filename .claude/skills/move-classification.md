# Skill: Move Classification

## Purpose
Map Stockfish centipawn loss to one of 7 move categories. This is deterministic math — **never use the LLM for classification**. The LLM only explains the category in words.

---

## Input (from Stockfish service)
```python
eval_before_cp: int   # Score for side-to-move BEFORE the move (from mover's perspective)
eval_after_cp: int    # Score for side-to-move AFTER the move (now opponent's perspective — negate it)
best_move_uci: str    # Engine's top move in UCI notation
played_move_uci: str  # The move that was actually played
board_before: chess.Board  # Position BEFORE the move (for brilliant detection)
played_move: chess.Move    # The move object
```

---

## Centipawn Loss Formula

```python
# eval_after_cp is from OPPONENT's perspective — must negate to get mover's perspective
score_after_from_mover = -eval_after_cp
cp_loss = max(0, eval_before_cp - score_after_from_mover)
# Equivalent: cp_loss = max(0, eval_before_cp + eval_after_cp)
```

**Why negate?** After a move is played, it becomes the opponent's turn. Stockfish's `score.relative` always reports from the current side-to-move's perspective. So `eval_after` is from the opponent's viewpoint. Negating converts it back to the mover's viewpoint.

---

## Category Thresholds

```python
# backend/services/move_classifier.py
from enum import Enum
from dataclasses import dataclass
import chess

class MoveCategory(str, Enum):
    BRILLIANT   = "Brilliant"
    GREAT       = "Great"
    BEST        = "Best"
    GOOD        = "Good"
    INACCURACY  = "Inaccuracy"
    MISTAKE     = "Mistake"
    BLUNDER     = "Blunder"

CATEGORY_SYMBOL = {
    MoveCategory.BRILLIANT:  "!!",
    MoveCategory.GREAT:      "!",
    MoveCategory.BEST:       "✓",
    MoveCategory.GOOD:       "~",
    MoveCategory.INACCURACY: "?!",
    MoveCategory.MISTAKE:    "?",
    MoveCategory.BLUNDER:    "??",
}

@dataclass
class ClassifierThresholds:
    brilliant_max_cp_loss:  int = 0
    great_max_cp_loss:      int = 5
    best_max_cp_loss:       int = 10
    good_max_cp_loss:       int = 20
    inaccuracy_max_cp_loss: int = 50
    mistake_max_cp_loss:    int = 150
    # Blunder = anything above mistake threshold
```

---

## Classification Function

```python
def classify_move(
    cp_loss: int,
    played_move: chess.Move,
    best_move_uci: str,
    board_before: chess.Board,
    thresholds: ClassifierThresholds = ClassifierThresholds()
) -> tuple[MoveCategory, str]:
    """
    Returns (category, symbol).
    Classify based on cp_loss first, then upgrade to Brilliant if sacrifice criteria met.
    """
    # 1. Base classification by cp_loss
    t = thresholds
    if   cp_loss <= t.great_max_cp_loss:   category = MoveCategory.GREAT       # covers 0–5
    elif cp_loss <= t.best_max_cp_loss:    category = MoveCategory.BEST        # 6–10
    elif cp_loss <= t.good_max_cp_loss:    category = MoveCategory.GOOD        # 11–20
    elif cp_loss <= t.inaccuracy_max_cp_loss: category = MoveCategory.INACCURACY  # 21–50
    elif cp_loss <= t.mistake_max_cp_loss: category = MoveCategory.MISTAKE     # 51–150
    else:                                  category = MoveCategory.BLUNDER     # 151+

    # 2. Upgrade GREAT (cp_loss 0–5) to BRILLIANT if sacrifice criteria met
    if category == MoveCategory.GREAT and cp_loss <= t.brilliant_max_cp_loss:
        if played_move.uci() == best_move_uci:   # must be engine's top choice
            if _is_sacrifice(board_before, played_move):
                category = MoveCategory.BRILLIANT

    return category, CATEGORY_SYMBOL[category]
```

---

## Brilliant Move Detection

```python
PIECE_VALUE = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 20000
}

def _is_sacrifice(board: chess.Board, move: chess.Move) -> bool:
    """
    A move is a sacrifice if the piece moves to a square where it can immediately
    be recaptured by a lower-value piece. This indicates the player is giving up
    material (presumably for positional or tactical gain deeper in the line).
    """
    moving_piece = board.piece_at(move.from_square)
    if moving_piece is None:
        return False

    # Apply the move to check what's on the destination square after
    board_after = board.copy()
    board_after.push(move)

    destination = move.to_square
    # Get all opponent attackers of the destination square
    opponent_colour = board_after.turn  # it's now the opponent's turn
    attackers = board_after.attackers(opponent_colour, destination)

    if not attackers:
        return False

    # Find the cheapest attacker
    min_attacker_value = min(
        PIECE_VALUE.get(board_after.piece_at(sq).piece_type, 99999)
        for sq in attackers
        if board_after.piece_at(sq) is not None
    )

    moving_value = PIECE_VALUE.get(moving_piece.piece_type, 0)

    # Sacrifice = moving piece is more valuable than the cheapest recapture
    return min_attacker_value < moving_value
```

---

## Accuracy Score Calculation

Accuracy is computed AFTER all moves are classified. No additional Stockfish calls needed.

```python
def compute_accuracy(moves: list[dict], colour: str, max_cp_scale: int = 300) -> float:
    """
    Compute accuracy percentage for a given colour.
    colour: "white" | "black"
    max_cp_scale: cp_loss at which accuracy = 0% (default 300 = ~3 pawns)
    Returns: float in range [0.0, 100.0]
    """
    player_moves = [m for m in moves if m["colour"] == colour]
    if not player_moves:
        return 0.0

    total_loss = sum(m["cp_loss"] for m in player_moves)
    avg_loss = total_loss / len(player_moves)
    accuracy = max(0.0, 100.0 - (avg_loss / max_cp_scale * 100.0))
    return round(accuracy, 1)

# Usage:
# white_accuracy = compute_accuracy(all_moves, "white")
# black_accuracy = compute_accuracy(all_moves, "black")
```

**Performance:** O(N) where N = number of moves. Adds < 1ms. Include it in the game summary — no lag risk.

---

## Category Colour Mapping (shared constant — use in both FE and BE)

```python
# Python version (backend/services/move_classifier.py)
CATEGORY_COLOURS = {
    MoveCategory.BRILLIANT:  "#34d399",  # emerald
    MoveCategory.GREAT:      "#6c8efb",  # blue
    MoveCategory.BEST:       "#a78bfa",  # violet
    MoveCategory.GOOD:       "#22d3ee",  # cyan
    MoveCategory.INACCURACY: "#fbbf24",  # yellow
    MoveCategory.MISTAKE:    "#fb923c",  # orange
    MoveCategory.BLUNDER:    "#f87171",  # red
}
```

---

## Rules for Developer Agents

1. **Never use the LLM to determine category.** Classification is purely: `max(0, eval_before + eval_after)` mapped through thresholds.
2. **Brilliant requires cp_loss == 0 AND sacrifice detected AND best move played.** All three conditions must be true.
3. **`cp_loss` is always ≥ 0.** Use `max(0, ...)` — never allow negative cp_loss.
4. **Thresholds come from `config.yaml`**, not hardcoded. Developer should load them through the `ClassifierThresholds` dataclass from the `classifier.thresholds` config section.
5. **Accuracy is a post-processing step** — compute it once after all moves are analysed, in the `GameSummary` construction.
6. **`eval_after_cp` must be negated** before subtraction. This is the most common bug — always document it clearly.
