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

---

## Dev Agent Record

### Implementation Notes

**Formula verified:** `whitePercent = 50 + (clamp(evalCp, -500, 500) / 500) * 50`. At 0 cp → 50%, at +300 → 80%, at -300 → 20%, at ±500 → 100%/0%. White + Black always sum to 100%.

**Label sign logic:** `evalCp > 0` → `+`, `evalCp < 0` → `-`, `evalCp === 0` → empty string, giving `"0.0"` at equality (not `"+0.0"`). This avoids the awkward `+0.0`. The test explicitly checks no `-` sign at 0 and that `"0.0"` is present.

**`data-testid` attributes:** All three sections (`eval-bar`, `eval-bar-white`, `eval-bar-black`) and the label (`eval-bar-label`) are testid-tagged so RTL can locate them without CSS selectors.

**CSS `transition: height 0.3s ease`** on both white and black sections.

### Completion Notes
✅ All AC gate tests pass. 123 frontend tests pass (16 new + 107 prior). 0 regressions.
- `evalCp=300` → White > 50%, Black < 50% ✓
- `evalCp=-300` → White < 50% ✓
- `evalCp=0` → both 50% ✓

---

## File List
- `frontend/src/components/EvalBar.tsx` (new — vertical evaluation bar)
- `frontend/src/components/__tests__/EvalBar.ac.test.tsx` (new — 3 AC gate tests)
- `frontend/src/components/__tests__/EvalBar.test.tsx` (new — 13 supporting tests)

---

## Change Log
- 2026-03-22: EvalBar component, clamped cp→percent conversion, animated, 16 tests (Sai Chandan / Claude)

---

## Status
review
