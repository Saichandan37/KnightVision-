# Story 6.3 — WCAG AA Accessibility

## User Story
As a developer, I want all badge colours and interactive elements to meet WCAG 2.1 AA contrast standards so that the tool is usable by players with colour vision deficiency.

## Tasks
- Verify all 7 `MoveCategory` badge colours pass 4.5:1 contrast ratio on the dark background (`#1a1a2e` or equivalent):
  - brilliant `#1baaa6`, great `#5ca0d3`, best `#6dba6a`, good `#96bc4b`, inaccuracy `#f0c15c`, mistake `#e8834e`, blunder `#ca3431`
- Run axe DevTools (or `@axe-core/react` in dev mode) and fix any reported violations
- All interactive elements (buttons, move list items) must have visible focus rings (2px outline, offset 2px)
- All icon-only buttons must have `aria-label` attributes
- Board squares must not rely on colour alone — piece icons provide the primary signal
- Move list: each move item must have `role="button"` and `aria-label="Move {move_number}: {san}, {category}"`

## Acceptance Criterion
Running `axe(document.body)` in a Vitest/jsdom test on the fully-rendered review board returns zero violations with `impact: "critical"` or `impact: "serious"`; all 7 badge colours have been manually verified at >= 4.5:1 contrast ratio against the app background.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
