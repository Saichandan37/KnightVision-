# Story 2.3 — Move Classifier

## User Story
As a developer, I want a move classifier that converts centipawn loss into a `MoveCategory` so that every move gets a human-readable quality label.

## Tasks
- [x] Create `backend/app/services/move_classifier.py`
- [x] Function `classify_move(cp_loss: int, is_sacrifice: bool = False) -> MoveCategory`
- [x] `cp_loss = max(0, eval_before_cp - eval_after_cp)` where both evals are from the mover's perspective (already flipped by Stockfish service)
- [x] Thresholds read from `config.yaml` `classification.thresholds` — not hardcoded
- [x] Default thresholds: Brilliant: cp_loss == 0 AND is_sacrifice; Great: cp_loss == 0 (not sacrifice); Best: cp_loss 0–5; Good: cp_loss 5–20; Inaccuracy: cp_loss 20–50; Mistake: cp_loss 50–150; Blunder: cp_loss > 150
- [x] Sacrifice detection is a stub returning `False` for Phase 1 (Brilliant classification deferred)
- [x] Create `backend/tests/services/test_move_classifier.py` with exactly 3 tests

## Acceptance Criterion
Three unit tests in `backend/tests/services/test_move_classifier.py` with known positions must pass: one Blunder (cp_loss > 150), one Best (cp_loss = 0), one Inaccuracy (cp_loss 20–50), each asserting the exact expected MoveCategory. All three must pass before this story is accepted.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**Threshold interpretation:** The story spec lists "Great: cp_loss == 0 (not sacrifice)" but the AC mandates `cp_loss = 0 → MoveCategory.best`. These conflict. The AC is authoritative. Resolved mapping:
- `cp_loss == 0, sacrifice=True` → `brilliant` (Phase 1 stub: never triggered)
- `cp_loss == 0, sacrifice=False` → `best`
- `cp_loss 1–5` → `great` (great_max threshold = 5)
- `cp_loss 6–20` → `good`
- `cp_loss 21–50` → `inaccuracy`
- `cp_loss 51–150` → `mistake`
- `cp_loss > 150` → `blunder`

**`ClassificationThresholds` dataclass** mirrors `config.yaml classification.thresholds`. The classifier accepts an optional `thresholds` parameter for overriding defaults — production code will pass in the loaded config thresholds; tests use defaults.

**config.yaml thresholds** use `great_max_cp_loss: 5`, `good_max_cp_loss: 20`, `inaccuracy_max_cp_loss: 50`, `mistake_max_cp_loss: 150` — aligns with defaults.

**`detect_sacrifice()` stub** is defined as a separate function (returns `False`) for easy Phase 2 replacement without touching `classify_move`'s signature.

### Completion Notes
✅ All 3 mandatory AC gate tests pass. 89/89 total tests pass (3 gate + 18 boundary tests + 68 regression). Gate tests in `backend/tests/services/test_move_classifier.py` confirmed:
- `classify_move(200)` → `MoveCategory.blunder` ✅
- `classify_move(0)` → `MoveCategory.best` ✅
- `classify_move(35)` → `MoveCategory.inaccuracy` ✅

---

## File List
- `backend/app/services/move_classifier.py` (new)
- `backend/tests/services/test_move_classifier.py` (new — 3 mandatory AC gate tests)
- `backend/tests/test_move_classifier.py` (new — 18 boundary/parametrized tests)

---

## Change Log
- 2026-03-22: Move classifier — classify_move(), ClassificationThresholds, Phase 1 sacrifice stub, 3 AC gate tests + full boundary coverage (Sai Chandan / Claude)

---

## Status
review
