# Chess AI Agent — Data Models
> **Version:** 1.0 (Phase 1)
> Covers Python/Pydantic backend models and TypeScript frontend interfaces.

---

## 1. Python / Pydantic Models (`backend/models/`)

### 1.1 `MoveCategory` Enum
```python
from enum import Enum

class MoveCategory(str, Enum):
    BRILLIANT   = "Brilliant"
    GREAT       = "Great"
    BEST        = "Best"
    GOOD        = "Good"
    INACCURACY  = "Inaccuracy"
    MISTAKE     = "Mistake"
    BLUNDER     = "Blunder"
```

### 1.2 `MoveAnalysis` — per-move analysis result
```python
from pydantic import BaseModel
from typing import Optional, List

class CandidateMove(BaseModel):
    move_uci: str          # e.g. "e2e4"
    move_san: str          # e.g. "e4"
    score_cp: int          # centipawn score

class MoveAnalysis(BaseModel):
    move_index: int         # 0-based ply index
    move_number: int        # 1-based full move number (e.g. 1, 1, 2, 2, ...)
    colour: str             # "white" | "black"
    move_san: str           # Standard Algebraic Notation e.g. "Nf3"
    move_uci: str           # UCI notation e.g. "g1f3"
    fen_before: str         # FEN before this move
    fen_after: str          # FEN after this move

    # Stockfish results
    eval_before_cp: int     # Eval of position BEFORE move (from mover's perspective)
    eval_after_cp: int      # Eval of position AFTER move (from mover's perspective)
    cp_loss: int            # max(0, eval_before_cp - eval_after_cp)
    best_move_uci: str      # Engine's recommended move in UCI
    best_move_san: str      # Engine's recommended move in SAN
    top_candidates: List[CandidateMove]  # Top 3 moves

    # Classification
    category: MoveCategory
    category_symbol: str    # "!!", "!", "✓", "~", "?!", "?", "??"

    # LLM commentary
    comment: str            # LLM comment or fallback template
    comment_source: str     # "llm" | "fallback"

    # Optional
    opening_name: Optional[str] = None   # ECO name if applicable to this move
    opening_eco: Optional[str] = None    # ECO code e.g. "B90"
```

### 1.3 `GameMetadata` — from PGN headers
```python
class GameMetadata(BaseModel):
    event: Optional[str] = None
    site: Optional[str] = None
    date: Optional[str] = None
    white_player: str
    black_player: str
    white_elo: Optional[int] = None
    black_elo: Optional[int] = None
    result: str              # "1-0" | "0-1" | "1/2-1/2" | "*"
    time_control: Optional[str] = None
    termination: Optional[str] = None
    opening_name: Optional[str] = None
    opening_eco: Optional[str] = None
```

### 1.4 `GameSummary` — computed after full analysis
```python
class GameSummary(BaseModel):
    white_accuracy: float           # 0.0–100.0
    black_accuracy: float           # 0.0–100.0
    white_category_counts: dict[MoveCategory, int]
    black_category_counts: dict[MoveCategory, int]
    total_moves: int
    turning_point_move_index: Optional[int]  # move where eval swing was largest
```

### 1.5 `GameAnalysis` — full game stored in memory
```python
import uuid
from datetime import datetime

class AnalysisStatus(str, Enum):
    PENDING    = "pending"      # just uploaded, not yet started
    ANALYSING  = "analysing"    # Stockfish + LLM running
    COMPLETE   = "complete"     # all moves done
    FAILED     = "failed"       # fatal error

class GameAnalysis(BaseModel):
    game_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: AnalysisStatus = AnalysisStatus.PENDING
    metadata: GameMetadata
    pgn_raw: str
    moves: List[MoveAnalysis] = []       # grows as analysis progresses
    summary: Optional[GameSummary] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
```

---

## 2. API Request/Response Schemas (`backend/models/api.py`)

### 2.1 Upload
```python
# Request: multipart/form-data OR JSON
class UploadPGNRequest(BaseModel):
    pgn: str                # Full PGN text

# Response
class UploadPGNResponse(BaseModel):
    game_id: str
    status: AnalysisStatus
    total_moves: int
    metadata: GameMetadata
    message: str            # "Analysis started"
```

### 2.2 Game details
```python
class GameDetailResponse(BaseModel):
    game_id: str
    status: AnalysisStatus
    metadata: GameMetadata
    total_moves: int
    moves_analysed: int     # how many moves are done so far
    summary: Optional[GameSummary] = None
```

### 2.3 Full analysis
```python
class FullAnalysisResponse(BaseModel):
    game_id: str
    status: AnalysisStatus
    metadata: GameMetadata
    moves: List[MoveAnalysis]
    summary: Optional[GameSummary]
```

### 2.4 WebSocket message (streamed per move)
```python
class WSMoveResult(BaseModel):
    type: str = "move_result"   # message type discriminator
    game_id: str
    move_index: int             # which move just finished
    total_moves: int
    move: MoveAnalysis          # full move analysis object

class WSProgressUpdate(BaseModel):
    type: str = "progress"
    game_id: str
    moves_done: int
    total_moves: int
    status: AnalysisStatus

class WSComplete(BaseModel):
    type: str = "complete"
    game_id: str
    summary: GameSummary

class WSError(BaseModel):
    type: str = "error"
    game_id: str
    message: str
    move_index: Optional[int] = None
```

### 2.5 LLM providers
```python
class LLMProviderInfo(BaseModel):
    id: str                  # "ollama" | "huggingface" | "groq"
    name: str                # "Ollama (Local)"
    is_active: bool
    is_available: bool       # health check result
    model: str
    type: str                # "local" | "cloud"

class SwitchProviderRequest(BaseModel):
    provider_id: str         # "ollama" | "huggingface" | "groq"

class SwitchProviderResponse(BaseModel):
    active_provider: str
    status: str              # "switched" | "unavailable_fallback_active"
    message: str
```

### 2.6 Health check
```python
class HealthResponse(BaseModel):
    status: str              # "ok" | "degraded"
    stockfish: str           # "ok" | "error"
    stockfish_depth: int
    llm_provider: str        # active provider id
    llm_status: str          # "ok" | "unavailable"
    llm_fallback_active: bool
```

---

## 3. TypeScript Frontend Interfaces (`frontend/src/types/chess.ts`)

```typescript
// ── Enums ──────────────────────────────────────────────────
export type MoveCategory =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Blunder';

export type AnalysisStatus = 'pending' | 'analysing' | 'complete' | 'failed';
export type PlayerColour = 'white' | 'black';

// ── Move ──────────────────────────────────────────────────
export interface CandidateMove {
  move_uci: string;
  move_san: string;
  score_cp: number;
}

export interface MoveAnalysis {
  move_index: number;
  move_number: number;
  colour: PlayerColour;
  move_san: string;
  move_uci: string;
  fen_before: string;
  fen_after: string;

  eval_before_cp: number;
  eval_after_cp: number;
  cp_loss: number;
  best_move_uci: string;
  best_move_san: string;
  top_candidates: CandidateMove[];

  category: MoveCategory;
  category_symbol: string;

  comment: string;
  comment_source: 'llm' | 'fallback';

  opening_name?: string;
  opening_eco?: string;
}

// ── Game ──────────────────────────────────────────────────
export interface GameMetadata {
  event?: string;
  site?: string;
  date?: string;
  white_player: string;
  black_player: string;
  white_elo?: number;
  black_elo?: number;
  result: string;
  time_control?: string;
  termination?: string;
  opening_name?: string;
  opening_eco?: string;
}

export interface GameSummary {
  white_accuracy: number;
  black_accuracy: number;
  white_category_counts: Record<MoveCategory, number>;
  black_category_counts: Record<MoveCategory, number>;
  total_moves: number;
  turning_point_move_index?: number;
}

export interface GameState {
  game_id: string;
  status: AnalysisStatus;
  metadata: GameMetadata;
  moves: MoveAnalysis[];
  summary?: GameSummary;
  total_moves: number;
  moves_analysed: number;
}

// ── UI State ──────────────────────────────────────────────
export type PlaybackState = 'idle' | 'loaded' | 'analysing' | 'ready' | 'playing' | 'paused';

export interface UIState {
  currentMoveIndex: number;   // -1 = starting position
  playbackState: PlaybackState;
  playbackSpeedMs: number;    // milliseconds between auto-advance (default: 1000)
  showBestMoveArrow: boolean;
  showEvalBar: boolean;
}

// ── Category Config ────────────────────────────────────────
export interface CategoryConfig {
  label: string;
  symbol: string;
  colour: string;         // Tailwind text colour class
  bgColour: string;       // Tailwind bg colour class
  borderColour: string;   // Tailwind border colour class
  hexColour: string;      // For recharts / canvas use
}

export const CATEGORY_CONFIG: Record<MoveCategory, CategoryConfig> = {
  Brilliant:  { label: 'Brilliant',  symbol: '!!', colour: 'text-emerald-400',  bgColour: 'bg-emerald-400/10',  borderColour: 'border-emerald-400/50',  hexColour: '#34d399' },
  Great:      { label: 'Great',      symbol: '!',  colour: 'text-blue-400',     bgColour: 'bg-blue-400/10',     borderColour: 'border-blue-400/50',     hexColour: '#6c8efb' },
  Best:       { label: 'Best',       symbol: '✓',  colour: 'text-violet-400',   bgColour: 'bg-violet-400/10',   borderColour: 'border-violet-400/50',   hexColour: '#a78bfa' },
  Good:       { label: 'Good',       symbol: '~',  colour: 'text-cyan-400',     bgColour: 'bg-cyan-400/10',     borderColour: 'border-cyan-400/50',     hexColour: '#22d3ee' },
  Inaccuracy: { label: 'Inaccuracy', symbol: '?!', colour: 'text-yellow-400',   bgColour: 'bg-yellow-400/10',   borderColour: 'border-yellow-400/50',   hexColour: '#fbbf24' },
  Mistake:    { label: 'Mistake',    symbol: '?',  colour: 'text-orange-400',   bgColour: 'bg-orange-400/10',   borderColour: 'border-orange-400/50',   hexColour: '#fb923c' },
  Blunder:    { label: 'Blunder',    symbol: '??', colour: 'text-red-400',      bgColour: 'bg-red-400/10',      borderColour: 'border-red-400/50',      hexColour: '#f87171' },
};

// ── LLM Provider ──────────────────────────────────────────
export interface LLMProviderInfo {
  id: string;
  name: string;
  is_active: boolean;
  is_available: boolean;
  model: string;
  type: 'local' | 'cloud';
}

// ── WebSocket Messages ────────────────────────────────────
export type WSMessage =
  | { type: 'move_result';   game_id: string; move_index: number; total_moves: number; move: MoveAnalysis }
  | { type: 'progress';      game_id: string; moves_done: number; total_moves: number; status: AnalysisStatus }
  | { type: 'complete';      game_id: string; summary: GameSummary }
  | { type: 'error';         game_id: string; message: string; move_index?: number };
```

---

## 4. In-Memory Store (`backend/store/memory_store.py`)

```python
from typing import Dict, Optional
from threading import Lock
from models.game import GameAnalysis

class MemoryGameStore:
    """Thread-safe in-memory store for game analysis objects."""

    def __init__(self):
        self._store: Dict[str, GameAnalysis] = {}
        self._lock = Lock()

    def create(self, game: GameAnalysis) -> None:
        with self._lock:
            self._store[game.game_id] = game

    def get(self, game_id: str) -> Optional[GameAnalysis]:
        return self._store.get(game_id)

    def update(self, game: GameAnalysis) -> None:
        with self._lock:
            self._store[game.game_id] = game

    def delete(self, game_id: str) -> None:
        with self._lock:
            self._store.pop(game_id, None)

    def append_move(self, game_id: str, move: MoveAnalysis) -> None:
        """Thread-safe append of a single move result (called from analysis thread)."""
        with self._lock:
            if game_id in self._store:
                self._store[game_id].moves.append(move)

# Singleton — imported and shared across routers via FastAPI dependency injection
game_store = MemoryGameStore()
```

---

*End of data-models.md — v1.0*
