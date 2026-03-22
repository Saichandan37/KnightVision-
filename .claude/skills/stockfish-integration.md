# Skill: Stockfish Integration

## Purpose
Integrate the Stockfish chess engine into the Python backend to evaluate positions, compute centipawn scores, and retrieve top candidate moves using the UCI protocol via `python-chess`. Stockfish runs as a **single long-lived subprocess** — never start a new process per move.

---

## Dependencies
```
stockfish>=3.28       # PyPI package — auto-downloads binary for current platform
python-chess>=1.10    # PGN parsing, FEN manipulation, UCI↔SAN conversion
```

## Installation Note
The `stockfish` PyPI package downloads the correct Stockfish binary automatically on first use. Alternatively, set `binary_path` in `config.yaml` to a custom binary location (useful for Docker or CI).

---

## Core Service Pattern

Always manage Stockfish as a **singleton long-lived process** started at app startup and stopped at shutdown. Never instantiate per-request.

```python
# backend/services/stockfish_service.py
import chess
import chess.engine
import asyncio
from contextlib import asynccontextmanager
from typing import Optional
from dataclasses import dataclass, field

@dataclass
class PositionEval:
    score_cp: int                    # Centipawn score from mover's perspective (positive = good for mover)
    best_move_uci: str               # e.g. "e2e4"
    best_move_san: str               # e.g. "e4"
    top_candidates: list             # List of CandidateMove dicts, up to MultiPV count
    mate_in: Optional[int] = None    # Not None if forced mate detected (positive = mover wins)


class StockfishService:
    def __init__(self, binary_path: Optional[str], depth: int, threads: int, multipv: int):
        self.binary_path = binary_path  # None = auto-detect
        self.depth = depth              # recommended: 18
        self.threads = threads          # recommended: 2
        self.multipv = multipv          # recommended: 3
        self._engine: Optional[chess.engine.SimpleEngine] = None

    def start(self) -> None:
        """Start Stockfish subprocess. Call once at app startup."""
        path = self.binary_path or self._auto_detect_binary()
        self._engine = chess.engine.SimpleEngine.popen_uci(path)
        self._engine.configure({
            "Threads": self.threads,
            "Hash": 128,            # MB of hash table — increase on powerful machines
        })

    def stop(self) -> None:
        """Stop subprocess cleanly. Call at app shutdown."""
        if self._engine:
            self._engine.quit()
            self._engine = None

    def evaluate_position(self, fen: str) -> PositionEval:
        """
        Evaluate a FEN position. Returns score from the perspective of the side TO MOVE.
        Positive score = side to move is winning.
        """
        if not self._engine:
            raise RuntimeError("StockfishService not started. Call start() first.")

        board = chess.Board(fen)
        result = self._engine.analyse(
            board,
            chess.engine.Limit(depth=self.depth),
            multipv=self.multipv
        )

        # result is a list when multipv > 1
        if not isinstance(result, list):
            result = [result]

        primary = result[0]
        score = primary["score"].relative  # relative = from side-to-move perspective

        # Handle mate scores
        mate_in = None
        if score.is_mate():
            mate_in = score.mate()
            score_cp = 30000 if mate_in > 0 else -30000  # cap at ±30000 for mate
        else:
            score_cp = score.score(mate_score=30000)

        # Best move
        best_move_obj = primary.get("pv", [None])[0]
        if best_move_obj is None:
            # Fallback: use bestmove command
            best_move_obj = list(board.legal_moves)[0]

        best_move_uci = best_move_obj.uci()
        best_move_san = board.san(best_move_obj)

        # Top candidates
        candidates = []
        for info in result:
            move = info.get("pv", [None])[0]
            if move is None:
                continue
            move_score = info["score"].relative
            if move_score.is_mate():
                cp = 30000 if move_score.mate() > 0 else -30000
            else:
                cp = move_score.score(mate_score=30000)
            candidates.append({
                "move_uci": move.uci(),
                "move_san": board.san(move),
                "score_cp": cp
            })

        return PositionEval(
            score_cp=score_cp,
            best_move_uci=best_move_uci,
            best_move_san=best_move_san,
            top_candidates=candidates,
            mate_in=mate_in
        )

    @staticmethod
    def _auto_detect_binary() -> str:
        """Use stockfish PyPI package to find/download binary."""
        try:
            from stockfish import Stockfish as _SF
            return _SF()._stockfish_path
        except Exception:
            return "stockfish"  # try PATH as last resort
```

---

## Computing Centipawn Loss Per Move

This is the core metric for move classification. **Always compute from the moving player's perspective.**

```python
def compute_cp_loss(eval_before: PositionEval, eval_after: PositionEval, board_before_move: chess.Board) -> int:
    """
    Centipawn loss = how much worse the position got because of this move.

    CRITICAL: eval_after is from the OPPONENT's perspective (since it's their turn next).
    We must negate eval_after.score_cp to get it from the mover's perspective.

    cp_loss = max(0, score_before - (-score_after))
            = max(0, score_before + score_after)   [when both from mover's perspective]

    Wait — let's be precise:
    - eval_before.score_cp: score for side-to-move BEFORE the move (the mover's perspective)
    - eval_after.score_cp:  score for side-to-move AFTER the move (the opponent's perspective now)
    - From the mover's perspective, eval_after = -eval_after.score_cp

    cp_loss = max(0, eval_before.score_cp - (-eval_after.score_cp))
            = max(0, eval_before.score_cp + eval_after.score_cp)
    """
    score_before = eval_before.score_cp
    score_after_from_mover = -eval_after.score_cp   # negate because it's opponent's turn
    cp_loss = max(0, score_before - score_after_from_mover)
    return cp_loss
```

### Important: The Perspective Flip
Every time a move is made, it becomes the opponent's turn. Stockfish's `score.relative` is ALWAYS from the **current side-to-move's perspective**. When we evaluate position AFTER white plays e4, the score is from BLACK's perspective. To get white's resulting score, negate it.

---

## Analysing a Full PGN Game

```python
import chess.pgn
import io

def analyse_game_pgn(pgn_string: str, stockfish_svc: StockfishService) -> list[dict]:
    """
    Walk through all moves in a PGN game and evaluate each position.
    Returns list of move dicts with fen_before, fen_after, eval_before, eval_after, cp_loss.
    """
    pgn_io = io.StringIO(pgn_string)
    game = chess.pgn.read_game(pgn_io)
    if game is None:
        raise ValueError("Could not parse PGN")

    board = game.board()
    results = []
    eval_before = stockfish_svc.evaluate_position(board.fen())  # starting position

    for move_idx, move in enumerate(game.mainline_moves()):
        fen_before = board.fen()
        move_san = board.san(move)
        move_uci = move.uci()
        colour = "white" if board.turn == chess.WHITE else "black"
        move_number = board.fullmove_number

        board.push(move)
        fen_after = board.fen()

        eval_after = stockfish_svc.evaluate_position(fen_after)
        cp_loss = max(0, eval_before.score_cp + eval_after.score_cp)  # see perspective flip above

        results.append({
            "move_index": move_idx,
            "move_number": move_number,
            "colour": colour,
            "move_san": move_san,
            "move_uci": move_uci,
            "fen_before": fen_before,
            "fen_after": fen_after,
            "eval_before_cp": eval_before.score_cp,
            "eval_after_cp": eval_after.score_cp,
            "cp_loss": cp_loss,
            "best_move_uci": eval_before.best_move_uci,
            "best_move_san": eval_before.best_move_san,
            "top_candidates": eval_before.top_candidates,
        })

        eval_before = eval_after  # carry forward for next move

    return results
```

---

## FastAPI Lifecycle Integration

```python
# backend/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from services.stockfish_service import StockfishService
from config import settings

stockfish_service: StockfishService = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global stockfish_service
    stockfish_service = StockfishService(
        binary_path=settings.stockfish.binary_path,
        depth=settings.stockfish.depth,
        threads=settings.stockfish.threads,
        multipv=settings.stockfish.multipv,
    )
    stockfish_service.start()
    yield  # app runs here
    stockfish_service.stop()

app = FastAPI(lifespan=lifespan)
```

---

## Brilliant Move Detection

A move is Brilliant if: `cp_loss == 0` AND it involves a material sacrifice.

```python
def is_brilliant(board_before: chess.Board, move: chess.Move, eval_before: PositionEval) -> bool:
    """
    Brilliant = best move played AND involves a temporary material sacrifice.
    Check: piece is moving to a square where it can be captured immediately
    by a lower-value piece, suggesting a sacrifice.
    """
    if move.uci() != eval_before.best_move_uci:
        return False   # not the engine's top choice

    # Piece values (centipawns)
    PIECE_VALUE = {
        chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
        chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 20000
    }

    moving_piece = board_before.piece_at(move.from_square)
    if moving_piece is None:
        return False

    # Check if destination square is defended by opponent after the move
    board_after = board_before.copy()
    board_after.push(move)
    destination = move.to_square

    # If destination is attacked by an opponent piece of LOWER value, it's a sacrifice
    attackers = board_after.attackers(board_after.turn, destination)
    if attackers:
        min_attacker_value = min(
            PIECE_VALUE.get(board_after.piece_at(sq).piece_type, 0)
            for sq in attackers
            if board_after.piece_at(sq) is not None
        )
        moving_value = PIECE_VALUE.get(moving_piece.piece_type, 0)
        if min_attacker_value < moving_value:
            return True  # piece moves into capture by cheaper piece = sacrifice

    return False
```

---

## Performance Tips

- Default **depth 18** takes ~50–200ms per position on a modern laptop. For a 54-move game that's ~5–20 seconds total — acceptable.
- Increasing depth to 22 roughly doubles analysis time. Only use for critical positions.
- Keep Stockfish as **one persistent process** (done above). Starting a new process per move adds ~500ms overhead each time.
- Set `Hash: 128` (MB). Stockfish reuses hash table across calls in the same process — speeds up analysis of similar positions.
- If running in Docker, add `--cpus=2` to the container to prevent CPU thrashing.

---

## Error Handling and Process Recovery

```python
def safe_evaluate(self, fen: str) -> Optional[PositionEval]:
    """Evaluate with automatic process restart on crash."""
    try:
        return self.evaluate_position(fen)
    except chess.engine.EngineTerminatedError:
        # Stockfish crashed — restart and retry once
        try:
            self.stop()
            self.start()
            return self.evaluate_position(fen)
        except Exception:
            return None  # signal caller to use fallback
    except Exception:
        return None
```

If `safe_evaluate` returns `None`, the Analysis Orchestrator skips Stockfish for that move and assigns `category = "Good"` with a fallback LLM comment. Do not crash the whole analysis pipeline for a single bad position.

---

## Rules for Developer Agents

1. **NEVER** create a new `StockfishService` instance per request — always inject the singleton via FastAPI dependency.
2. **ALWAYS** use `score.relative` (not `score.white` or `score.black`) for centipawn scores — it handles colour automatically.
3. **ALWAYS** negate `eval_after.score_cp` when computing cp_loss (the perspective flip).
4. Use `board.san(move)` BEFORE pushing the move to get correct SAN notation.
5. Stockfish's `evaluate_position()` is **synchronous** and CPU-bound. Run it in a `ThreadPoolExecutor` to avoid blocking FastAPI's async event loop.
6. The `cp_loss` for the very first move of the game uses the engine's starting position evaluation as `eval_before`.
