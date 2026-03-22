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
