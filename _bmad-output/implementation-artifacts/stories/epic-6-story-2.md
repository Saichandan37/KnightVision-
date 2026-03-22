# Story 6.2 — Mobile Swipe & Responsive Layout

## User Story
As a mobile user, I want to swipe left/right on the board to navigate moves and see the layout adapt to my screen so that the review experience works as well on phone as on desktop.

## Tasks
- Add swipe gesture to `Board.tsx`: `touchstart` + `touchend` listeners; swipe left -> `next()`, swipe right -> `prev()`; minimum swipe distance 50px to avoid accidental triggers
- Responsive layout in main `App.tsx` or layout component:
  - Desktop (>= 768px): board + eval bar left, move list right, move detail card below board, game header top
  - Mobile (< 768px): board full width at top, move detail card below board in a bottom sheet (slide-up panel), move list hidden by default with a toggle button
- Bottom sheet: shows current move detail; draggable up to show more detail, draggable down to minimise
- LLM provider selector: top bar on desktop, collapsible in mobile header
- Use Tailwind 3 responsive prefixes (`md:`, `lg:`) exclusively — no custom media queries

## Acceptance Criterion
On a viewport of 375x667px (iPhone SE), the board renders at full width, swipe left on the board advances `currentMoveIndex` by 1, and the move detail card is visible below the board without scrolling. Verified with React Testing Library with `window.innerWidth = 375`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
