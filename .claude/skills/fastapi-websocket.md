# Skill: FastAPI WebSocket + Background Task Streaming

## Purpose
Stream chess move analysis results to the frontend in real time. Stockfish + LLM analysis runs in a background task while the WebSocket connection pushes each move's result to the client as it's ready. The analysis pipeline must never block FastAPI's async event loop.

---

## Architecture

```
POST /api/games/upload
  → Parse PGN (sync, fast — python-chess)
  → Create GameAnalysis in MemoryStore (status: pending)
  → Schedule background task (BackgroundTasks)
  → Return game_id immediately (202 Accepted)

WS /ws/games/{game_id}/analysis
  → Client connects
  → Manager registers connection
  → Background task sends move_result messages as each move finishes
  → Background task sends complete message at end
  → Client disconnects
```

---

## WebSocket Connection Manager

```python
# backend/websocket/manager.py
from fastapi import WebSocket
from typing import Dict
import asyncio

class WebSocketManager:
    """Thread-safe manager for active WebSocket connections, keyed by game_id."""

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, game_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[game_id] = websocket

    def disconnect(self, game_id: str) -> None:
        self._connections.pop(game_id, None)

    async def send(self, game_id: str, data: dict) -> bool:
        """Send a JSON message. Returns False if connection is gone."""
        ws = self._connections.get(game_id)
        if ws is None:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception:
            self.disconnect(game_id)
            return False

    def is_connected(self, game_id: str) -> bool:
        return game_id in self._connections

# Singleton — shared across routers
ws_manager = WebSocketManager()
```

---

## WebSocket Router

```python
# backend/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websocket.manager import ws_manager

router = APIRouter()

@router.websocket("/ws/games/{game_id}/analysis")
async def analysis_websocket(websocket: WebSocket, game_id: str):
    """
    Client connects here to receive streaming analysis results.
    If analysis is already complete, sends all cached results immediately.
    If analysis is in progress, streams results as they arrive.
    """
    from store.memory_store import game_store
    from models.game import AnalysisStatus

    game = game_store.get(game_id)
    if game is None:
        await websocket.accept()
        await websocket.send_json({"type": "error", "game_id": game_id, "message": "Game not found."})
        await websocket.close()
        return

    await ws_manager.connect(game_id, websocket)

    try:
        # If analysis already complete, send everything immediately
        if game.status == AnalysisStatus.COMPLETE:
            for move in game.moves:
                await websocket.send_json({
                    "type": "move_result",
                    "game_id": game_id,
                    "move_index": move.move_index,
                    "total_moves": game.total_moves,
                    "move": move.model_dump()
                })
            await websocket.send_json({
                "type": "complete",
                "game_id": game_id,
                "summary": game.summary.model_dump()
            })
        else:
            # Keep connection alive while analysis runs
            # Results are pushed by the background task via ws_manager.send()
            while ws_manager.is_connected(game_id):
                await asyncio.sleep(0.5)   # just keeping the connection open

    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(game_id)
```

---

## Background Analysis Task

This is the most important pattern. Stockfish is CPU-bound — run it in a `ThreadPoolExecutor`. The LLM is I/O-bound — run it with `await`. Push results to the WebSocket as each move completes.

```python
# backend/services/analysis_orchestrator.py
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import BackgroundTasks

_executor = ThreadPoolExecutor(max_workers=2)

async def run_full_analysis(game_id: str, app_state) -> None:
    """
    Background task: analyse all moves, stream results via WebSocket.
    - Stockfish eval: runs in ThreadPoolExecutor (CPU-bound, blocks event loop if called directly)
    - LLM commentary: runs with await (I/O-bound, async-native)
    """
    from store.memory_store import game_store
    from websocket.manager import ws_manager
    from models.game import AnalysisStatus, GameSummary
    from services.move_classifier import classify_move, compute_accuracy
    from services.pgn_parser import extract_moves_from_pgn
    from services.opening_detector import detect_opening

    game = game_store.get(game_id)
    if not game:
        return

    game_store.update_status(game_id, AnalysisStatus.ANALYSING)
    stockfish = app_state.stockfish_service
    llm_registry = app_state.llm_registry

    try:
        raw_moves = extract_moves_from_pgn(game.pgn_raw)
        total = len(raw_moves)

        # Evaluate starting position
        loop = asyncio.get_event_loop()
        eval_before = await loop.run_in_executor(
            _executor, stockfish.evaluate_position, raw_moves[0]["fen_before"]
        )

        for move_data in raw_moves:
            # 1. Stockfish eval — CPU-bound, must use executor
            eval_after = await loop.run_in_executor(
                _executor, stockfish.evaluate_position, move_data["fen_after"]
            )

            cp_loss = max(0, eval_before.score_cp + eval_after.score_cp)
            move_data["eval_before_cp"] = eval_before.score_cp
            move_data["eval_after_cp"] = eval_after.score_cp
            move_data["cp_loss"] = cp_loss
            move_data["best_move_uci"] = eval_before.best_move_uci
            move_data["best_move_san"] = eval_before.best_move_san
            move_data["top_candidates"] = eval_before.top_candidates

            # 2. Classify — fast, synchronous
            import chess
            board_before = chess.Board(move_data["fen_before"])
            played_move = chess.Move.from_uci(move_data["move_uci"])
            category, symbol = classify_move(cp_loss, played_move, eval_before.best_move_uci, board_before)
            move_data["category"] = category.value
            move_data["category_symbol"] = symbol

            # 3. Opening detection — synchronous lookup
            move_data["opening_name"], move_data["opening_eco"] = detect_opening(move_data["fen_before"])

            # 4. LLM commentary — I/O-bound, async
            comment, source = await get_move_commentary(move_data, llm_registry)
            move_data["comment"] = comment
            move_data["comment_source"] = source

            # 5. Store and stream
            from models.game import MoveAnalysis
            move_analysis = MoveAnalysis(**move_data)
            game_store.append_move(game_id, move_analysis)

            # Push to WebSocket — client may have disconnected, that's OK
            await ws_manager.send(game_id, {
                "type": "move_result",
                "game_id": game_id,
                "move_index": move_data["move_index"],
                "total_moves": total,
                "move": move_analysis.model_dump()
            })

            # Progress update every 5 moves
            if move_data["move_index"] % 5 == 0:
                await ws_manager.send(game_id, {
                    "type": "progress",
                    "game_id": game_id,
                    "moves_done": move_data["move_index"] + 1,
                    "total_moves": total,
                    "status": "analysing"
                })

            eval_before = eval_after  # carry forward

        # 6. Compute summary
        all_moves = game_store.get(game_id).moves
        summary = GameSummary(
            white_accuracy=compute_accuracy([m.dict() for m in all_moves], "white"),
            black_accuracy=compute_accuracy([m.dict() for m in all_moves], "black"),
            white_category_counts={...},  # count by category for white moves
            black_category_counts={...},  # count by category for black moves
            total_moves=total,
        )
        game_store.finalize(game_id, summary)

        await ws_manager.send(game_id, {
            "type": "complete",
            "game_id": game_id,
            "summary": summary.model_dump()
        })

    except Exception as e:
        game_store.update_status(game_id, AnalysisStatus.FAILED, str(e))
        await ws_manager.send(game_id, {
            "type": "error",
            "game_id": game_id,
            "message": f"Analysis failed: {e}"
        })
```

---

## Upload Router (triggers background task)

```python
# backend/routers/games.py
from fastapi import APIRouter, BackgroundTasks, Request
from models.api import UploadPGNRequest, UploadPGNResponse
from models.game import GameAnalysis, AnalysisStatus
from services.pgn_parser import parse_pgn_metadata
from store.memory_store import game_store
from services.analysis_orchestrator import run_full_analysis
import uuid

router = APIRouter()

@router.post("/api/games/upload", status_code=202)
async def upload_game(
    body: UploadPGNRequest,
    background_tasks: BackgroundTasks,
    request: Request
) -> UploadPGNResponse:
    metadata = parse_pgn_metadata(body.pgn)
    total_moves = count_pgn_moves(body.pgn)

    game = GameAnalysis(
        game_id=str(uuid.uuid4()),
        status=AnalysisStatus.PENDING,
        metadata=metadata,
        pgn_raw=body.pgn,
    )
    game_store.create(game)

    # Schedule analysis as background task — returns immediately
    background_tasks.add_task(run_full_analysis, game.game_id, request.app.state)

    return UploadPGNResponse(
        game_id=game.game_id,
        status=AnalysisStatus.PENDING,
        total_moves=total_moves,
        metadata=metadata,
        message="Game uploaded. Analysis started. Connect to WebSocket to receive results."
    )
```

---

## Frontend WebSocket Client

```typescript
// hooks/useAnalysis.ts
import { useState, useEffect, useRef } from 'react';
import { uploadPGN, createAnalysisSocket } from '../api/endpoints';
import type { MoveAnalysis, GameSummary, WSMessage } from '../types/chess';

export function useAnalysis() {
  const [moves, setMoves] = useState<MoveAnalysis[]>([]);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isAnalysing, setIsAnalysing] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const startAnalysis = async (pgn: string) => {
    const { data } = await uploadPGN(pgn);
    const gameId = data.game_id;
    setIsAnalysing(true);
    setProgress({ done: 0, total: data.total_moves });

    const ws = createAnalysisSocket(gameId);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      if (msg.type === 'move_result') {
        setMoves(prev => {
          const updated = [...prev];
          updated[msg.move_index] = msg.move;
          return updated;
        });
        setProgress(p => ({ ...p, done: msg.move_index + 1 }));
      } else if (msg.type === 'complete') {
        setSummary(msg.summary);
        setIsAnalysing(false);
        ws.close();
      } else if (msg.type === 'error') {
        console.error('Analysis error:', msg.message);
      }
    };

    ws.onerror = () => setIsAnalysing(false);
  };

  useEffect(() => () => socketRef.current?.close(), []);

  return { moves, summary, progress, isAnalysing, startAnalysis };
}
```

---

## Rules for Developer Agents

1. **Stockfish `evaluate_position()` is synchronous CPU-bound code.** ALWAYS run it via `loop.run_in_executor(_executor, ...)`. Calling it directly in an `async def` will block FastAPI's event loop and freeze all other requests.
2. **`BackgroundTasks.add_task()` is non-blocking** — `POST /api/games/upload` returns 202 before analysis starts. The client must connect via WebSocket to receive results.
3. **WebSocket disconnect during analysis is safe** — `ws_manager.send()` returns `False` but the background task continues. Results are cached in `MemoryStore`. The client can reconnect and receive all cached moves.
4. **Do NOT use `asyncio.sleep()` in the analysis loop** as a rate limiter — it blocks the task unnecessarily. The `run_in_executor` calls yield control to the event loop naturally.
5. **Thread pool executor size = 2** — one thread for Stockfish, one spare. Increasing it doesn't help since Stockfish itself uses multiple threads (configured via `Threads` UCI option).
6. **Message type discriminator** — every WebSocket message must include `"type"` as the first key for the frontend to route it correctly.
7. **CORS must be configured** on the FastAPI app for the React dev server: `allow_origins=["http://localhost:5173"]`.
