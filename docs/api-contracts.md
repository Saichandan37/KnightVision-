# Chess AI Agent — API Contracts
> **Version:** 1.0 (Phase 1)
> Base URL: `http://localhost:8000`
> WebSocket Base: `ws://localhost:8000`
> All JSON responses use snake_case.

---

## 1. REST Endpoints

### POST `/api/games/upload`
Upload a PGN string to begin analysis.

**Request**
```http
POST /api/games/upload
Content-Type: application/json

{
  "pgn": "[Event \"Live Chess\"]\n[White \"Player1\"]\n...\n1. e4 e5 2. Nf3 ..."
}
```

OR as multipart form data (file upload):
```http
POST /api/games/upload
Content-Type: multipart/form-data

file: <pgn_file.pgn>
```

**Response 202 Accepted**
```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "total_moves": 54,
  "metadata": {
    "event": "Live Chess",
    "site": "Chess.com",
    "date": "2026.03.13",
    "white_player": "Dchoupak1",
    "black_player": "SaiChandanSingh",
    "white_elo": 1078,
    "black_elo": 1116,
    "result": "0-1",
    "time_control": "600",
    "termination": "SaiChandanSingh won by resignation",
    "opening_name": null,
    "opening_eco": null
  },
  "message": "Game uploaded. Analysis started. Connect to WebSocket to receive results."
}
```

**Response 400 Bad Request** (invalid PGN)
```json
{
  "detail": "Invalid PGN: could not parse move 12. Unexpected token 'Nxb8'."
}
```

---

### GET `/api/games/{game_id}`
Get current game status and metadata.

**Response 200**
```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "analysing",
  "metadata": { "...": "..." },
  "total_moves": 54,
  "moves_analysed": 12,
  "summary": null
}
```

**Response 404**
```json
{ "detail": "Game not found." }
```

---

### GET `/api/games/{game_id}/analysis`
Get full cached analysis (only useful once status = `complete`).

**Response 200**
```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "complete",
  "metadata": { "...": "..." },
  "moves": [
    {
      "move_index": 0,
      "move_number": 1,
      "colour": "white",
      "move_san": "e4",
      "move_uci": "e2e4",
      "fen_before": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "fen_after": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "eval_before_cp": 20,
      "eval_after_cp": 15,
      "cp_loss": 0,
      "best_move_uci": "e2e4",
      "best_move_san": "e4",
      "top_candidates": [
        { "move_uci": "e2e4", "move_san": "e4", "score_cp": 15 },
        { "move_uci": "d2d4", "move_san": "d4", "score_cp": 12 },
        { "move_uci": "g1f3", "move_san": "Nf3", "score_cp": 10 }
      ],
      "category": "Best",
      "category_symbol": "✓",
      "comment": "A classic central pawn advance. Controlling e4 and d5 with tempo.",
      "comment_source": "llm",
      "opening_name": "King's Pawn Opening",
      "opening_eco": "B00"
    }
  ],
  "summary": {
    "white_accuracy": 61.2,
    "black_accuracy": 78.4,
    "white_category_counts": {
      "Brilliant": 0, "Great": 1, "Best": 10, "Good": 8,
      "Inaccuracy": 4, "Mistake": 3, "Blunder": 1
    },
    "black_category_counts": {
      "Brilliant": 1, "Great": 3, "Best": 14, "Good": 7,
      "Inaccuracy": 2, "Mistake": 0, "Blunder": 0
    },
    "total_moves": 54,
    "turning_point_move_index": 22
  }
}
```

---

### GET `/api/llm/providers`
List all configured LLM providers and their availability.

**Response 200**
```json
{
  "providers": [
    {
      "id": "ollama",
      "name": "Ollama (Local)",
      "is_active": true,
      "is_available": true,
      "model": "llama3.1:8b",
      "type": "local"
    },
    {
      "id": "groq",
      "name": "Groq (Cloud)",
      "is_active": false,
      "is_available": true,
      "model": "llama-3.1-8b-instant",
      "type": "cloud"
    },
    {
      "id": "huggingface",
      "name": "HuggingFace Inference",
      "is_active": false,
      "is_available": false,
      "model": "HuggingFaceH4/zephyr-7b-beta",
      "type": "cloud"
    }
  ],
  "fallback_active": false
}
```

---

### POST `/api/llm/provider`
Switch the active LLM provider at runtime (no server restart required).

**Request**
```json
{ "provider_id": "groq" }
```

**Response 200**
```json
{
  "active_provider": "groq",
  "status": "switched",
  "message": "Switched to Groq (Cloud). Model: llama-3.1-8b-instant."
}
```

**Response 200 (provider unavailable, fallback activated)**
```json
{
  "active_provider": "groq",
  "status": "unavailable_fallback_active",
  "message": "Groq is unreachable. Template fallback comments will be used."
}
```

**Response 400**
```json
{ "detail": "Unknown provider 'xyz'. Valid options: ollama, groq, huggingface." }
```

---

### GET `/api/health`
Health check for all system components.

**Response 200**
```json
{
  "status": "ok",
  "stockfish": "ok",
  "stockfish_depth": 18,
  "llm_provider": "ollama",
  "llm_status": "ok",
  "llm_fallback_active": false
}
```

**Response 200 (degraded)**
```json
{
  "status": "degraded",
  "stockfish": "ok",
  "stockfish_depth": 18,
  "llm_provider": "ollama",
  "llm_status": "unavailable",
  "llm_fallback_active": true
}
```

---

## 2. WebSocket Endpoint

### WS `/ws/games/{game_id}/analysis`

Connect immediately after receiving the `game_id` from the upload response. The server streams messages as analysis progresses.

**Connection**
```
ws://localhost:8000/ws/games/550e8400-e29b-41d4-a716-446655440000/analysis
```

**Message Flow:**
```
CLIENT connects
  SERVER → progress  (moves_done: 0, status: "analysing")
  SERVER → move_result  (move_index: 0)
  SERVER → move_result  (move_index: 1)
  ...
  SERVER → move_result  (move_index: N-1)
  SERVER → complete   (summary: {...})
CLIENT disconnects
```

**Message: `progress`**
```json
{
  "type": "progress",
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "moves_done": 5,
  "total_moves": 54,
  "status": "analysing"
}
```
*Sent every 5 moves as a keep-alive / UI progress indicator.*

**Message: `move_result`**
```json
{
  "type": "move_result",
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "move_index": 7,
  "total_moves": 54,
  "move": {
    "move_index": 7,
    "move_number": 4,
    "colour": "white",
    "move_san": "Bb5",
    "move_uci": "f1b5",
    "fen_before": "r1bqkbnr/ppp1pppp/2n5/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 4",
    "fen_after": "r1bqkbnr/ppp1pppp/2n5/1B1pP3/8/8/PPPP1PPP/RNBQKB1R b KQkq - 1 4",
    "eval_before_cp": 45,
    "eval_after_cp": 40,
    "cp_loss": 0,
    "best_move_uci": "f1b5",
    "best_move_san": "Bb5",
    "top_candidates": [
      { "move_uci": "f1b5", "move_san": "Bb5", "score_cp": 40 },
      { "move_uci": "f1c4", "move_san": "Bc4", "score_cp": 30 },
      { "move_uci": "d1g4", "move_san": "Qg4", "score_cp": 20 }
    ],
    "category": "Best",
    "category_symbol": "✓",
    "comment": "Pinning the knight to the king — a Ruy Lopez theme that creates immediate pressure on Black's center.",
    "comment_source": "llm",
    "opening_name": "Ruy Lopez",
    "opening_eco": "C60"
  }
}
```

**Message: `complete`**
```json
{
  "type": "complete",
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary": {
    "white_accuracy": 61.2,
    "black_accuracy": 78.4,
    "white_category_counts": { "Brilliant": 0, "Great": 1, "Best": 10, "Good": 8, "Inaccuracy": 4, "Mistake": 3, "Blunder": 1 },
    "black_category_counts": { "Brilliant": 1, "Great": 3, "Best": 14, "Good": 7, "Inaccuracy": 2, "Mistake": 0, "Blunder": 0 },
    "total_moves": 54,
    "turning_point_move_index": 22
  }
}
```

**Message: `error`**
```json
{
  "type": "error",
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Stockfish failed to evaluate position at move 34.",
  "move_index": 34
}
```
*Non-fatal: analysis continues. The failed move gets `category: "Good"` and a fallback comment.*

---

## 3. CORS Configuration

The backend must allow the React dev server origin:

```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.server.cors_origins,  # from config.yaml
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 4. Error Response Format

All error responses follow FastAPI's standard format:
```json
{
  "detail": "Human-readable error message here."
}
```

HTTP status codes used:
- `202` — Upload accepted, analysis started
- `200` — Success
- `400` — Bad request (invalid PGN, invalid provider ID)
- `404` — Game not found
- `422` — Validation error (Pydantic schema mismatch)
- `500` — Internal server error (Stockfish crash, unexpected exception)

---

## 5. Frontend API Client (`frontend/src/api/`)

```typescript
// client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 15000,
});

// endpoints.ts
import { apiClient } from './client';
import type { UploadPGNResponse, GameDetailResponse, FullAnalysisResponse, LLMProviderInfo, SwitchProviderResponse } from '../types/chess';

export const uploadPGN = (pgn: string) =>
  apiClient.post<UploadPGNResponse>('/api/games/upload', { pgn });

export const getGame = (gameId: string) =>
  apiClient.get<GameDetailResponse>(`/api/games/${gameId}`);

export const getFullAnalysis = (gameId: string) =>
  apiClient.get<FullAnalysisResponse>(`/api/games/${gameId}/analysis`);

export const getLLMProviders = () =>
  apiClient.get<{ providers: LLMProviderInfo[]; fallback_active: boolean }>('/api/llm/providers');

export const switchLLMProvider = (providerId: string) =>
  apiClient.post<SwitchProviderResponse>('/api/llm/provider', { provider_id: providerId });

// WebSocket helper
export const createAnalysisSocket = (gameId: string): WebSocket => {
  const wsBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
    .replace('http', 'ws');
  return new WebSocket(`${wsBase}/ws/games/${gameId}/analysis`);
};
```

---

*End of api-contracts.md — v1.0*
