# Story 5.5 — Eval Bar

## User Story
As a developer, I want an evaluation bar component that shows the current position's advantage visually so that users can see at a glance which side is better.

## Tasks
- Create `frontend/src/components/EvalBar.tsx`
- Vertical bar, White section at bottom (grows upward), Black section at top
- Input: `evalCp: number` (centipawns, positive = White advantage, negative = Black advantage)
- Clamp display range: +-500cp maps to 0%–100%; beyond +-500cp shows 5%/95% (never fully disappear)
- Conversion: `whitePercent = 50 + (clamp(evalCp, -500, 500) / 500) * 50`
- Display numeric eval in pawns: `(Math.abs(evalCp) / 100).toFixed(1)` with `+/-` sign
- At starting position (evalCp = 0): 50/50 split
- Animate transitions with CSS `transition: height 0.3s ease`

## Acceptance Criterion
`<EvalBar evalCp={300} />` renders with White section height > 50% and Black section height < 50%; `<EvalBar evalCp={-300} />` renders with White section height < 50%; `<EvalBar evalCp={0} />` renders with both sections at 50%. Verified with React Testing Library `getByTestId` and style assertions.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
