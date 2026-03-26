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

---

## Dev Agent Record

### Implementation Notes

**README.md rewrite:** All 7 required sections present. Quick Start uses exactly 3 commands (`git clone`, `cp .env.example .env`, `docker compose up --build`). Ollama first-run pull note included. "Deploy to Railway" section carried forward from Story 7.2. Test commands included in Development Setup.

**Architecture ASCII diagram:** Shows browser → Nginx → FastAPI with full backend tree (orchestrator, Stockfish, move classifier, LLM registry with all 4 providers). Included in "Architecture Overview" section.

**Configuration Reference:** All `config.yaml` keys documented — stockfish (4 keys), classification thresholds (6 keys), llm (6 keys), server (4 keys + ALLOWED_ORIGINS env var note), accuracy (1 key). Env var overrides documented inline.

**`ARCHITECTURE.md`:** Pointer file at project root listing the full architecture document at `_bmad-output/planning-artifacts/architecture.md` and all supporting docs in `docs/`.

**No code changes:** This story is documentation only. No tests needed. AC is verified by human walkthrough.

### Completion Notes
✅ README and ARCHITECTURE.md complete.
- 7 required sections present in README ✓
- Quick Start: exactly 3 commands ✓
- LLM Provider Setup: table with all 3 providers, no-key Ollama default, free key instructions ✓
- Configuration Reference: all config.yaml keys with defaults and descriptions ✓
- Architecture Overview: ASCII art of full system data flow ✓
- Development Setup: backend + frontend + test commands ✓
- Contributing: issue/PR workflow, test requirement ✓
- `ARCHITECTURE.md` pointer to planning artifacts ✓

---

## File List
- `README.md` (modified — full rewrite with all 7 required sections)
- `ARCHITECTURE.md` (new — pointer to technical architecture docs)

---

## Change Log
- 2026-03-26: Complete README and ARCHITECTURE.md pointer (Sai Chandan / Claude)

---

## Status
review
