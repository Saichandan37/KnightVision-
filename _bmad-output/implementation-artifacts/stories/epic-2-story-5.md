# Story 2.5 — Opening Detection

## User Story
As a developer, I want opening detection from a bundled ECO JSON so that the game header displays the opening name without any external API call.

## Tasks
- Create `backend/app/services/opening_service.py`
- Bundle `backend/app/data/eco.json` — a JSON array of `{eco: str, name: str, pgn: str}` objects (~500 entries covering common openings)
- Function `detect_opening(board_fen_after_move_10: str) -> tuple[Optional[str], Optional[str]]` returning `(eco_code, opening_name)`
- Match by comparing the first 10-move sequence from the parsed PGN against the bundled ECO table
- Return `(None, None)` gracefully if no match found — never raise
- Opening detection runs once after PGN parsing, before Stockfish analysis starts
- Result stored in `GameMeta.opening_eco` and `GameMeta.opening_name`

## Acceptance Criterion
Given the first 4 moves of the Sicilian Najdorf (`1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6`), `detect_opening()` returns an ECO code starting with `B9` and a name containing `Sicilian`; given a random non-standard position, it returns `(None, None)` without raising.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
