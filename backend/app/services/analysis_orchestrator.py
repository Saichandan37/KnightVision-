"""Analysis orchestrator — coordinates PGN parser, Stockfish, and move classifier.

Pipeline (per game):
    1. Parse PGN → GameMeta + boards
    2. For each ply: analyse with Stockfish, classify, build MoveResult, callback
    3. Compute per-side accuracy, return AnalysisComplete

Perspective accounting
----------------------
The Stockfish service returns eval_cp in White's perspective for BOTH sides
(flip happens inside the service for White's moves; Black's moves are left as
White's-perspective raw). To produce correct cp_loss the orchestrator converts
evals to the mover's perspective before computing cp_loss:

    White ply:  eval_before/after kept as-is (already White's perspective)
    Black ply:  negate both (White's perspective → Black's perspective)

This follows the implementation note in story 2.2:
  "eval_before = -eval_after_previous is needed for correct cp_loss on Black's moves"

Usage:
    from backend.app.services.analysis_orchestrator import run_analysis
"""
from __future__ import annotations

import logging
from typing import Awaitable, Callable, Optional

import chess

from ..config import AppConfig
from ..models.api import AnalysisComplete, CandidateMove, MoveCategory, MoveResult
from ..store.memory_store import game_store
from .move_classifier import ClassificationThresholds as ClassifierThresholds
from .move_classifier import classify_move
from .pgn_parser import parse_pgn
from .stockfish_service import StockfishService

logger = logging.getLogger(__name__)


async def run_analysis(
    game_id: str,
    pgn: str,
    config: AppConfig,
    on_move_result: Callable[[MoveResult], Awaitable[None]],
    stockfish_service: Optional[StockfishService] = None,
) -> AnalysisComplete:
    """Run the full analysis pipeline for *game_id*.

    Args:
        game_id:            UUID string matching an entry in the game store.
        pgn:                Raw PGN text for the game.
        config:             Loaded AppConfig (stockfish + classification settings).
        on_move_result:     Async callback invoked once per ply with the MoveResult.
                            Called BEFORE the move is appended to the store.
        stockfish_service:  Optional pre-built service — used by tests to avoid
                            spinning up a real Stockfish process.

    Returns:
        AnalysisComplete with per-side accuracy and total move count.

    Raises:
        ValueError:   PGN is invalid or contains no moves.
        RuntimeError: Stockfish initialisation failed.
        KeyError:     game_id not found in the store.
    """
    await game_store.set_status(game_id, "analysing")
    logger.info("Analysis started — game_id=%s", game_id)

    try:
        # ------------------------------------------------------------------
        # 1. Parse PGN
        # ------------------------------------------------------------------
        meta, boards = parse_pgn(pgn)
        await game_store.set_meta(game_id, meta)

        # ------------------------------------------------------------------
        # 2. Prepare Stockfish
        # ------------------------------------------------------------------
        sf = stockfish_service or StockfishService(
            path=config.stockfish.path,
            depth=config.stockfish.depth,
            multipv=config.stockfish.multipv,
        )

        # Build classifier thresholds from config
        ct = config.classification.thresholds
        thresholds = ClassifierThresholds(
            great_max_cp_loss=ct.great_max_cp_loss,
            good_max_cp_loss=ct.good_max_cp_loss,
            inaccuracy_max_cp_loss=ct.inaccuracy_max_cp_loss,
            mistake_max_cp_loss=ct.mistake_max_cp_loss,
        )

        # ------------------------------------------------------------------
        # 3. Analyse each ply
        # ------------------------------------------------------------------
        # eval_white_persp: running eval stored in White's perspective.
        # Starting position is assumed neutral = 0.
        eval_white_persp: int = 0

        white_cp_losses: list[int] = []
        black_cp_losses: list[int] = []

        # Pre-build "previous board" — we need it to get SAN of the played move.
        prev_board = chess.Board()  # initial position

        for move_index, board in enumerate(boards):
            # ----------------------------------------------------------------
            # Move identity
            # ----------------------------------------------------------------
            played_move = board.peek()           # chess.Move object
            uci = played_move.uci()
            san = prev_board.san(played_move)
            move_number = (move_index // 2) + 1
            white_moved = (move_index % 2 == 0)

            # ----------------------------------------------------------------
            # Stockfish analysis on the position AFTER the move
            # ----------------------------------------------------------------
            analysis = await sf.analyse_position(board, config.stockfish.depth)
            eval_white_persp_after: int = analysis["eval_cp"]

            # ----------------------------------------------------------------
            # Convert evals to mover's perspective for cp_loss and MoveResult
            # ----------------------------------------------------------------
            if white_moved:
                eval_before_cp = eval_white_persp          # White's perspective
                eval_after_cp = eval_white_persp_after
            else:
                # Negate: White's perspective → Black's (mover's) perspective
                eval_before_cp = -eval_white_persp
                eval_after_cp = -eval_white_persp_after

            cp_loss = max(0, eval_before_cp - eval_after_cp)

            # ----------------------------------------------------------------
            # Classify
            # ----------------------------------------------------------------
            category: MoveCategory = classify_move(cp_loss, thresholds=thresholds)

            # ----------------------------------------------------------------
            # Build MoveResult (no LLM commentary — injected by Epic 4)
            # ----------------------------------------------------------------
            top_candidates = [
                CandidateMove(
                    uci=c["uci"],
                    san=c["san"],
                    centipawns=c["centipawns"],
                )
                for c in analysis["top_candidates"]
            ]

            move_result = MoveResult(
                move_index=move_index,
                move_number=move_number,
                san=san,
                uci=uci,
                category=category,
                cp_loss=cp_loss,
                eval_before_cp=eval_before_cp,
                eval_after_cp=eval_after_cp,
                best_move_uci=analysis["best_move_uci"],
                best_move_san=analysis["best_move_san"],
                top_candidates=top_candidates,
                comment="",
                comment_source="fallback",
            )

            logger.debug(
                "Ply %d (%s): %s cp_loss=%d category=%s",
                move_index,
                "W" if white_moved else "B",
                san,
                cp_loss,
                category.value,
            )

            # ----------------------------------------------------------------
            # Emit and persist
            # ----------------------------------------------------------------
            await on_move_result(move_result)
            await game_store.append_move(game_id, move_result)

            # ----------------------------------------------------------------
            # Advance state
            # ----------------------------------------------------------------
            if white_moved:
                white_cp_losses.append(cp_loss)
            else:
                black_cp_losses.append(cp_loss)

            eval_white_persp = eval_white_persp_after
            prev_board = board

        # ------------------------------------------------------------------
        # 4. Accuracy
        # ------------------------------------------------------------------
        def _accuracy(losses: list[int]) -> float:
            if not losses:
                return 100.0
            return max(0.0, 100.0 - (sum(losses) / len(losses)))

        white_accuracy = _accuracy(white_cp_losses)
        black_accuracy = _accuracy(black_cp_losses)
        total_moves = len(boards)

        await game_store.set_status(game_id, "complete")
        logger.info(
            "Analysis complete — game_id=%s total=%d W=%.1f%% B=%.1f%%",
            game_id,
            total_moves,
            white_accuracy,
            black_accuracy,
        )

        return AnalysisComplete(
            white_accuracy=white_accuracy,
            black_accuracy=black_accuracy,
            total_moves=total_moves,
        )

    except Exception:
        await game_store.set_status(game_id, "error")
        logger.exception("Analysis failed — game_id=%s", game_id)
        raise
