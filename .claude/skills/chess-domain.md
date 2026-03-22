# Skill: Chess Domain Knowledge

## Purpose
Reference for all chess-specific terminology, notation formats, data formats, and domain rules used across the project. Developer and LLM agents must use this skill to avoid hallucinating chess concepts.

---

## 1. Notation Formats

### PGN (Portable Game Notation)
The input format for this application. A PGN file contains game headers (square-bracketed key-value pairs) followed by move text.

```
[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.03.13"]
[White "Dchoupak1"]
[Black "SaiChandanSingh"]
[Result "0-1"]
[WhiteElo "1078"]
[BlackElo "1116"]
[TimeControl "600"]

1. e4 d5 2. e5 Nc6 3. d4 f6 4. Bb5 Bd7 5. Bxc6 Bxc6 ...
```

**Key PGN rules:**
- Result codes: `1-0` (White wins), `0-1` (Black wins), `1/2-1/2` (Draw), `*` (Ongoing/Unknown)
- Moves are numbered for full moves: `1.` = move 1, white plays first
- Both white and black moves share the same move number: `1. e4 e5` = white e4, black e5
- A "half-move" or "ply" = one individual move by either colour
- Move text can contain annotations: `!` (good), `?` (mistake), `!!` (brilliant), `??` (blunder), `!?` (interesting), `?!` (dubious)
- `python-chess` parses PGN with `chess.pgn.read_game(io.StringIO(pgn_text))`

### FEN (Forsyth-Edwards Notation)
A single string representing the complete board state. Used as input to Stockfish.

```
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
│                                               │ │    │  │ └─ Full move number
│                                               │ │    │  └─── Half-move clock (for 50-move rule)
│                                               │ │    └────── En passant target square (or -)
│                                               │ └─────────── Castling rights (K=white kingside, etc.)
│                                               └───────────── Side to move (w/b)
└───────────────────────────────────────────────────────────── Piece placement (rank 8 to rank 1)
```

**Piece placement:**
- Uppercase = White pieces, lowercase = Black pieces
- `P`=Pawn, `N`=Knight, `B`=Bishop, `R`=Rook, `Q`=Queen, `K`=King
- Numbers = consecutive empty squares
- `/` = next rank (going from rank 8 down to rank 1)
- Starting FEN: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`

### SAN (Standard Algebraic Notation)
Human-readable move notation used in PGN and for display.

| Move | SAN | Meaning |
|------|-----|---------|
| Pawn e2→e4 | `e4` | Pawn to e4 (omit piece name for pawns) |
| Knight g1→f3 | `Nf3` | Knight to f3 |
| Bishop capture on c6 | `Bxc6` | Bishop takes c6 |
| Kingside castling | `O-O` | King castles short |
| Queenside castling | `O-O-O` | King castles long |
| Pawn promotion | `e8=Q` | Pawn promotes to queen |
| Check | `Nf3+` | Move gives check |
| Checkmate | `Qh7#` | Move gives checkmate |
| Disambiguation | `Nbd2` | Specifies which knight (the one on b-file) |

**Get SAN from python-chess:** `board.san(move)` — call BEFORE pushing the move.

### UCI (Universal Chess Interface)
Machine notation used between GUIs/engines. Format: `from_square + to_square [promotion_piece]`

| Example | Meaning |
|---------|---------|
| `e2e4` | Move from e2 to e4 |
| `g1f3` | Knight from g1 to f3 |
| `e7e8q` | Pawn promotion to queen |
| `e1g1` | Kingside castling (king moves 2 squares) |

**Convert UCI → SAN in python-chess:** `board.san(chess.Move.from_uci("e2e4"))`

---

## 2. Move / Position Concepts

### Centipawn (CP)
The standard unit of chess advantage. 100 centipawns = 1 pawn.

| Score | Interpretation |
|-------|----------------|
| 0 | Equal position |
| +50 (0.5) | Slight white advantage |
| +100 (1.0) | One pawn advantage for white |
| +300 (3.0) | Approximately a minor piece ahead |
| +500 (5.0) | Approximately a rook ahead |
| +900 (9.0) | Approximately a queen ahead |
| +3000 | Effectively won (used to represent forced mate) |
| Negative | Advantage for black |

**Perspective:** Stockfish's `score.relative` is always from the **side-to-move's perspective** (positive = good for the player whose turn it is). This perspective FLIPS after every move.

### Ply vs Move
- **Ply** = one half-move (one player's individual action). Move 1 has 2 plies (white ply + black ply).
- **Full move number** = increments after black plays. So: ply 0 = white move 1, ply 1 = black move 1, ply 2 = white move 2, etc.
- Formula: `move_number = (ply_index // 2) + 1`
- Formula: `colour = "white" if ply_index % 2 == 0 else "black"`

### Piece Values (approximate, in centipawns)
| Piece | Value |
|-------|-------|
| Pawn | 100 |
| Knight | 320 |
| Bishop | 330 |
| Rook | 500 |
| Queen | 900 |
| King | 20000 (not traded) |

---

## 3. ECO (Encyclopedia of Chess Openings)

ECO codes classify openings into 5 volumes (A–E) with 100 sub-codes each.

| Volume | Openings |
|--------|----------|
| A | Flank openings, Dutch, English |
| B | Semi-open games (Sicilian, Caro-Kann, Pirc) |
| C | Open games (1.e4 e5), French Defense |
| D | Closed/Semi-closed (Queen's Gambit, Slav) |
| E | Indian defenses (King's Indian, Nimzo-Indian) |

Examples:
- `B90` = Sicilian: Najdorf Variation
- `C60` = Ruy Lopez
- `D37` = Queen's Gambit Declined
- `A00` = Irregular/Unknown opening (no standard code match)

**Implementation:** Use a bundled ECO JSON dataset (free, ~200KB). Match the first N half-moves against the dataset. Return the deepest match. Package: `chess-openings` (npm) for frontend or a JSON file for backend.

---

## 4. Common Chess Tactics (for LLM commentary context)

When generating commentary, the LLM should recognise and name these patterns:

| Tactic | Description |
|--------|-------------|
| **Fork** | One piece attacks two opponent pieces simultaneously (common: knight fork) |
| **Pin** | Piece cannot move because it shields a more valuable piece behind it |
| **Absolute pin** | Piece pinned to the king — it is illegal to move it |
| **Relative pin** | Piece pinned to a valuable piece (queen/rook) — moving is legal but costly |
| **Skewer** | Like a pin but the more valuable piece is in front; it must move, exposing the piece behind |
| **Discovered attack** | Moving one piece reveals an attack by another piece behind it |
| **Discovered check** | Moving one piece reveals a check from a piece behind it |
| **Double check** | Both the moved piece AND the revealed piece give check simultaneously |
| **Deflection** | Forcing an opponent's defending piece to move away from its defensive duty |
| **Decoy** | Luring an opponent's piece to a worse square |
| **Zwischenzug** | An "in-between move" — instead of the expected reply, a stronger intermediate move is played first |
| **En passant** | Pawn captures a pawn that just moved 2 squares, by moving diagonally behind it |
| **Promotion** | Pawn reaching the last rank is exchanged for a queen (usually) or other piece |

---

## 5. Positional Concepts (for LLM commentary context)

| Concept | Description |
|---------|-------------|
| **Tempo** | A unit of time in chess; losing tempo = wasting a move |
| **Development** | Moving pieces from their starting squares to active positions |
| **Center control** | Controlling squares e4, d4, e5, d5 |
| **Pawn structure** | The arrangement of pawns; weaknesses include isolated pawns, doubled pawns, backward pawns |
| **Open file** | A file with no pawns; good for rooks |
| **Half-open file** | A file with only opponent pawns; good for rooks to pressure |
| **Outpost** | A square that cannot be attacked by opponent pawns; ideal for knights |
| **Space advantage** | Controlling more squares limits opponent's piece mobility |
| **King safety** | The king should be castled and behind a pawn shield in the opening/middlegame |
| **Initiative** | The side making threats forces the opponent to react, guiding the game |

---

## 6. Game Phases

| Phase | Typical Moves | Objectives |
|-------|--------------|------------|
| Opening | 1–15 | Develop pieces, castle, control center |
| Middlegame | 15–40 | Create and execute tactical/positional plans |
| Endgame | 40+ | King becomes active, pawn promotion fights |

---

## 7. Result Strings

Always use these exact strings in code and UI:

| PGN Result | Display | Meaning |
|------------|---------|---------|
| `1-0` | White wins | White won by checkmate, resignation, or timeout |
| `0-1` | Black wins | Black won by checkmate, resignation, or timeout |
| `1/2-1/2` | Draw | Stalemate, repetition, 50-move rule, agreement, insufficient material |
| `*` | Ongoing | Game not yet finished |

---

## 8. Sample Game (Reference)

The sample game used throughout this project's development:

```
[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.03.13"]
[White "Dchoupak1"]
[Black "SaiChandanSingh"]
[Result "0-1"]
[WhiteElo "1078"]
[BlackElo "1116"]
[TimeControl "600"]

1. e4 d5 2. e5 Nc6 3. d4 f6 4. Bb5 Bd7 5. Bxc6 Bxc6 6. e6 Qd6 7. Qg4 h5
8. Qh3 Nh6 9. Bxh6 Rxh6 10. Nc3 Qb4 11. O-O-O g5 12. a3 Qb6 13. Qd3 Bg7
14. Nf3 a6 15. h3 Bb5 16. Nxb5 axb5 17. g4 Qxe6 18. gxh5 Rxh5 19. Qg6+ Qf7
20. Qxf7+ Kxf7 21. h4 Bh6 22. hxg5 Rxh1 23. Rxh1 Bxg5+ 24. Nxg5+ fxg5
25. Rh7+ Kf6 26. c3 Rf8 27. Rh5 Kg6 28. Rh2 g4 29. Kc2 Kg5 30. Kb3 c6
31. Kb4 Kf4 32. Kc5 Ke4 33. Rh7 Rxf2 34. Rxe7+ Kd3 35. Rxb7 g3 36. Rg7 g2
37. Kxc6 Ke2 38. Kxb5 Kf1 39. a4 g1=Q 40. Rxg1+ Kxg1 41. a5 Rxb2+ 42. Kc6
Kf2 43. a6 Ke3 44. a7 Ra2 45. Kb7 Kd3 46. a8=Q Rxa8 47. Kxa8 Kxc3 48. Kb7
Kxd4 49. Kc6 Kc4 50. Kd6 d4 51. Ke5 d3 52. Ke4 Kc3 53. Ke3 Kc2 54. Kf2 d2 0-1
```

- 54 full moves (108 plies) — use for testing analysis pipeline
- Black wins by resignation after promoting pawn and reaching winning endgame
- Opening: Advance Variation of the Scandinavian-like structure after 1.e4 d5 2.e5

---

## 9. python-chess Quick Reference

```python
import chess
import chess.pgn
import io

# Parse PGN
pgn_io = io.StringIO(pgn_string)
game = chess.pgn.read_game(pgn_io)
board = game.board()

# Iterate moves
for move in game.mainline_moves():
    san = board.san(move)              # Get SAN BEFORE pushing
    colour = "white" if board.turn == chess.WHITE else "black"
    move_number = board.fullmove_number
    fen_before = board.fen()
    board.push(move)
    fen_after = board.fen()

# Board helpers
board.is_check()                       # Is current side in check?
board.is_checkmate()                   # Is current side checkmated?
board.is_game_over()                   # Any terminal state?
board.legal_moves                      # Generator of all legal chess.Move objects
board.piece_at(chess.E4)               # chess.Piece or None
board.attackers(chess.WHITE, chess.E5) # SquareSet of white pieces attacking e5

# Move helpers
move = chess.Move.from_uci("e2e4")
board.san(move)                        # "e4"
move.from_square                       # chess.E2
move.to_square                         # chess.E4
move.promotion                         # chess.QUEEN or None
```

---

## 10. Rules for Developer Agents

1. **PGN move numbers** are full moves. Ply index 0 = White's move 1. Ply index 1 = Black's move 1.
2. **FEN is position + context.** When passing FEN to Stockfish, it includes side-to-move, castling rights, and en-passant — never strip it to just piece placement.
3. **SAN must be computed BEFORE `board.push(move)`**. After pushing, `board.san()` returns the wrong result for the previous move.
4. **Centipawn scores from `score.relative` are always from the side-to-move's perspective.** After a white move, the score is from BLACK's perspective (it's black's turn). Negate when computing centipawn loss for the white player.
5. **Never use the LLM to classify moves.** Only Stockfish centipawn loss determines the category. The LLM only explains the category in natural language.
6. **`1/2-1/2` is a valid Python string** — use it exactly as shown. Don't simplify to `draw`.
