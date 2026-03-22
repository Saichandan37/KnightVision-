# Story 2.3 — Move Classifier

## User Story
As a developer, I want a move classifier that converts centipawn loss into a `MoveCategory` so that every move gets a human-readable quality label.

## Tasks
- Create `backend/app/services/move_classifier.py`
- Function `classify_move(cp_loss: int, is_sacrifice: bool = False) -> MoveCategory`
- `cp_loss = max(0, eval_before_cp - eval_after_cp)` where both evals are from the mover's perspective (already flipped by Stockfish service)
- Thresholds read from `config.yaml` `classification.thresholds` — not hardcoded
- Default thresholds: Brilliant: cp_loss == 0 AND is_sacrifice; Great: cp_loss == 0 (not sacrifice); Best: cp_loss 0–5; Good: cp_loss 5–20; Inaccuracy: cp_loss 20–50; Mistake: cp_loss 50–150; Blunder: cp_loss > 150
- Sacrifice detection is a stub returning `False` for Phase 1 (Brilliant classification deferred)
- Create `backend/tests/services/test_move_classifier.py` with exactly 3 tests

## Acceptance Criterion
Three unit tests in `backend/tests/services/test_move_classifier.py` with known positions must pass: one Blunder (cp_loss > 150), one Best (cp_loss = 0), one Inaccuracy (cp_loss 20–50), each asserting the exact expected MoveCategory. All three must pass before this story is accepted.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
