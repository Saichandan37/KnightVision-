# Story 5.1 — Zustand Store

## User Story
As a developer, I want a Zustand store that holds all analysis state so that every frontend component reads from a single source of truth.

## Tasks
- Create `frontend/src/store/analysisStore.ts` using Zustand 4
- State shape:
  - `gameId: string | null`
  - `moves: MoveResult[]`
  - `meta: GameMeta | null`
  - `analysisStatus: "idle" | "uploading" | "analysing" | "complete" | "error" | "stalled"`
  - `whiteAccuracy: number | null`
  - `blackAccuracy: number | null`
  - `activeProvider: "ollama" | "groq" | "huggingface"`
  - `providerHealth: Record<string, boolean>`
- Actions: `setGameId`, `appendMove`, `setMeta`, `setStatus`, `setAccuracy`, `setActiveProvider`, `setProviderHealth`, `reset`
- TypeScript types in `frontend/src/types/analysis.ts` matching backend Pydantic models exactly (MoveResult, MoveCategory, GameMeta, etc.)
- No logic in the store — only state and setters

## Acceptance Criterion
`useAnalysisStore.getState().appendMove(mockMove)` adds one entry to `moves`; calling `reset()` sets `moves` back to `[]` and `analysisStatus` back to `"idle"`. Both verified in a Vitest unit test.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes

**`MoveResult` + `WSMoveResult` hierarchy:** `types/analysis.ts` already had `WSMoveResult` as a flat interface. Refactored so `MoveResult` is the base (matching the backend model exactly) and `WSMoveResult extends MoveResult` with only `buffered: bool` added. All existing hook tests remain green because the extra field is additive.

**`GameMeta` added to types:** Matches the backend `GameMeta` Pydantic model field-for-field (snake_case, nullable fields typed as `T | null`).

**`initialState` object for clean `reset()`:** Extracted as a named const so `reset: () => set(initialState)` is a single line with no field duplication. Avoids bugs where a new field added to state is missed in reset.

**`create<AnalysisState>()(...)`:** Using Zustand 4 curried form for TypeScript inference. Store is a singleton — `beforeEach(() => reset())` in tests prevents cross-test state leakage.

**AC uses `getState()` directly (no React context):** Zustand stores are accessible outside of components via `useAnalysisStore.getState()`, which is exactly what the AC test does.

### Completion Notes
✅ All AC gate tests pass. 48 frontend tests pass (25 new + 22 regression from prior stories). 261 backend tests unaffected.
- `appendMove adds one entry to moves` ✓
- `reset sets moves back to []` ✓
- `reset sets analysisStatus back to "idle"` ✓

---

## File List
- `frontend/src/types/analysis.ts` (updated — added `MoveResult`, `GameMeta`; refactored `WSMoveResult` to extend `MoveResult`)
- `frontend/src/store/analysisStore.ts` (new — Zustand 4 store, all state + actions)
- `frontend/src/store/__tests__/analysisStore.ac.test.ts` (new — 3 AC gate tests)
- `frontend/src/store/__tests__/analysisStore.test.ts` (new — 22 supporting tests)

---

## Change Log
- 2026-03-22: Zustand analysisStore, MoveResult + GameMeta types, 25 store tests (Sai Chandan / Claude)

---

## Status
review
