---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-03-22'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-KnightVision--2026-03-22.md
  - docs/project-context.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/llm-provider-spec.md
workflowType: 'architecture'
project_name: 'KnightVision'
user_name: 'Sai Chandan'
date: '2026-03-22'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

> **FR Numbering Notice:** FR numbers referenced in this architecture document (e.g. FR9–FR20, FR29–FR40) follow the architecture's own capability-area grouping and **do not match the FR numbers in the PRD**. The PRD (`prd.md`) is the authoritative source for FR definitions. When a dev agent cross-references architecture and PRD, use capability area names (e.g. "Chess Analysis Engine", "Game Review Interface") to locate the correct PRD requirements — not FR numbers alone.

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
50 FRs across 8 capability areas:
- **Game Ingestion (FR1–FR8):** PGN upload (file + paste + drag-drop), client-side chess.js validation before upload, server-side python-chess parsing, background task kick-off, 202 Accepted response with game_id
- **Chess Analysis Engine (FR9–FR20):** Stockfish at depth 18 via UCI subprocess, centipawn eval per position, perspective-normalized cp_loss, 7-tier move classification with configurable thresholds, Brilliant detection (cp_loss == 0 + sacrifice logic), accuracy scores (White + Black), opening ECO detection via bundled JSON
- **LLM Commentary (FR21–FR28):** Pluggable provider (Ollama/Groq/HuggingFace), runtime switching via POST /api/llm/provider, health check per provider, 10s timeout → template fallback, comment_source field ("llm" | "fallback")
- **Game Review Interface (FR29–FR40):** Animated react-chessboard, vertical eval bar, best-move arrow (toggleable), scrollable colour-coded move list, move detail card (badge + eval + comment + top 3), playback controls (⏮ ◀ ⏸/▶ ▶ ⏭), keyboard nav (← → Space Home End), game header (player names, Elo, result, date), accuracy in header
- **Mobile & Accessibility (FR41–FR44):** Swipe left/right on board for prev/next, responsive layout (Desktop grid / Tablet stacked / Mobile bottom-sheet), min 300×300px board, WCAG 2.1 AA
- **Analysis Resilience:** 30s dead-man timeout on frontend (stalled WS detection), 10s heartbeat from backend, non-fatal per-move errors (fallback "Good" + template comment), WebSocket reconnect logic
- **Deployment & Distribution (FR45–FR47):** Docker Compose single-command spin-up (backend + Ollama sidecar), hosted instance on Railway/Render with Groq default, README with clone → configure → run
- **Opening Detection (FR49–FR50):** ECO code + name from bundled ~200KB JSON, deepest-match algorithm, graceful fallback to "Unknown Opening"

**Non-Functional Requirements:**

| Requirement | Target |
|---|---|
| Analysis time (54-move game, depth 18) | < 60s |
| Board render / move animation | < 100ms |
| WebSocket first result delivery | < 3s after upload |
| LLM timeout before fallback | 10s |
| Mobile board minimum | 300×300px |
| Browser support | Chrome 90+, Firefox 90+, Safari 15+, Mobile Safari |
| Accessibility | WCAG 2.1 AA |

**Scale & Complexity:**

- Primary domain: Full-stack web — offline-capable, dual deployment targets
- Complexity level: **Medium** — real-time streaming, subprocess management, 3 LLM integrations, 6-state frontend machine
- Single-user-per-game concurrency model; no multi-tenancy in Phase 1
- Estimated architectural components: 12 backend services/modules, 15 frontend components, 4 LLM provider classes, 5 REST endpoints, 1 WebSocket endpoint

### Technical Constraints & Dependencies

**Pre-committed technical decisions (from project docs):**
1. **LLM Adapter Pattern** — BaseLLMProvider ABC with concrete OllamaProvider, GroqProvider, HuggingFaceProvider, FallbackProvider; ProviderRegistry handles runtime switching and timeout+fallback in one method
2. **WebSocket for analysis streaming** — backend pushes each MoveAnalysis as Stockfish+LLM completes it; not polling
3. **REST 202 Accepted for upload** — POST returns game_id immediately; analysis runs in FastAPI BackgroundTasks
4. **In-memory game store** — Python dict + threading.Lock, UUID-keyed, no persistence
5. **Pre-compute on upload, replay on playback** — frontend state machine replays stored data; no on-demand re-analysis
6. **config.yaml for all thresholds** — Stockfish depth, classifier thresholds, LLM timeout all configurable without code changes

**Hard dependencies:**
- `stockfish` PyPI package (subprocess binary management)
- `python-chess` (PGN parsing, SAN/UCI conversion, FEN generation)
- `react-chessboard` (board rendering with arrow support)
- `chess.js` (client-side PGN validation)
- Bundled ECO JSON (~200KB, offline, zero API cost)

**External integrations (optional/switchable):**
- Ollama local server (localhost:11434) — offline capable
- Groq API (api.groq.com) — free tier, 14,400 req/day
- HuggingFace Inference API — free tier, variable limits

### Cross-Cutting Concerns Identified

1. **Concurrency boundary (critical):** FastAPI async event loop + asyncio LLM calls + blocking Stockfish subprocess + threading.Lock on game store. The analysis orchestrator must run Stockfish in a thread pool executor to avoid blocking the event loop.

2. **Timeout chain (three layers):** LLM 10s (ProviderRegistry asyncio.wait_for) → backend analysis continues with fallback; backend heartbeat every 10s → keeps WS alive; frontend dead-man 30s (no message received) → show stall error + offer retry.

3. **Error isolation per move:** A Stockfish subprocess crash or LLM error on move N must not abort moves N+1 through end. Pipeline continues; failed move gets category "Good" and fallback comment.

4. **Centripawn perspective normalization:** eval_after_cp from Stockfish is always from the side to move next — must be negated before computing cp_loss. This is the highest-risk silent bug: wrong sign → all classifications silently wrong, no error thrown. Requires explicit unit test with known game positions as acceptance gate.

5. **WebSocket lifecycle coordination:** Client must connect AFTER receiving game_id from upload response. Backend must buffer/replay any moves computed before client connected (late-join case). Disconnect on `complete` message; reconnect with exponential backoff on unexpected drop.

6. **CORS dual-origin:** Dev (localhost:5173) and prod (Railway/Render domain) must both be in allow-list. Configured via config.yaml `server.cors_origins`, injected at startup — not hardcoded.

7. **Type contract enforcement:** API contract is snake_case JSON; Pydantic on backend enforces schema; TypeScript interfaces on frontend must mirror exactly. Any mismatch is a runtime silent failure (field undefined, not an error).

8. **Docker layer design:** Ollama sidecar in Docker Compose must have model pre-pulled (not downloaded at runtime) or the first analysis will time out. Startup healthcheck on Ollama container before backend starts.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — React SPA frontend + FastAPI backend, offline-capable, dual deployment (Docker Compose self-host + Railway/Render hosted).

### Stack Pre-Committed (from project-context.md)

The technology stack is fully specified in project documentation. Starter template evaluation confirms these choices and resolves version decisions.

### Frontend Starter: Vite + React + TypeScript

**Initialization Command:**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install tailwindcss@3 @tailwindcss/vite postcss autoprefixer
npm install "react-chessboard@4" chess.js recharts axios "zustand@4"
```

**Rationale for Tailwind 3.x (not 4.x):**
Tailwind 4 introduced a CSS-first config paradigm (no `tailwind.config.js`) that is a breaking change. The VS Code extension, most UI component references, and the react-chessboard ecosystem use Tailwind 3 conventions. For a focused portfolio project targeting stability, Tailwind 3.x is the correct choice.

**Architectural Decisions Provided by Starter:**

- **Language & Runtime:** TypeScript strict mode, ES2022 target, Vite 8.x build
- **Styling:** Tailwind CSS 3.x with PostCSS — `tailwind.config.js` config pattern
- **Build Tooling:** Vite 8.x — HMR, tree-shaking, separate dev/preview/build modes
- **Testing Framework:** Not included by default — add Vitest for unit tests
- **Code Organization:** `src/components/`, `src/hooks/`, `src/types/`, `src/api/`, `src/store/` (per project-context.md)
- **Development Experience:** HMR, TypeScript IntelliSense, `VITE_API_BASE_URL` env var for API base URL

**Key Library Versions (pinned):**
```
react@18, react-dom@18
react-chessboard@4.x
chess.js@1.4.0
recharts@2.x
axios@1.x
zustand@4
```

### Backend Starter: FastAPI + Uvicorn

**Initialization:**
```bash
mkdir backend && cd backend
python -m venv .venv && source .venv/bin/activate
pip install "fastapi[standard]>=0.135" "uvicorn[standard]" \
  "chess>=1.11" stockfish httpx pydantic-settings pyyaml \
  python-multipart
```

**⚠️ Critical package rename:** `python-chess` is now published as `chess` on PyPI. Use `chess>=1.11` in requirements.txt — `import chess` remains unchanged in code.

**Architectural Decisions Provided:**

- **Language & Runtime:** Python 3.11+, async-first with asyncio
- **API Framework:** FastAPI 0.135.1 — OpenAPI docs auto-generated at `/docs`
- **ASGI Server:** Uvicorn with standard extras (websockets, httptools)
- **Validation:** Pydantic v2 (bundled with FastAPI[standard])
- **Config:** pydantic-settings for environment variable injection into config.yaml values
- **Testing:** Not included — add pytest + pytest-asyncio

### Initialization Note

Project initialization (running both commands above and establishing directory structure per project-context.md Section 13) should be the **first implementation story**.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Stockfish concurrency model — blocks analysis pipeline implementation
- WebSocket late-join replay — blocks WS handler implementation
- Centripawn test gate — blocks acceptance of analysis correctness
- Logging standard — applies from first line of backend code

**Deferred Decisions (Post-Phase 1):**
- Full PGN smoke test (integration) — deferred to Phase 1.5 when pipeline is stable
- Log aggregation / structured dashboard — Phase 2 instrumentation

---

### Data Architecture

**In-memory game store — confirmed Phase 1 scope.**
- `MemoryGameStore`: Python dict keyed by UUID4 game_id, protected by `threading.Lock`
- `GameAnalysis.moves: List[MoveAnalysis]` grows as analysis progresses — this list is the source of truth for both the WebSocket stream and the late-join replay buffer
- No database, no persistence, no cache layer in Phase 1
- Phase 2 extensibility: the `MemoryGameStore` interface (create/get/update/delete/append_move) is the contract; swapping to a Redis or PostgreSQL backend requires only a new implementation of the same interface

---

### Authentication & Security

**None — explicit Phase 1 decision.**
- No auth, no user accounts, no sessions
- CORS is the only security boundary: `allow_origins` loaded from `config.yaml server.cors_origins` at startup — never hardcoded
- Two required origins in config: `http://localhost:5173` (Vite dev) + Railway/Render production domain
- `.env` file holds API keys (GROQ_API_KEY, HF_API_KEY) — never committed to git; `.env.example` committed as template

---

### API & Communication Patterns

**REST + WebSocket — confirmed.**

REST endpoints handle upload (202 Accepted, returns game_id immediately) and cached retrieval (GET /api/games/{id}/analysis, useful once status=complete). WebSocket handles streaming.

**WebSocket Late-Join Replay (Decision 2 — Option A):**

On WS connect, the backend immediately replays all moves already in `game.moves` as `move_result` messages before resuming the live stream:

```python
# On WS connect — replay buffered moves first
for move in game.moves:
    await websocket.send_json({
        **WSMoveResult(game_id=game_id, ..., move=move).dict(),
        "buffered": True   # ← frontend skips animation for catch-up moves
    })
# Then continue streaming live moves as they complete
```

The `buffered: true` flag is mandatory. Without it, replaying 30 pre-computed moves with 150ms animation each = 4.5 second catch-up delay. With it, the frontend populates the board and move list instantly, then resumes normal animation from the live stream. This flag must be typed in the frontend `WSMessage` discriminated union.

**Error handling standard:**
- Per-move try/except in `analysis_orchestrator.py` — Stockfish or LLM failure on move N does not abort N+1 through end
- Failed move → `category: "Good"`, `comment_source: "fallback"`, `comment: fallback template`
- Fatal errors (PGN parse failure, Stockfish binary not found) → HTTP 400/500 at upload; WS `error` message type for mid-analysis crashes
- FastAPI standard error format: `{"detail": "..."}` for all HTTP errors

---

### Frontend Architecture

**State management: Zustand — confirmed.**
- Single `gameStore.ts` for game state (game_id, status, moves[], summary, metadata)
- Separate custom hooks own their concerns:
  - `usePlayback.ts` — 6-state machine (IDLE → LOADED → ANALYSING → READY → PLAYING → PAUSED), setInterval, keyboard bindings
  - `useAnalysis.ts` — WebSocket lifecycle, buffered replay handling, dead-man 30s timeout
  - `useSwipe.ts` — touch event detection for mobile prev/next
  - `useSettings.ts` — active LLM provider, health check polling

**Buffered replay in `useAnalysis.ts`:**
When a `move_result` message arrives with `buffered: true`, the hook appends to the moves array without triggering animation. When `buffered: false` (live stream), normal animated rendering applies. The hook tracks `isReplaying: boolean` to gate animation during catch-up.

**Component architecture:** per project-context.md Section 9 — confirmed. No changes.

**Bundle:** Vite 8.x default config. No custom chunking needed for Phase 1 scale. `VITE_API_BASE_URL` env var controls API base (dev: localhost:8000, prod: Railway/Render URL).

---

### Infrastructure & Deployment

**Docker Compose (self-host):**
- Services: `backend` (FastAPI) + `ollama` (LLM sidecar)
- **Ollama model pre-pull is mandatory** — the `ollama` container must pull `llama3.1:8b` during image build or via an `entrypoint` script, not at first analysis request. First analysis will time out (model download >> 10s LLM timeout) if model is not pre-loaded.
- Startup order: `backend` depends on `ollama` healthcheck passing (`GET /api/tags` returns 200)
- Healthcheck on backend container: `GET /api/health` returns `status: ok`

**Hosted instance (Railway/Render):**
- Backend only (no Ollama sidecar — Railway doesn't support GPU for free tier)
- Groq as default LLM provider (`config.yaml: llm.active_provider: groq`)
- `GROQ_API_KEY` injected as Railway/Render environment variable
- Frontend deployed separately (Netlify/Vercel static) or served from backend static files

---

### Concurrency Model

**Stockfish concurrency — Decision 1: asyncio.to_thread() — Project Standard.**

```python
# analysis_orchestrator.py — ALWAYS use this pattern
result = await asyncio.to_thread(stockfish.analyse, board, chess.engine.Limit(depth=18))
```

**Project rule (applies to all implementation stories):**
> Always use `asyncio.to_thread()` to call Stockfish — never call it directly in an async function.

Rationale: Stockfish subprocess calls block. Calling them directly in an async function blocks the entire event loop, freezing all WebSocket connections and REST handlers. `asyncio.to_thread()` is Python 3.9+ built-in, requires no executor setup, and is the modern idiomatic form.

**Full concurrency model:**
```
FastAPI async event loop
  ├── REST handlers (async def) — non-blocking
  ├── WebSocket handlers (async def) — non-blocking
  ├── LLM calls (await httpx.AsyncClient.post) — async HTTP, non-blocking
  └── Stockfish calls (await asyncio.to_thread(...)) — offloaded to thread pool
        └── threading.Lock on MemoryGameStore — safe for thread pool access
```

---

### Logging Standard

**Decision 4: Python `logging` module — mandatory from first line of backend code.**

`print()` is not acceptable — cannot filter by level, cannot silence during debugging, cannot redirect without shell gymnastics.

**Exact format (hardcoded in `main.py` logging config):**
```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
```

**Log levels:**
- `INFO`: default — analysis start/complete, provider switch, game upload accepted
- `DEBUG`: Stockfish call timing per move, LLM call timing per move, raw LLM responses — silent by default, visible when debugging a specific analysis failure
- `WARNING`: LLM fallback activated, Brilliant detection borderline case
- `ERROR`: Stockfish subprocess crash, LLM timeout, PGN parse failure

**DEBUG behind config flag:**
```yaml
# config.yaml
server:
  log_level: "INFO"   # "DEBUG" to enable verbose Stockfish + LLM logging
```

Each service module gets its own named logger:
```python
logger = logging.getLogger(__name__)  # e.g., "services.stockfish_service"
```

---

### Decision Impact Analysis

**Implementation Sequence (decisions bind these stories):**
1. Project init + directory structure (Story 1 — before any code)
2. Backend skeleton: FastAPI app, config loading, logging setup (Decision 4 applies immediately)
3. In-memory store + Pydantic models (Data Architecture confirmed)
4. PGN upload endpoint + python-chess parsing (uses `chess` not `python-chess`)
5. Stockfish service with `asyncio.to_thread` wrapper (Decision 1 — every story touching Stockfish)
6. Move classifier + centripawn unit tests (Decision 3 — gate before integration)
7. Analysis orchestrator (ties Stockfish + LLM + classifier)
8. WebSocket handler with late-join replay + `buffered` flag (Decision 2)
9. LLM adapter layer (already fully specified in llm-provider-spec.md)
10. Frontend: Zustand store + useAnalysis hook with buffered replay handling
11. Frontend: usePlayback state machine + keyboard bindings
12. Docker Compose with Ollama healthcheck + model pre-pull

**Cross-Component Dependencies:**
- `buffered: true` flag must be typed in BOTH backend `WSMoveResult` schema AND frontend `WSMessage` union — misalignment causes silent undefined fields
- `asyncio.to_thread` is required in `analysis_orchestrator.py` wherever Stockfish is called — enforced as a project rule, verifiable in code review
- `threading.Lock` in `MemoryGameStore.append_move` is required because `asyncio.to_thread` runs in a thread pool — without the lock, concurrent analyses (future Phase 2) could corrupt the store

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where AI agents implementing different stories could make incompatible choices without explicit rules.

---

### Naming Patterns

**Backend (Python) — snake_case everywhere:**
```python
# ✅ Correct
def get_move_analysis(game_id: str) -> MoveAnalysis: ...
cp_loss: int
eval_before_cp: int

# ❌ Wrong
def getMoveAnalysis(gameId: str): ...
cpLoss: int
```

**Frontend (TypeScript) — language-native conventions:**
- Components and interfaces: `PascalCase` — `ChessBoard.tsx`, `MoveAnalysis`, `GameState`
- Hooks, utils, stores: `camelCase` — `usePlayback.ts`, `categoryConfig.ts`, `gameStore.ts`
- Variables and functions: `camelCase` — `currentMoveIndex`, `handleKeyDown`
- No exception: hooks always start with `use`, always `camelCase`

**API JSON — snake_case always:**
All JSON fields over the wire use `snake_case` (e.g. `game_id`, `move_index`, `eval_before_cp`, `comment_source`). Pydantic enforces this on the backend automatically. Frontend TypeScript interfaces mirror it exactly — do NOT convert to camelCase at the API client layer.

**File naming:**
- Backend: `snake_case.py` for all files — `pgn_parser.py`, `stockfish_service.py`, `move_classifier.py`
- Frontend components: `PascalCase.tsx` — `ChessBoard.tsx`, `MoveList.tsx`, `EvalBar.tsx`
- Frontend hooks/utils/stores: `camelCase.ts` — `usePlayback.ts`, `gameStore.ts`, `categoryConfig.ts`

---

### Critical Numbering Convention — move_index vs move_number

This is the most likely source of bugs from agents conflating two different systems:

| Field | Type | Zero-based? | Description | Example |
|---|---|---|---|---|
| `move_index` | int | Yes (0-based ply) | Backend identifier for a move; used in all API and WS messages | 0, 1, 2, 3... |
| `move_number` | int | No (1-based full move) | Chess notation move number | 1, 1, 2, 2, 3, 3... |
| `currentMoveIndex` | int | Yes (-1 = start) | Frontend Zustand state; -1 means starting position (before move 0) | -1, 0, 1, 2... |

**Rule:** All array indexing uses `move_index`. All display labels use `move_number`. Never use `move_number` to index into `game.moves[]`.

```typescript
// ✅ Correct
const move = game.moves[currentMoveIndex];           // move_index for array access
display(`Move ${move.move_number}. ${move.colour}`); // move_number for display

// ❌ Wrong
const move = game.moves[move.move_number];  // off-by-one and breaks on Black moves
```

---

### Critical Centripawn Sign Rule

**One rule, stated once, applies everywhere:**

> `eval_before_cp` and `eval_after_cp` are ALWAYS from the perspective of the player who just moved.

Stockfish returns eval from the perspective of the side to move. After a move is played, the side to move has changed — so `eval_after_cp` requires negation before storage.

**The flip happens in `stockfish_service.py`, once, before any other calculation:**
```python
# stockfish_service.py — flip happens HERE and only here
eval_after_cp = -raw_stockfish_eval_after   # negate because side to move changed

# cp_loss calculated AFTER the flip — both values now from mover's perspective
cp_loss = max(0, eval_before_cp - eval_after_cp)
```

**Rule:** No other module ever negates a centipawn value. If you are writing code that negates a centipawn value outside of `stockfish_service.py`, you are doing it wrong.

---

### Structure Patterns

**Module boundaries — do not cross these:**

| Module | Owns | Never contains |
|---|---|---|
| `models/game.py` | Domain models (GameAnalysis, MoveAnalysis, MoveCategory) | API-specific request/response shapes |
| `models/api.py` | API request/response schemas | Domain logic |
| `services/` | Business logic, orchestration | HTTP handling, routing |
| `routers/` | HTTP routing, request/response translation | Business logic |
| `llm/` | LLM provider implementations | Stockfish calls, classification logic |
| `store/` | In-memory persistence | Any business logic |

**The boundary rule:** Routers call services. Services call the store. Services call LLM via ProviderRegistry only. Services call Stockfish via stockfish_service only. No shortcuts.

**Test file locations:**
- Backend: `backend/tests/` directory, mirroring the source structure — `tests/services/test_move_classifier.py`, `tests/services/test_stockfish_service.py`
- Frontend: Co-located `*.test.ts` files — `ChessBoard.test.tsx` next to `ChessBoard.tsx`

---

### API & Communication Patterns

**API response format — direct, no wrapper:**
```python
# ✅ Correct — direct Pydantic model
return UploadPGNResponse(game_id=..., status=..., ...)

# ❌ Wrong — no wrapper objects
return {"data": {...}, "success": True}
```

**Error format — FastAPI standard only:**
```python
# ✅ Correct
raise HTTPException(status_code=400, detail="Invalid PGN: could not parse move 12.")

# ❌ Wrong
return {"error": "Invalid PGN", "code": 400}
```

**HTTP status codes — strict:**
- `202` — upload accepted, analysis started (not 200, not 201)
- `200` — all GET success responses
- `400` — invalid PGN, invalid provider_id
- `404` — game_id not found
- `422` — Pydantic validation error (automatic)
- `500` — unexpected server error

**WebSocket message type discriminator — always `type` field first:**
```typescript
type WSMessage =
  | { type: 'move_result'; buffered: boolean; game_id: string; move_index: number; total_moves: number; move: MoveAnalysis }
  | { type: 'progress';    game_id: string; moves_done: number; total_moves: number; status: AnalysisStatus }
  | { type: 'complete';    game_id: string; summary: GameSummary }
  | { type: 'error';       game_id: string; message: string; move_index?: number };
```

The `buffered` field exists only on `move_result` messages. Frontend switches on `type`.

---

### LLM Provider Pattern

**Rule: Always call LLM through `ProviderRegistry.generate_with_fallback()` — never directly.**

```python
# ✅ Correct — via ProviderRegistry (timeout + fallback included)
comment, source = await registry.generate_with_fallback(prompt, category, best_move_san)

# ❌ Wrong — bypasses 10s timeout and fallback mechanism
comment = await registry.active_provider.generate(prompt)
```

---

### Frontend State Patterns

**Zustand — immutable updates only:**
```typescript
// ✅ Correct
set(state => ({ moves: [...state.moves, newMove] }))

// ❌ Wrong — direct mutation
set(state => { state.moves.push(newMove) })
```

**Playback state transitions — only through `usePlayback.ts`.** No component sets `playbackState` directly.

**Loading state — use `AnalysisStatus` from game store, not local component state:**
```typescript
// ✅ Correct
const { status } = useGameStore();
if (status === 'analysing') return <ProgressBar />;

// ❌ Wrong — duplicating state
const [loading, setLoading] = useState(false);
```

---

### Configuration Access Pattern

**Rule: Always read config via pydantic-settings object — no direct YAML reads, no hardcoded values.**

```python
# ✅ Correct
from config import settings
depth = settings.stockfish.depth

# ❌ Wrong
depth = 18  # hardcoded
```

---

### TypeScript Type Safety

**Rule: No `any` except at the raw WebSocket/Axios response boundary, immediately replaced.**

```typescript
// ✅ Correct — one any, immediately typed
socket.onmessage = (event: MessageEvent) => {
  const message = JSON.parse(event.data) as WSMessage;
  handleMessage(message);
};

// ❌ Wrong — any propagating through the codebase
const handleMessage = (message: any) => { ... }
```

All types live in `frontend/src/types/chess.ts`. New types go there — not inline in component files.

---

### Error Surfacing Pattern (Frontend)

**Three-tier error surfacing — use the right tier:**

| Error Type | Surface As |
|---|---|
| Analysis stall (WS dead-man 30s) | Full-screen error state with retry button |
| LLM fallback activated | Toast notification (non-blocking) |
| Invalid PGN (upload) | Inline field error below drop zone |
| Per-move analysis failure | Silent — move shows "Good" + fallback comment |
| Provider switch to unavailable | Toast notification |

No bare `alert()` or `console.error()` in components. Errors are state, managed in hooks.

---

### Enforcement Guidelines

**All AI agents implementing KnightVision stories MUST:**

1. Use `asyncio.to_thread()` for every Stockfish call — no exceptions
2. Negate centripawn values only in `stockfish_service.py` — nowhere else
3. Call LLM only via `ProviderRegistry.generate_with_fallback()` — never direct
4. Use `move_index` for array access, `move_number` for display — never confuse them
5. Use `currentMoveIndex = -1` to represent starting position (before move 0)
6. Read config only via pydantic-settings object — no direct YAML reads, no hardcoded values
7. Honour the `buffered: boolean` flag on `move_result` — replay without animation, live with animation
8. Place centripawn unit tests (3 known positions) in `backend/tests/services/test_move_classifier.py` — acceptance gate for the analysis pipeline
9. Use Python `logging` module with named loggers per module — no `print()` statements
10. Follow module boundary rules — routers call services, services call store/LLM/Stockfish, no shortcuts

## Project Structure & Boundaries

### Complete Project Directory Structure

```
knightvision/
├── README.md
├── docker-compose.yml              # backend + ollama containers
├── docker-compose.prod.yml         # hosted instance variant (no ollama)
├── .gitignore
├── .env.example                    # GROQ_API_KEY, HF_API_KEY templates
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt            # uses `chess>=1.11` (not python-chess)
│   ├── requirements-dev.txt        # pytest, pytest-asyncio, httpx[test]
│   ├── config.yaml                 # user-editable: stockfish, classifier, llm, server, accuracy
│   ├── .env                        # not committed — API keys only
│   │
│   ├── main.py                     # FastAPI app entry, logging config, router registration, CORS
│   ├── config.py                   # pydantic-settings: loads config.yaml + env vars
│   │
│   ├── routers/
│   │   ├── games.py                # POST /api/games/upload, GET /api/games/{id}
│   │   ├── analysis.py             # GET /api/games/{id}/analysis
│   │   ├── websocket.py            # WS /ws/games/{id}/analysis (late-join replay + buffered flag)
│   │   ├── llm.py                  # GET /api/llm/providers, POST /api/llm/provider
│   │   └── health.py               # GET /api/health
│   │
│   ├── services/
│   │   ├── pgn_parser.py           # python-chess PGN parsing, metadata extraction
│   │   ├── stockfish_service.py    # subprocess management, centripawn flip (ONLY place)
│   │   ├── move_classifier.py      # cp_loss → MoveCategory + Brilliant detection
│   │   ├── analysis_orchestrator.py # per-move: asyncio.to_thread(stockfish) + LLM + classify
│   │   └── opening_detector.py     # ECO JSON lookup, deepest-match, graceful fallback
│   │
│   ├── llm/
│   │   ├── base.py                 # BaseLLMProvider ABC + LLMProviderError
│   │   ├── ollama_provider.py      # OllamaProvider (localhost:11434)
│   │   ├── groq_provider.py        # GroqProvider (api.groq.com, OpenAI-compat)
│   │   ├── huggingface_provider.py # HuggingFaceProvider (api-inference.huggingface.co)
│   │   ├── fallback.py             # FallbackProvider + FALLBACK_TEMPLATES dict
│   │   └── provider_registry.py    # ProviderRegistry: switch_provider + generate_with_fallback
│   │
│   ├── models/
│   │   ├── game.py                 # MoveCategory, MoveAnalysis, GameMetadata, GameSummary, GameAnalysis, AnalysisStatus
│   │   └── api.py                  # UploadPGNRequest/Response, GameDetailResponse, FullAnalysisResponse,
│   │                               # WSMoveResult (+ buffered field), WSProgressUpdate, WSComplete, WSError,
│   │                               # LLMProviderInfo, SwitchProviderRequest/Response, HealthResponse
│   │
│   ├── store/
│   │   └── memory_store.py         # MemoryGameStore: threading.Lock, create/get/update/delete/append_move
│   │
│   ├── data/
│   │   └── eco_openings.json       # bundled ECO database ~200KB
│   │
│   └── tests/
│       ├── conftest.py             # pytest fixtures: test client, mock providers, sample PGN
│       ├── services/
│       │   ├── test_move_classifier.py    # ← CENTRIPAWN ACCEPTANCE GATE: 3 known positions
│       │   ├── test_stockfish_service.py  # perspective flip correctness
│       │   ├── test_pgn_parser.py         # valid/invalid PGN, metadata extraction
│       │   └── test_opening_detector.py   # ECO match, deepest-match, unknown fallback
│       ├── routers/
│       │   ├── test_games.py              # upload endpoint: valid PGN, invalid PGN, 202 response
│       │   ├── test_websocket.py          # WS connect, move_result stream, buffered replay, complete
│       │   └── test_llm.py               # provider list, switch, health check
│       └── llm/
│           └── test_provider_registry.py  # generate_with_fallback: success, timeout, error → fallback
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js          # Tailwind 3.x — tailwind.config.js pattern
    ├── postcss.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── .env                        # VITE_API_BASE_URL (not committed)
    ├── .env.example
    │
    └── src/
        ├── main.tsx                # React 18 root, StrictMode
        ├── App.tsx                 # Route: UploadView | ReviewView
        │
        ├── components/
        │   ├── upload/
        │   │   ├── PGNDropZone.tsx        # drag-drop + file picker (FR1–FR4)
        │   │   ├── PGNDropZone.test.tsx
        │   │   └── PGNTextInput.tsx       # paste PGN text (FR2)
        │   │
        │   ├── board/
        │   │   ├── ChessBoard.tsx         # react-chessboard@4, animated, best-move arrow (FR29, FR31)
        │   │   ├── EvalBar.tsx            # vertical white/black bar, updates per move (FR30)
        │   │   └── BestMoveArrow.tsx      # toggleable arrow overlay (FR31)
        │   │
        │   ├── controls/
        │   │   └── PlaybackControls.tsx   # ⏮ ◀ ⏸/▶ ▶ ⏭ buttons + move counter (FR33–FR35)
        │   │
        │   ├── analysis/
        │   │   ├── MoveList.tsx           # scrollable, colour-coded, click-to-jump (FR32)
        │   │   ├── MoveListItem.tsx       # single move row with CategoryBadge
        │   │   ├── MoveDetail.tsx         # current move card: badge, eval, comment, top 3 (FR32)
        │   │   └── CategoryBadge.tsx      # colour-coded badge for 7 categories (FR9)
        │   │
        │   ├── graph/
        │   │   └── EvalGraph.tsx          # recharts line chart (Phase 1.5 — stub for Phase 1)
        │   │
        │   ├── header/
        │   │   ├── GameHeader.tsx         # player names, Elo, result, date, accuracy (FR38, FR48)
        │   │   └── OpeningBadge.tsx       # "B90 · Sicilian: Najdorf" (FR49)
        │   │
        │   ├── settings/
        │   │   └── SettingsPanel.tsx      # LLM provider switcher: dropdown/radio + status dots (FR25, FR26)
        │   │
        │   └── common/
        │       ├── ProgressBar.tsx        # "Analysing move 12/54…" during analysis (FR13)
        │       ├── ErrorState.tsx         # full-screen error + retry (WS dead-man stall)
        │       └── Toast.tsx             # non-blocking notifications (LLM fallback, provider switch)
        │
        ├── hooks/
        │   ├── usePlayback.ts     # 6-state machine, setInterval, keyboard bindings (FR33–FR35)
        │   ├── useAnalysis.ts     # WS lifecycle, buffered replay, dead-man 30s timeout (FR13, FR41)
        │   ├── useSwipe.ts        # touch swipe detection: prev/next on mobile (FR36)
        │   └── useSettings.ts     # active LLM provider, health check, switch action (FR25–FR27)
        │
        ├── store/
        │   └── gameStore.ts       # Zustand: game_id, status, moves[], summary, metadata, total_moves
        │
        ├── api/
        │   ├── client.ts          # axios instance, VITE_API_BASE_URL, 15s timeout
        │   └── endpoints.ts       # uploadPGN, getGame, getFullAnalysis, getLLMProviders,
        │                          # switchLLMProvider, createAnalysisSocket
        │
        ├── types/
        │   └── chess.ts           # ALL types: MoveCategory, MoveAnalysis, GameState, WSMessage
        │                          # (includes buffered: boolean on move_result), CATEGORY_CONFIG
        │
        └── utils/
            ├── categoryConfig.ts  # CATEGORY_CONFIG: label/symbol/colour/hex per category
            └── openingDetector.ts # client-side ECO lookup (mirrors backend for instant display)
```

---

### Architectural Boundaries

**External API Boundaries:**

| Boundary | Protocol | Direction | Auth |
|---|---|---|---|
| Browser → Backend upload | REST POST | outbound | none |
| Browser → Backend WS | WebSocket | bidirectional | none |
| Backend → Stockfish | UCI subprocess (stdin/stdout) | local | none |
| Backend → Ollama | HTTP REST (localhost:11434) | outbound | none |
| Backend → Groq | HTTPS REST | outbound | Bearer token (env var) |
| Backend → HuggingFace | HTTPS REST | outbound | Bearer token (env var) |

**Internal Service Boundaries:**

```
routers/   → services/          (HTTP context translated to domain calls)
services/  → store/             (read/write GameAnalysis)
services/  → llm/               (only via ProviderRegistry.generate_with_fallback)
services/  → stockfish_service  (only via asyncio.to_thread wrapper)
llm/       → base.py            (all providers implement BaseLLMProvider ABC)
```

**Frontend Component Boundaries:**

```
App.tsx
  ├── UploadView  (reads: none | writes: triggers upload)
  └── ReviewView  (reads: gameStore | writes: none)
      ├── useAnalysis  → gameStore (writes moves[], status, summary)
      ├── usePlayback  → gameStore (reads moves[]) + local state (currentMoveIndex)
      └── useSettings  → /api/llm/* (reads/writes active provider)
```

---

### FR to Structure Mapping

| FR Category | Backend Location | Frontend Location |
|---|---|---|
| Game Ingestion (FR1–FR8) | `routers/games.py` + `services/pgn_parser.py` | `components/upload/` + `api/endpoints.ts` |
| Chess Analysis Engine (FR9–FR20) | `services/stockfish_service.py` + `services/move_classifier.py` + `services/analysis_orchestrator.py` | `hooks/useAnalysis.ts` + `store/gameStore.ts` |
| LLM Commentary (FR21–FR28) | `llm/` + `routers/llm.py` | `components/settings/SettingsPanel.tsx` + `hooks/useSettings.ts` |
| Game Review Interface (FR29–FR40) | `routers/websocket.py` | `components/board/` + `components/analysis/` + `components/controls/` |
| Mobile & Accessibility (FR41–FR44) | n/a | `hooks/useSwipe.ts` + responsive Tailwind classes in all components |
| Analysis Resilience | `routers/websocket.py` (heartbeat) | `hooks/useAnalysis.ts` (dead-man timeout) |
| Deployment (FR45–FR47) | `Dockerfile` + `docker-compose.yml` | `.env.example` + `vite.config.ts` |
| Opening Detection (FR49–FR50) | `services/opening_detector.py` + `data/eco_openings.json` | `utils/openingDetector.ts` + `components/header/OpeningBadge.tsx` |

**Acceptance gate:** `backend/tests/services/test_move_classifier.py` — 3 unit tests with known positions. Analysis pipeline cannot be accepted as correct until these pass.

---

### Data Flow

```
User drops PGN
  → PGNDropZone validates with chess.js (client-side, FR4)
  → POST /api/games/upload
  → pgn_parser.py parses + validates (server-side, FR5)
  → MemoryGameStore.create(GameAnalysis) — status: pending
  → BackgroundTasks: analysis_orchestrator.start()
  → Upload returns 202 + game_id
  → Frontend connects WS /ws/games/{id}/analysis

WS connects:
  → Replay all game.moves[] as move_result{buffered:true}  (late-join safe)
  → Continue streaming per move:
      asyncio.to_thread(stockfish.analyse)       [thread pool — never blocks event loop]
      stockfish_service: flip eval, compute cp_loss  [ONLY flip location]
      move_classifier: cp_loss → MoveCategory
      opening_detector: ECO lookup
      registry.generate_with_fallback(prompt)    [10s timeout → fallback]
      MemoryGameStore.append_move(result)         [threading.Lock]
      WS send move_result{buffered:false}
  → WS send complete{summary}

Frontend receives move_result:
  → buffered:true  → append to gameStore.moves[], no animation (catch-up)
  → buffered:false → append to gameStore.moves[], trigger board animation (live)
  → currentMoveIndex tracks position; -1 = starting position
  → usePlayback state machine drives board rendering
```

---

### Development Workflow Integration

**Dev startup (two terminals):**
```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload

# Terminal 2
cd frontend && npm run dev
```

**Docker startup (single command):**
```bash
docker compose up                                  # self-host with Ollama
docker compose -f docker-compose.prod.yml up       # hosted variant with Groq
```

**Test run:**
```bash
cd backend && pytest tests/ -v    # centripawn gate + all unit tests
cd frontend && npm run test       # component tests
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology versions are mutually compatible:
- React 18 + Vite 8.x + Tailwind 3.x + TypeScript — no conflicts
- FastAPI 0.135.1 + Python 3.11+ + Pydantic v2 — compatible; FastAPI[standard] bundles Pydantic v2
- `asyncio.to_thread` requires Python 3.9+ — Python 3.11+ minimum satisfies this
- Zustand 4 + React 18 — compatible; matches project-context.md spec exactly
- `httpx` async client + FastAPI async handlers — same event loop, no conflicts
- `chess>=1.11` (PyPI rename from `python-chess`) — import paths unchanged (`import chess`)

**Pattern Consistency:**
- Naming: snake_case (backend), PascalCase (components), camelCase (hooks/utils) — no overlap or ambiguity
- API responses: direct Pydantic models throughout — no mixed wrapper/direct pattern
- Error handling: HTTPException + `{"detail": "..."}` everywhere — consistent
- Module boundaries: defined and non-overlapping

**Structure Alignment:**
Project structure directly maps all 8 FR categories to specific files. Test structure mirrors source. Docker files cover both deployment targets. All integration points are named and bounded.

---

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (50 FRs):**
- FR1–FR8 (Game Ingestion): `routers/games.py` + `services/pgn_parser.py` + `components/upload/` ✅
- FR9–FR20 (Chess Analysis Engine): `services/stockfish_service.py` + `move_classifier.py` + `analysis_orchestrator.py` ✅
- FR21–FR28 (LLM Commentary): `llm/` directory + `ProviderRegistry` + `SettingsPanel.tsx` ✅
- FR29–FR40 (Game Review Interface): `components/board/` + `components/analysis/` + `hooks/usePlayback.ts` ✅
- FR41–FR44 (Mobile & Accessibility): `hooks/useSwipe.ts` + responsive Tailwind layout + WCAG 2.1 AA enforcement ✅
- Analysis Resilience: dead-man 30s in `useAnalysis.ts` + heartbeat every 10s in `routers/websocket.py` ✅
- FR45–FR47 (Deployment): `docker-compose.yml` + `docker-compose.prod.yml` + Railway/Render config ✅
- FR49–FR50 (Opening Detection): `services/opening_detector.py` + `data/eco_openings.json` + `OpeningBadge.tsx` ✅

**Non-Functional Requirements Coverage:**
- Analysis < 60s: depth 18 default, asyncio.to_thread prevents event loop blocking, pre-compute on upload ✅
- Board render < 100ms: all data pre-computed; playback is pure React state transitions, no network calls ✅
- WS first result < 3s: BackgroundTasks starts immediately post-upload; Stockfish first move typically < 1s at depth 18 ✅
- LLM timeout 10s: `asyncio.wait_for` in `ProviderRegistry.generate_with_fallback` ✅
- Mobile board 300px min: CSS constraint in `ChessBoard.tsx`, enforced by responsive Tailwind ✅
- Browser support (Chrome 90+, Firefox 90+, Safari 15+): Vite 8 default build targets cover these ✅
- WCAG 2.1 AA: contrast audit required pre-ship (see Gap 4 resolution below) ✅

---

### Gap Analysis & Resolutions

**Gap 1 — `buffered` field must be first-class in Pydantic model (not ad-hoc dict merge):**

`WSMoveResult` in `backend/models/api.py` must include:
```python
class WSMoveResult(BaseModel):
    type: str = "move_result"
    buffered: bool = False      # ← first-class field
    game_id: str
    move_index: int
    total_moves: int
    move: MoveAnalysis
```
Live stream: `WSMoveResult(..., buffered=False)`. Replay loop: `WSMoveResult(..., buffered=True)`.
Frontend `WSMessage` type already includes `buffered: boolean` — backend model now matches exactly.

**Gap 2 — Ollama model pre-pull: exact Docker Compose mechanism:**

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    entrypoint: ["/bin/sh", "-c",
      "ollama serve & sleep 5 && ollama pull llama3.1:8b && wait"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 10s
      timeout: 5s
      retries: 12       # 2 minutes budget for large model pull on first run

  backend:
    build: ./backend
    depends_on:
      ollama:
        condition: service_healthy
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - HF_API_KEY=${HF_API_KEY}

volumes:
  ollama_data:            # persist model across container restarts — downloads once only
```

**Gap 3 — react-chessboard@4 locked for Phase 1 (v5 upgrade deferred):**

Phase 1 locks to `react-chessboard@4.x`. The v4 API is proven and stable; the project skills were written for it. Upgrade to v5 is a Phase 2 task.

The `customArrows` prop in react-chessboard@4 accepts `string[][]` where each arrow is `[from, to, color?]`:
```tsx
// ChessBoard.tsx — best-move arrow implementation pattern (v4 API)
<Chessboard
  customArrows={showBestMoveArrow && currentMove
    ? [[currentMove.best_move_uci.slice(0, 2),
        currentMove.best_move_uci.slice(2, 4),
        'rgba(0, 128, 0, 0.65)']]
    : []}
/>
```
UCI notation (e.g. `e2e4`) splits cleanly into `from` (chars 0–1) and `to` (chars 2–3). No Square type cast needed in v4 — plain strings.

**Gap 4 — WCAG 2.1 AA: concrete enforcement mechanism:**

All 7 category badge colours are text on dark background. All pass 4.5:1 contrast ratio (AA):

| Category | Hex | WCAG AA on dark |
|---|---|---|
| Brilliant | `#34d399` | ✅ |
| Great | `#6c8efb` | ✅ |
| Best | `#a78bfa` | ✅ |
| Good | `#22d3ee` | ✅ |
| Inaccuracy | `#fbbf24` | ✅ |
| Mistake | `#fb923c` | ✅ |
| Blunder | `#f87171` | ✅ |

**Enforcement gate:** The `CategoryBadge.tsx` implementation story must include a contrast verification pass via the axe DevTools browser extension or equivalent before the story is closed. This is the WCAG 2.1 AA acceptance criterion for that story.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 50 FRs across 8 capability areas analyzed for architectural implications
- [x] Scale and complexity assessed (Medium — real-time streaming, subprocess, 3 LLM integrations)
- [x] Technical constraints identified (Stockfish subprocess, async/thread boundary, timeout chain)
- [x] 8 cross-cutting concerns mapped with mitigations

**✅ Architectural Decisions**
- [x] 4 critical decisions documented with rationale (asyncio.to_thread, late-join replay, centripawn test gate, logging)
- [x] Full technology stack specified with current verified versions
- [x] Integration patterns defined (REST + WebSocket, Adapter Pattern, State Machine)
- [x] Concurrency model fully specified (event loop + thread pool + threading.Lock)

**✅ Implementation Patterns**
- [x] Naming conventions: backend snake_case, frontend PascalCase/camelCase, API snake_case JSON
- [x] Critical numbering convention: move_index vs move_number vs currentMoveIndex (-1 = start)
- [x] Critical sign rule: centripawn flip in stockfish_service.py only, nowhere else
- [x] 10 mandatory enforcement rules for all implementation stories
- [x] Error surfacing tiers: full-screen / toast / inline / silent

**✅ Project Structure**
- [x] Complete directory tree with all files and their responsibilities
- [x] FR-to-file mapping for all 50 requirements
- [x] Architectural boundary table (internal + external)
- [x] Full data flow from PGN drop to board animation
- [x] Test locations and centripawn acceptance gate identified

**✅ Gap Resolution**
- [x] `buffered` field promoted to first-class Pydantic field in WSMoveResult
- [x] Ollama pre-pull Docker Compose mechanism fully specified
- [x] react-chessboard locked to @4.x (v5 upgrade deferred to Phase 2); v4 arrow API documented
- [x] WCAG 2.1 AA enforcement gate documented per-story

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

The architecture is unusually well-specified — a result of six pre-existing project docs feeding the workflow. All critical decisions are locked, all patterns are explicit, all conflict points have named resolutions.

**Key Strengths:**
- Centripawn sign rule is the only place a silent bug can corrupt the entire pipeline — it is named, located, and has an explicit test gate
- Late-join WebSocket replay with `buffered` flag eliminates an entire class of edge cases at zero implementation cost (data already stored)
- `asyncio.to_thread` as a project-wide standard prevents the most common async/sync bridge mistake in FastAPI
- Both deployment paths (Docker + hosted) are Phase 1 first-class citizens, not afterthoughts
- `MemoryGameStore` interface is defined as a contract — Phase 2 persistence is a clean swap, not a rewrite

**Areas for Phase 1.5 / Phase 2 enhancement:**
- Full PGN smoke test (integration test with real Stockfish on known game)
- EvalGraph component (recharts stub is in place, ready to implement)
- Structured log dashboard (Python logging format already structured for aggregation)
- CORS production domain — update `config.yaml server.cors_origins` once Railway/Render URL is known

---

### Implementation Handoff

**AI Agent Guidelines:**
- This document is the single source of truth for all architectural questions during implementation
- Follow the 10 enforcement rules in the Implementation Patterns section without exception
- When in doubt about module placement: check the FR-to-structure mapping table
- The centripawn acceptance gate (`backend/tests/services/test_move_classifier.py`) must pass before any integration story is accepted

**First Implementation Story:**
```bash
# Story 1: Project initialization
npm create vite@latest frontend -- --template react-ts
mkdir backend && cd backend && python -m venv .venv
# Establish full directory structure per architecture.md Project Structure section
```
