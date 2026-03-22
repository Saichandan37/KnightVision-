# Story 2.1 — PGN Parser

## User Story
As a developer, I want a PGN parser service so that uploaded PGN text is validated and converted into a structured list of positions before Stockfish analysis begins.

## Tasks
- Create `backend/app/services/pgn_parser.py`
- Function `parse_pgn(pgn_text: str) -> tuple[GameMeta, list[chess.Board]]`
- Use `python-chess` (`import chess`, `import chess.pgn`) to parse the PGN
- Extract `GameMeta` fields from PGN headers: White, Black, WhiteElo, BlackElo, Result, Date, ECO, Opening
- Return a list of `chess.Board` snapshots — one per ply, starting AFTER each move (so index 0 = position after move 1)
- Raise `ValueError` with a descriptive message if PGN is invalid or has zero moves
- Single-game only: if PGN contains multiple games, parse only the first
- All ECO/opening fields are optional — set to `None` if not present in headers

## Acceptance Criterion
Given a valid 10-move PGN string, `parse_pgn()` returns a tuple where `meta.white` is populated and the board list has exactly 10 entries; given an invalid PGN string, `parse_pgn()` raises `ValueError`.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
