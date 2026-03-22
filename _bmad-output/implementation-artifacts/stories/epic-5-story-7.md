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
