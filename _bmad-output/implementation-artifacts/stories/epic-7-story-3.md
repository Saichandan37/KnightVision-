# Story 7.3 — README & Project Documentation

## User Story
As a developer sharing KnightVision publicly, I want a complete README so that a stranger can understand the project, set it up, and start analysing games in under 5 minutes.

## Tasks
- Write `README.md` with sections:
  1. **What is KnightVision** — 2-sentence description + screenshot or GIF of board in action
  2. **Quick Start** — exactly 3 commands: `git clone`, `cp .env.example .env` (with note to add Groq key for cloud LLM), `docker compose up`
  3. **LLM Provider Setup** — table: Ollama (no key, runs locally), Groq (free API key at groq.com), HuggingFace (free token) — how to switch in the UI
  4. **Configuration Reference** — all `config.yaml` keys with defaults and descriptions
  5. **Architecture Overview** — diagram or ASCII art of backend/frontend/Stockfish/LLM flow
  6. **Development Setup** — how to run backend and frontend separately without Docker
  7. **Contributing** — how to open issues and PRs
- The README must pass a "complete stranger test": someone who has never seen the project must be able to reach the analysis board following only the README — no extra Slack DMs required
- Add `ARCHITECTURE.md` pointer to `_bmad-output/planning-artifacts/architecture.md` for technical depth

## Acceptance Criterion
The builder runs through the Quick Start section on a machine with no prior KnightVision setup (or a clean Docker environment) and reaches a working analysis board — upload a PGN, see badges and coaching comments — following only the README instructions, with no steps missing or ambiguous.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
