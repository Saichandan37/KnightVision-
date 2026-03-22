# Chess AI Analysis Agent — Project Context
> **Version:** 1.0 (Phase 1)
> **Owner:** Sai Chandan
> **Stack:** React + Vite + Tailwind CSS (FE) · FastAPI + Python (BE) · Stockfish (Chess Engine) · Pluggable LLM (Commentary)
> **Status:** Pre-development — BMAD handoff document

---

## 1. Project Summary

A web application that accepts a chess game in PGN format, analyses every move using the Stockfish chess engine, classifies each move into one of 7 quality categories, generates a natural-language LLM commentary for each move, and presents the full game as an interactive, animated board review with playback controls.

The app targets club-level chess players (Elo 800–1500) who want to understand their mistakes and learn from stronger moves without paying for Chess.com's premium analysis.

**Phase 1 scope:** Single-game PGN upload → full analysis → interactive review board. No auth, no database, no user accounts.

---

## 2. Core Principles

- **Stockfish is the source of truth** for all evaluation numbers and best-move suggestions. The LLM only provides human-readable commentary — it never evaluates positions.
- **LLM is optional and fallback-safe.** If the LLM is offline, unavailable, or slow, the app still works fully — template comments fill in automatically.
- **Analysis is pre-computed on upload**, not on-demand during playback. This ensures zero lag during the review experience.
- **LLM provider is runtime-switchable** via a settings panel — no server restart required.
- **No database or authentication** in Phase 1. All state is in-memory per session.

---

## 3. User Stories (Phase 1)

| ID | As a user I want to… | So that… |
|----|----------------------|----------|
| US-01 | Upload a PGN file from my device | I can start analysing my game |
| US-02 | See my game played move-by-move on a chess board | I can follow the game visually |
| US-03 | Control playback with Previous / Play / Pause / Next buttons | I can review at my own pace |
| US-04 | Use ← → arrow keys and Space bar for navigation | I can review without touching the mouse |
| US-05 | Swipe left/right on mobile to navigate moves | I can review on my phone |
| US-06 | See each move classified with a colour-coded badge | I can quickly spot blunders and brilliant moves |
| US-07 | Read a short AI comment for each move | I can understand why a move was good or bad |
| US-08 | See the eval bar update as moves are played | I can track who had the advantage at each point |
| US-09 | See a best-move arrow when I pause on a move | I can see what the engine recommended instead |
| US-10 | See my accuracy score (White and Black) | I can measure my overall game quality |
| US-11 | See the evaluation graph for the whole game | I can identify the turning point of the game |
| US-12 | Switch the LLM provider from a settings panel | I can use offline Ollama or cloud Groq depending on my setup |
| US-13 | See the opening name detected from my moves | I can learn opening names |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (React + Vite + Tailwind CSS)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ PGN Upload   │ │ Chess Board  │ │ Analysis Panel       │ │
│  │ Panel        │ │ (react-chess │ │ (move list, badges,  │ │
│  │              │ │  board)      │ │  comments, eval bar) │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Playback     │ │ Eval Graph   │ │ Settings Panel       │ │
│  │ Controls     │ │ (recharts)   │ │ (LLM switcher)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTP REST + WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│  BACKEND  (FastAPI / Python 3.11+)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ PGN Parser   │ │ Analysis     │ │ WebSocket Hub        │ │
│  │ (python-     │ │ Orchestrator │ │ (streams results     │ │
│  │  chess)      │ │              │ │  as computed)        │ │
│  └──────────────┘ └──────┬───────┘ └──────────────────────┘ │
│  ┌──────────────┐         │         ┌──────────────────────┐ │
│  │ Move         │         │         │ LLM Adapter Layer    │ │
│  │ Classifier   │         │         │ (Ollama/HF/Groq)     │ │
│  └──────────────┘         │         └──────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │  UCI Protocol (subprocess)
┌───────────────────────────▼─────────────────────────────────┐
│  STOCKFISH BINARY  (local, no network, no cost, no limits)  │
│  · Centipawn evaluation per position                        │
│  · Best move + top 3 candidate lines                        │
│  · Configurable depth (default: 18)                         │
└─────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

1. **WebSocket for analysis streaming** — backend pushes each move's result as soon as Stockfish + LLM finishes it. Frontend shows a progress bar during analysis and populates the move list incrementally.
2. **REST for upload and cached results** — POST /api/games/upload returns a game_id immediately; subsequent GET uses the cached in-memory analysis.
3. **LLM Adapter Pattern** — single abstract base class `BaseLLMProvider` with `generate(prompt) → str`. Concrete subclasses: `OllamaProvider`, `HuggingFaceProvider`, `GroqProvider`. Active provider is stored in a runtime-mutable app state object (not config file), so it switches without restart.
4. **In-memory game store** — Python dict keyed by game_id (UUID4). Analysis stored per game. No persistence needed in Phase 1.
5. **Background task for analysis** — FastAPI `BackgroundTasks` runs Stockfish + LLM analysis after upload returns. WebSocket connection waits and receives results as they arrive.

---

## 5. Chess Analysis Engine — Stockfish

### Licensing & Cost
- **License:** GPL-3.0 (open source). Free to use in any application including commercial ones.
- **Rate limits:** NONE. It is a local binary. No network calls, no API keys, no quotas.
- **Binary distribution:** Use the `stockfish` PyPI package (auto-downloads correct binary for platform) OR specify a custom binary path in `config.yaml`.
- **Recommended depth:** 18 (good accuracy, ~50–200ms per position on modern hardware). Configurable.

### What Stockfish provides per move
- `score_cp`: Centipawn evaluation of the resulting position (from the perspective of the side that just moved)
- `best_move`: Engine's recommended move in UCI notation (e.g. `e2e4`)
- `best_move_san`: Best move in Standard Algebraic Notation (e.g. `e4`) — converted by python-chess
- `pv`: Principal variation (top line of play), up to 5 moves deep
- `top_3_moves`: Top 3 candidate moves with their scores (MultiPV mode)

### Centipawn Loss Calculation
```
cp_loss = max(0, eval_before_move - eval_after_move)
```
Where both evals are from the perspective of the player who just moved. A cp_loss of 0 means the best move was played.

---

## 6. Move Classification System

| Category | Symbol | CP Loss Range | Colour | Description |
|----------|--------|---------------|--------|-------------|
| Brilliant | !! | 0, sacrifice/tactic | `#34d399` (green) | Only best move AND involves material sacrifice or deep combination |
| Great | ! | 0–5 | `#6c8efb` (blue) | Excellent move, significantly better than alternatives |
| Best | ✓ | 0–10 | `#a78bfa` (purple) | Engine's top choice, objectively optimal |
| Good | ~ | 10–20 | `#22d3ee` (cyan) | Solid move, keeps position stable |
| Inaccuracy | ?! | 20–50 | `#fbbf24` (yellow) | Slightly suboptimal, minor positional cost |
| Mistake | ? | 50–150 | `#fb923c` (orange) | Clear error giving opponent meaningful advantage |
| Blunder | ?? | 150+ | `#f87171` (red) | Severe error, significant material or positional loss |

**Brilliant detection logic:**
1. `cp_loss == 0` (engine's top move was played)
2. AND the move involves a piece sacrifice (played piece destination has lower material value than captured/threatened piece, OR piece moves to undefended square with gain expected only deeper)
3. Implementation: compare material on board before/after + check if best_move matches played move + check if piece is "given away" temporarily

**Thresholds** are stored in `config.yaml` as `classifier.thresholds` and can be changed without code edits.

---

## 7. Accuracy Score

**Formula:**
```
accuracy_percent = 100 - (average_cp_loss / MAX_CP_LOSS_FOR_SCALE * 100)
```
Where `MAX_CP_LOSS_FOR_SCALE = 300` (calibrated to match Chess.com's scale approximately).

Clamped to range `[0, 100]`.

**Performance impact:** Zero additional Stockfish calls. Accuracy is computed as a simple average of all `cp_loss` values collected during analysis. Adds < 1ms to analysis. **Include it — no lag risk.**

White accuracy and Black accuracy are computed separately and shown in the game summary header.

---

## 8. LLM Commentary System

### Architecture: Adapter Pattern
```python
class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    async def health_check(self) -> bool: ...
```

### Supported Providers (Phase 1)

| Provider | Type | Cost | Rate Limit | Recommended Model |
|----------|------|------|------------|-------------------|
| Ollama | Local/Offline | Free forever | None | `llama3.1:8b` |
| Groq | Cloud | Free tier | 30 req/min, 14,400/day | `llama-3.1-8b-instant` |
| HuggingFace | Cloud | Free tier | Varies | `HuggingFaceH4/zephyr-7b-beta` |

All three use OpenAI-compatible REST APIs — the same `httpx` client code works for all.

### LLM Prompt Template
```
You are a chess coach reviewing a game. Analyse this specific move and give a 1-2 sentence comment suitable for a club-level player (Elo 800-1500). Be specific about the chess idea — mention tactics, positional concepts, or mistakes. Do not start with "This move".

Move details:
- Move number: {move_number} ({colour} to move)
- Move played: {move_san}
- Position (FEN): {fen}
- Engine evaluation before: {eval_before} centipawns
- Engine evaluation after: {eval_after} centipawns
- Centipawn loss: {cp_loss}
- Category: {category} ({symbol})
- Engine's best move was: {best_move_san}
- Opening: {opening_name} (if applicable)

Comment:
```

### Fallback Templates (LLM unavailable)
```python
FALLBACK_COMMENTS = {
    "Brilliant": "A brilliant sacrifice! The engine confirms this is the only winning move in a deeply tactical position.",
    "Great": "An excellent move that finds the strongest continuation in this position.",
    "Best": "The engine's top choice — objectively the best move available here.",
    "Good": "A solid move that maintains the position without giving away any advantage.",
    "Inaccuracy": f"A slight inaccuracy. The stronger option was {best_move_san}, which keeps a better position.",
    "Mistake": f"A mistake that gives the opponent an advantage. {best_move_san} was the correct approach.",
    "Blunder": f"A serious blunder! {best_move_san} was necessary to stay in the game.",
}
```

---

## 9. Frontend Component Architecture

```
App
├── UploadView              # Shown before game is loaded
│   ├── PGNDropZone         # Drag-drop + file picker
│   └── PGNTextInput        # Paste PGN directly
│
└── ReviewView              # Shown after game is loaded
    ├── GameHeader           # White vs Black, Elo, result, date, accuracy scores
    ├── OpeningBadge         # "Sicilian Defense: Najdorf Variation"
    ├── MainLayout           # CSS Grid: board | analysis panel
    │   ├── BoardSection
    │   │   ├── EvalBar          # Vertical white/black eval bar (left of board)
    │   │   ├── ChessBoard       # react-chessboard, animated, best-move arrow
    │   │   └── PlaybackControls # ⏮ ◀ ⏸/▶ ▶ ⏭ + move counter
    │   └── AnalysisPanel
    │       ├── MoveList         # Scrollable, colour-coded by category
    │       └── MoveDetail       # Current move: badge, eval, comment, top moves
    ├── EvalGraph            # Full-width line chart below board
    ├── AnalysisStatus       # Progress bar during analysis ("Analysing move 12/54...")
    └── SettingsPanel        # Drawer/modal: LLM provider switcher, Stockfish depth
```

### Responsive Layout

**Desktop (≥ 1024px):** Board (left, 60%) + Analysis Panel (right, 40%), side by side. Eval bar left of board. Eval graph below both.

**Tablet (640px–1023px):** Board full width, analysis panel below, collapsed move list with expand button.

**Mobile (< 640px):** Board fills screen width (square). Compact controls below. Swipe left/right on board for prev/next. Analysis panel is a bottom sheet that slides up.

---

## 10. Playback Engine (Frontend State Machine)

```
States: IDLE → LOADED → ANALYSING → READY → PLAYING → PAUSED

PLAYING:
  - setInterval(1000ms) advances currentMoveIndex by 1
  - Stops automatically at last move (transitions to PAUSED)
  - Any user action (click prev/next, keyboard) cancels the interval

PAUSED:
  - Best-move arrow rendered on board
  - Move detail panel shows full comment

Keyboard bindings:
  ArrowRight / ArrowLeft → next / previous move
  Space                  → toggle PLAYING / PAUSED
  Home                   → jump to move 0
  End                    → jump to last move
```

---

## 11. Opening Detection

- Use the free `chess-openings` npm package OR a bundled ECO JSON (downloaded once, ~200KB).
- Match the first N half-moves of the game against the ECO database.
- Return the deepest matching opening name and ECO code.
- Display as a badge in the game header: `B90 · Sicilian: Najdorf`
- Falls back gracefully to `"Unknown Opening"` if no match.

---

## 12. Configuration (`config.yaml`)

```yaml
stockfish:
  binary_path: null           # null = use stockfish PyPI auto-download
  depth: 18                   # Analysis depth (10–22 recommended)
  threads: 2                  # CPU threads for Stockfish
  multipv: 3                  # Number of top moves to return

classifier:
  thresholds:
    brilliant_max_cp_loss: 0   # Must also pass brilliant_detection logic
    great_max_cp_loss: 5
    best_max_cp_loss: 10
    good_max_cp_loss: 20
    inaccuracy_max_cp_loss: 50
    mistake_max_cp_loss: 150
    # blunder = anything above mistake threshold

llm:
  active_provider: "ollama"    # ollama | huggingface | groq
  timeout_seconds: 10          # Max wait for LLM response before fallback
  ollama:
    base_url: "http://localhost:11434"
    model: "llama3.1:8b"
  groq:
    api_key: "${GROQ_API_KEY}" # From .env file
    model: "llama-3.1-8b-instant"
  huggingface:
    api_key: "${HF_API_KEY}"   # From .env file
    model: "HuggingFaceH4/zephyr-7b-beta"

server:
  host: "0.0.0.0"
  port: 8000
  cors_origins:
    - "http://localhost:5173"   # Vite dev server
    - "http://localhost:4173"   # Vite preview

accuracy:
  max_cp_scale: 300            # CP loss at which accuracy = 0%
```

---

## 13. Project Directory Structure

```
chess-ai-agent/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Pydantic Settings, loads config.yaml
│   ├── config.yaml                # User-editable configuration
│   ├── .env.example               # API key template
│   ├── routers/
│   │   ├── games.py               # POST /api/games/upload, GET /api/games/{id}
│   │   ├── analysis.py            # GET /api/games/{id}/analysis
│   │   ├── websocket.py           # WS /ws/games/{id}/analysis
│   │   └── llm.py                 # GET/POST /api/llm/providers
│   ├── services/
│   │   ├── pgn_parser.py          # python-chess PGN parsing
│   │   ├── stockfish_service.py   # Stockfish subprocess management
│   │   ├── move_classifier.py     # cp_loss → category mapping
│   │   ├── analysis_orchestrator.py  # Coordinates Stockfish + LLM per move
│   │   └── opening_detector.py    # ECO code lookup
│   ├── llm/
│   │   ├── base.py                # BaseLLMProvider ABC
│   │   ├── ollama_provider.py
│   │   ├── groq_provider.py
│   │   ├── huggingface_provider.py
│   │   ├── fallback.py            # Template-based fallback comments
│   │   └── provider_registry.py   # Runtime provider switching
│   ├── models/
│   │   ├── game.py                # Pydantic models: Game, Move, Analysis
│   │   └── api.py                 # Request/Response schemas
│   └── store/
│       └── memory_store.py        # In-memory game_id → GameAnalysis dict
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   ├── PGNDropZone.tsx
│   │   │   │   └── PGNTextInput.tsx
│   │   │   ├── board/
│   │   │   │   ├── ChessBoard.tsx
│   │   │   │   ├── EvalBar.tsx
│   │   │   │   └── BestMoveArrow.tsx
│   │   │   ├── controls/
│   │   │   │   └── PlaybackControls.tsx
│   │   │   ├── analysis/
│   │   │   │   ├── MoveList.tsx
│   │   │   │   ├── MoveListItem.tsx
│   │   │   │   ├── MoveDetail.tsx
│   │   │   │   └── CategoryBadge.tsx
│   │   │   ├── graph/
│   │   │   │   └── EvalGraph.tsx
│   │   │   ├── header/
│   │   │   │   ├── GameHeader.tsx
│   │   │   │   └── OpeningBadge.tsx
│   │   │   └── settings/
│   │   │       └── SettingsPanel.tsx
│   │   ├── hooks/
│   │   │   ├── usePlayback.ts     # Playback state machine + keyboard bindings
│   │   │   ├── useAnalysis.ts     # WebSocket connection + analysis state
│   │   │   ├── useSwipe.ts        # Touch swipe detection for mobile
│   │   │   └── useSettings.ts     # LLM provider + settings state
│   │   ├── store/
│   │   │   └── gameStore.ts       # Zustand or React context game state
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance with base URL
│   │   │   └── endpoints.ts       # Typed API call functions
│   │   ├── types/
│   │   │   └── chess.ts           # TypeScript interfaces
│   │   └── utils/
│   │       ├── categoryConfig.ts  # Category → colour/label/symbol mapping
│   │       └── openingDetector.ts # Client-side ECO lookup
│
├── docker-compose.yml             # Backend + Ollama containers
├── README.md
└── .gitignore
```

---

## 14. Key Dependencies

### Backend
```
fastapi>=0.111
uvicorn[standard]>=0.29
python-chess>=1.10
stockfish>=3.28         # Auto-downloads Stockfish binary
httpx>=0.27             # Async HTTP for LLM providers
pydantic>=2.7
pydantic-settings>=2.3
pyyaml>=6.0
python-multipart>=0.0.9 # For file upload
```

### Frontend
```
react + react-dom (18.x)
typescript
vite (5.x)
tailwindcss (3.x)
react-chessboard (4.x)
chess.js (1.x)
recharts (2.x)
axios (1.x)
zustand (4.x)         # Lightweight state management
```

---

## 15. Phase 2 Features (Backlog — Design for Extensibility)

These are NOT in Phase 1 but the architecture should not block them:

- Multi-game PGN files (multiple games in one upload)
- Export analysis as PDF report
- Side-by-side game comparison
- Custom position analysis (paste FEN)
- Endgame tablebase integration (Syzygy)
- User-configurable LLM prompt template
- Share analysis via URL (requires adding a DB/Redis layer)
- Engine vs Engine visualisation mode

---

## 16. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Analysis time (54-move game, depth 18) | < 60 seconds on modern laptop |
| Board render / move animation | < 100ms |
| WebSocket first result delivery | < 3 seconds after upload |
| Mobile board minimum size | 300×300px |
| LLM timeout (before fallback triggers) | 10 seconds |
| Browser support | Chrome 90+, Firefox 90+, Safari 15+, Mobile Safari |

---

*End of project-context.md — v1.0*
