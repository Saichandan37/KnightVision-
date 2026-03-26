# Story 1.5 — In-Memory Game Store

## User Story
As a developer, I want a thread-safe in-memory store so that the analysis pipeline can write move results and the WebSocket handler can read them without a database.

## Tasks
- [x] Create `backend/app/store/memory_store.py` with `MemoryGameStore` class
- [x] Store must hold per-game-id: `status` (pending/analysing/complete/error), `moves: list[MoveResult]`, `meta: Optional[GameMeta]`, `pgn: str`
- [x] Methods: `create_game(game_id, pgn) -> None`, `append_move(game_id, move: MoveResult) -> None`, `get_moves(game_id) -> list[MoveResult]`, `set_status(game_id, status) -> None`, `get_status(game_id) -> str`, `set_meta(game_id, meta: GameMeta) -> None`, `get_meta(game_id) -> Optional[GameMeta]`
- [x] Use `asyncio.Lock` per game_id for write safety
- [x] Create a singleton `game_store = MemoryGameStore()` at module level, imported by other services
- [x] Games are never persisted; store is reset on server restart

## Acceptance Criterion
A unit test in `backend/tests/test_memory_store.py` creates two games, appends 3 moves to each concurrently using `asyncio.gather`, and asserts each game has exactly 3 moves with no cross-contamination between game IDs.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- Two-level locking: `_registry_lock` (asyncio.Lock) guards the top-level `_games` dict for `create_game`; each `_GameRecord` has its own `asyncio.Lock` for per-game write operations (`append_move`, `set_status`, `set_meta`)
- `_get_record()` is synchronous — it only reads the dict reference (no mutation), so no lock needed; raises `KeyError` with a descriptive message for unknown game IDs
- `get_moves()` returns `list(record.moves)` — a shallow copy — so callers cannot mutate the store's internal list
- `get_pgn()` added beyond the story spec: needed by the WebSocket handler in Epic 4 to replay analysis; added proactively since it's a natural read method
- `_GameRecord` is a `dataclass` with `field(default_factory=asyncio.Lock)` — each record gets its own fresh lock at construction time

### Completion Notes
✅ All tasks complete. 39/39 tests pass (10 new store tests + 29 regression). AC test `test_concurrent_appends_no_cross_contamination` passes: two games, 3 concurrent appends each via `asyncio.gather`, zero cross-contamination confirmed.

---

## File List
- `backend/app/store/memory_store.py` (new)
- `backend/tests/test_memory_store.py` (new)

---

## Change Log
- 2026-03-22: In-memory game store — MemoryGameStore with per-game asyncio.Lock, singleton, full CRUD (Sai Chandan / Claude)

---

## Status
review
