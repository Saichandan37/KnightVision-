# Story 2.1 — PGN Parser

## User Story
As a developer, I want a PGN parser service so that uploaded PGN text is validated and converted into a structured list of positions before Stockfish analysis begins.

## Tasks
- [x] Create `backend/app/services/pgn_parser.py`
- [x] Function `parse_pgn(pgn_text: str) -> tuple[GameMeta, list[chess.Board]]`
- [x] Use `python-chess` (`import chess`, `import chess.pgn`) to parse the PGN
- [x] Extract `GameMeta` fields from PGN headers: White, Black, WhiteElo, BlackElo, Result, Date, ECO, Opening
- [x] Return a list of `chess.Board` snapshots — one per ply, starting AFTER each move (so index 0 = position after move 1)
- [x] Raise `ValueError` with a descriptive message if PGN is invalid or has zero moves
- [x] Single-game only: if PGN contains multiple games, parse only the first
- [x] All ECO/opening fields are optional — set to `None` if not present in headers

## Acceptance Criterion
Given a valid 10-move PGN string, `parse_pgn()` returns a tuple where `meta.white` is populated and the board list has exactly 10 entries; given an invalid PGN string, `parse_pgn()` raises `ValueError`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- `chess.pgn.read_game(io.StringIO(pgn_text))` returns `None` for completely unparseable input and a game with no moves for headers-only PGN — both cases raise `ValueError`
- Board snapshots use `board.copy()` after each `board.push(move)` — essential; without copy all list entries would point to the same mutable board object
- `_parse_elo()` handles PGN convention `"?"` for unknown Elo as well as missing headers and non-numeric values — all map to `None`
- Multi-game PGN: `chess.pgn.read_game()` naturally stops at the first game boundary — no extra handling needed
- `headers.get("Date") or None` converts empty string `""` to `None` (PGN sometimes emits `[Date ""]`)

### Completion Notes
✅ All tasks complete. 57/57 tests pass (18 new + 39 regression). AC confirmed: Sicilian 10-ply PGN → `len(boards) == 10` and `meta.white == "Magnus"`; invalid PGN → `ValueError`.

---

## File List
- `backend/app/services/pgn_parser.py` (new)
- `backend/tests/test_pgn_parser.py` (new)

---

## Change Log
- 2026-03-22: PGN parser service — parse_pgn(), GameMeta extraction, board snapshot list, error handling (Sai Chandan / Claude)

---

## Status
review
