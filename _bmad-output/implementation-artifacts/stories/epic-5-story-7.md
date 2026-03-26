# Story 5.7 — Move Detail Card

## User Story
As a developer, I want a move detail card that shows the full annotation for the selected move so that users can read the coaching comment, see the category badge, and review the top candidate moves.

## Tasks
- Create `frontend/src/components/MoveDetailCard.tsx`
- Display for the currently selected move: category badge (coloured, labelled), eval before -> after in pawns, `cp_loss` display, coaching comment text, `comment_source` indicator (small tag: "AI" or "Template"), top 3 candidate moves as a list with SAN and centipawn values
- If `currentMoveIndex === -1` (starting position): show placeholder "Select a move to see analysis"
- Category badge uses same colour scheme as MoveList
- Comment text is the primary visual element — largest font
- Animate card content change with a subtle fade on move change

## Acceptance Criterion
Rendering `<MoveDetailCard move={blunderMove} />` where `blunderMove.category = "blunder"` displays a red badge with text "Blunder" and renders `blunderMove.comment` as visible text content. Verified with React Testing Library.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`data-color` on badge:** Same pattern as `MoveList` — jsdom normalises hex to `rgb()` in `style.backgroundColor`, so the raw hex is stored in `data-color` for test assertions. The AC red-badge test uses `getAttribute('data-color')`.

**`fmtCp` helper:** `(cp >= 0 ? '+' : '') + (cp / 100).toFixed(1)` — shared by eval display and candidate centipawn values. Handles both positive/negative cleanly with a single code path.

**`cp_loss` element conditionally rendered:** Only shown when `cp_loss > 0`; the test verifies it is absent at 0. This avoids showing `(−0 cp)` at starting/best moves.

**Top candidates sliced to 3:** Even if backend sends more, only first 3 are rendered. The test passes 4 candidates and verifies exactly 3 `[data-testid^="candidate-"]` elements appear.

**`null` move → placeholder:** Renders a separate `data-testid="move-detail-card-empty"` element. The full card container is not rendered at all, so `queryByTestId('move-detail-card')` returns null — verified in tests.

**Fade animation:** CSS `animation: fadeIn 0.2s ease` on the card. Not tested (animation doesn't run in jsdom), but the attribute is present for production use.

### Completion Notes
✅ All AC gate tests pass. 172 frontend tests pass (25 new + 147 prior). 0 regressions.
- Blunder badge shows "Blunder" text ✓
- Badge `data-color` is `#ca3431` (red) ✓
- `blunderMove.comment` visible in `data-testid="comment"` ✓

---

## File List
- `frontend/src/components/MoveDetailCard.tsx` (new — move detail card with badge, eval, comment, candidates)
- `frontend/src/components/__tests__/MoveDetailCard.ac.test.tsx` (new — 3 AC gate tests)
- `frontend/src/components/__tests__/MoveDetailCard.test.tsx` (new — 22 supporting tests)

---

## Change Log
- 2026-03-22: MoveDetailCard component, full annotation display, 25 tests (Sai Chandan / Claude)

---

## Status
review
