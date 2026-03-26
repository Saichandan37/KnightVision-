"""Coaching prompt builder — converts a MoveResult into an LLM prompt.

The prompt supplies all structured context the LLM needs to produce a specific,
tactical coaching comment rather than a generic one.

Usage:
    from backend.app.llm.prompt_builder import build_coaching_prompt

    prompt = build_coaching_prompt(move_result)
    text, source = await provider_registry.generate_with_fallback(prompt)
"""
from __future__ import annotations

from ..models.api import MoveResult


def build_coaching_prompt(move: MoveResult) -> str:
    """Build a chess coaching prompt from *move*.

    Includes: move SAN/UCI, category, cp_loss, best move, top candidates,
    eval before/after — and the instruction asking for a 1-2 sentence
    tactical/positional explanation.

    Args:
        move: Fully populated MoveResult (from the analysis orchestrator).

    Returns:
        A single prompt string ready to send to any LLM provider.
    """
    candidates_san = ", ".join(c.san for c in move.top_candidates[:3])
    if not candidates_san:
        candidates_san = "none available"

    return (
        f"Move {move.move_number} — {move.san} (UCI: {move.uci})\n"
        f"Category: {move.category.value}\n"
        f"Centipawn loss: {move.cp_loss}\n"
        f"Best move suggested by engine: {move.best_move_san}\n"
        f"Top engine candidates: {candidates_san}\n"
        f"Evaluation before move: {move.eval_before_cp} cp\n"
        f"Evaluation after move:  {move.eval_after_cp} cp\n"
        "\n"
        f"You are a chess coach. In 1-2 sentences, explain why this move is a "
        f"{move.category.value} and what the better idea was. "
        f"Be specific — name the tactical or positional concept."
    )
