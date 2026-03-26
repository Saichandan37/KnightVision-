# KnightVision

KnightVision analyses your chess games using Stockfish and explains every move in plain English via an AI coach. Paste a PGN, click Analyse, and get a colour-coded move list with accuracy scores, eval bars, and coaching comments — all in your browser.

---

## Quick Start

```bash
git clone https://github.com/your-org/knightvision.git && cd knightvision
cp .env.example .env          # optional: add GROQ_API_KEY for cloud LLM
docker compose up --build
```

Open **http://localhost:3000**, paste a PGN, and click **Analyse**.

> **First run:** Docker pulls the `llama3.1:8b` model (~4 GB) into the `ollama_data` volume. This takes a few minutes once; subsequent starts are instant.

---

## LLM Provider Setup

KnightVision supports three LLM backends. Switch between them at runtime using the **Provider** dropdown in the top bar.

| Provider | API Key Required | Model | How to get access |
|---|---|---|---|
| **Ollama** (default) | None — runs locally | `llama3.1:8b` | Bundled in `docker-compose.yml`; auto-pulled on first start |
| **Groq** | Free — `GROQ_API_KEY` | `llama3-8b-8192` | Sign up at [console.groq.com](https://console.groq.com/keys) |
| **HuggingFace** | Free — `HUGGINGFACE_API_KEY` | `Mistral-7B-Instruct-v0.2` | Get token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

Add your key(s) to `.env` before running:

```env
GROQ_API_KEY=gsk_...
HUGGINGFACE_API_KEY=hf_...
```

If a provider is unavailable (no key, network error, timeout), KnightVision automatically falls back to template-based comments so analysis always completes.

---

## Configuration Reference

All settings live in `config.yaml` at the project root.

### `stockfish`

| Key | Default | Description |
|---|---|---|
| `path` | `null` | Path to Stockfish binary. `null` = auto-detect (`stockfish` on Linux/Docker, `/opt/homebrew/bin/stockfish` on macOS) |
| `depth` | `18` | Analysis depth (10–22 recommended; higher = slower but more accurate) |
| `threads` | `2` | CPU threads allocated to Stockfish |
| `multipv` | `3` | Number of top candidate moves returned per position |

### `classification.thresholds`

Move quality is determined by centipawn loss (cp_loss = eval before move − eval after move, from the moving player's perspective).

| Key | Default | Move Category |
|---|---|---|
| `brilliant_max_cp_loss` | `0` | Brilliant (also requires sacrifice detection) |
| `great_max_cp_loss` | `5` | Great |
| `best_max_cp_loss` | `10` | Best |
| `good_max_cp_loss` | `20` | Good |
| `inaccuracy_max_cp_loss` | `50` | Inaccuracy |
| `mistake_max_cp_loss` | `150` | Mistake |
| *(above mistake threshold)* | — | Blunder |

### `llm`

| Key | Default | Description |
|---|---|---|
| `default_provider` | `"ollama"` | Active provider at startup (`ollama` \| `groq` \| `huggingface`). Override with `LLM_DEFAULT_PROVIDER` env var |
| `timeout_seconds` | `10` | Max wait for LLM response before falling back to template comment |
| `ollama.base_url` | `"http://localhost:11434"` | Ollama API endpoint. Set automatically to `http://ollama:11434` inside Docker |
| `ollama.model` | `"llama3.1:8b"` | Ollama model name |
| `groq.model` | `"llama3-8b-8192"` | Groq model name |
| `huggingface.model` | `"mistralai/Mistral-7B-Instruct-v0.2"` | HuggingFace model name |

### `server`

| Key | Default | Description |
|---|---|---|
| `host` | `"0.0.0.0"` | Bind address |
| `port` | `8000` | HTTP port |
| `log_level` | `"info"` | Logging level (`info` \| `debug`) |
| `cors_origins` | `["http://localhost:5173", ...]` | Allowed CORS origins. Override with `ALLOWED_ORIGINS` env var (comma-separated) |

### `accuracy`

| Key | Default | Description |
|---|---|---|
| `max_cp_scale` | `300` | CP loss at which accuracy = 0% (linear scale) |

---

## Architecture Overview

```
Browser (React + Zustand)
│
│  HTTP POST /api/analysis/upload  →  202 Accepted {game_id}
│  WebSocket  /ws/analysis/{game_id}  ←  move_result (streamed) + analysis_complete
│
▼
Nginx (port 3000)
│  /api/*  →  proxy  →  FastAPI (port 8000)
│  /ws     →  proxy  →  FastAPI WebSocket
│  /*      →  serve  →  Vite dist (static HTML/JS/CSS)
│
▼
FastAPI backend
├── POST /api/analysis/upload   — PGN validation, game_id, background task kick-off
├── WS   /ws/analysis/{game_id} — streams move_result messages; buffered replay on late join
├── GET  /api/llm/status        — provider health booleans + active provider name
├── POST /api/llm/provider      — runtime provider switch
│
├── Analysis Orchestrator
│   ├── python-chess PGN parser
│   ├── Stockfish service  (asyncio.to_thread — never blocks event loop)
│   │   └── UCI subprocess at depth 18, multipv 3
│   ├── Move Classifier    (7 tiers via cp_loss thresholds)
│   └── LLM Commentary     (provider registry with fallback chain)
│       ├── OllamaProvider  → http://ollama:11434  (Docker sidecar)
│       ├── GroqProvider    → api.groq.com         (GROQ_API_KEY)
│       ├── HuggingFaceProvider → api-inference.huggingface.co
│       └── FallbackProvider → template comment (always available)
│
└── In-memory game store  (game_id → status + moves + metadata)

Ollama sidecar (port 11434) — local LLM inference, llama3.1:8b
```

---

## Development Setup

Run backend and frontend independently without Docker.

### Prerequisites

- Python 3.12+
- Node 20+
- Stockfish installed (`brew install stockfish` on macOS, `apt-get install stockfish` on Linux)
- Ollama installed locally if using the Ollama provider (`brew install ollama`)

### Backend

```bash
cd /path/to/knightvision

pip install -r backend/requirements.txt

# start Ollama in a separate terminal (optional — skip if using Groq/HuggingFace)
ollama serve &
ollama pull llama3.1:8b

uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now live at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts at http://localhost:5173 and proxies `/api` and `/ws` to `http://localhost:8000` automatically.

### Run tests

```bash
# Backend
python3 -m pytest backend/tests/ -q

# Frontend
cd frontend && npx vitest run
```

---

## Deploy to Railway

Railway hosts the **backend** (FastAPI + Stockfish). Deploy the frontend separately to Vercel, Netlify, or another Railway service.

### Prerequisites

- [Railway CLI](https://docs.railway.app/develop/cli) installed and logged in (`railway login`)
- A [Groq API key](https://console.groq.com/keys) (free tier)

### Step 1 — Create a new Railway project

```bash
railway init
railway up    # deploys backend using railway.json
```

### Step 2 — Set environment variables in the Railway dashboard

| Variable | Value | Required |
|---|---|---|
| `GROQ_API_KEY` | Your Groq key | ✅ |
| `LLM_DEFAULT_PROVIDER` | `groq` | ✅ |
| `ALLOWED_ORIGINS` | Your frontend URL (e.g. `https://your-app.vercel.app`) | Recommended |

### Step 3 — Deploy the frontend

```bash
cd frontend
VITE_API_BASE_URL=https://your-backend.up.railway.app \
  npm run build
# deploy dist/ to Vercel / Netlify / Railway static
```

Or set `VITE_API_BASE_URL` as a build-time env var in your Vercel/Netlify project settings.

### Verify

```bash
curl https://your-backend.up.railway.app/health
# {"status":"ok"}

curl https://your-backend.up.railway.app/api/llm/status
# {"providers":{"ollama":false,"groq":true,"huggingface":false},"active":"groq"}
```

### Prod override (Docker, no Ollama)

Use Groq locally without running the Ollama sidecar:

```bash
cp .env.example .env    # set GROQ_API_KEY
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

---

## Contributing

Bug reports and pull requests are welcome.

1. **Open an issue** before starting significant work — describe the bug or feature clearly.
2. **Fork** the repository and create a branch: `git checkout -b fix/your-bug-name`
3. **Write tests** — backend (`pytest`) and frontend (`vitest`) both required for new behaviour.
4. **Open a PR** against `main` with a clear description of the change and how to test it.
5. Ensure `pytest` and `vitest run` both pass with no regressions before requesting review.

For technical depth — data models, API contracts, LLM provider spec — see [`ARCHITECTURE.md`](ARCHITECTURE.md).
