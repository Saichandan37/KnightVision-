# Story 1.5 — In-Memory Game Store

## User Story
As a developer, I want a thread-safe in-memory store so that the analysis pipeline can write move results and the WebSocket handler can read them without a database.

## Tasks
- Create `backend/app/store/memory_store.py` with `MemoryGameStore` class
- Store must hold per-game-id: `status` (pending/analysing/complete/error), `moves: list[MoveResult]`, `meta: Optional[GameMeta]`, `pgn: str`
- Methods: `create_game(game_id, pgn) -> None`, `append_move(game_id, move: MoveResult) -> None`, `get_moves(game_id) -> list[MoveResult]`, `set_status(game_id, status) -> None`, `get_status(game_id) -> str`, `set_meta(game_id, meta: GameMeta) -> None`, `get_meta(game_id) -> Optional[GameMeta]`
- Use `asyncio.Lock` per game_id for write safety
- Create a singleton `game_store = MemoryGameStore()` at module level, imported by other services
- Games are never persisted; store is reset on server restart

## Acceptance Criterion
A unit test in `backend/tests/test_memory_store.py` creates two games, appends 3 moves to each concurrently using `asyncio.gather`, and asserts each game has exactly 3 moves with no cross-contamination between game IDs.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
