---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-KnightVision--2026-03-22.md
  - docs/project-context.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/llm-provider-spec.md
workflowType: prd
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 4
---

# Product Requirements Document - KnightVision

**Author:** Sai Chandan
**Date:** 2026-03-22

## Executive Summary

KnightVision is a free, open-source chess game analysis tool that gives club-level players (Elo 800–1500) what no free tool currently provides: the *why* behind every move, in plain English, instantly. Upload a PGN, and within seconds you're watching your game auto-play on an interactive board with move classifications, a best-move arrow, and a 1–2 sentence coaching comment for every critical moment — no account, no subscription, no cost.

The product is built on a stack that costs nothing to operate: Stockfish (local binary, GPL-3.0) for engine accuracy, and a pluggable LLM layer (Ollama locally, Groq or HuggingFace as cloud options) for natural language commentary. Groq's free tier alone supports ~14,400 LLM calls per day; Ollama runs fully offline. This stack was not viable a year ago — per-query LLM costs made free commentary economically impossible. Ollama and Groq's free tier changed that. That's why this is being built now.

The GitHub repository is the primary distribution mechanism. KnightVision is designed to be cloned, configured, and running in under 10 minutes via a single `docker compose up`. The architecture — pluggable LLM providers, Stockfish subprocess, no database, no auth — is intentionally forkable. Anyone should be able to swap in their preferred LLM, self-host, and have a private analysis tool. The code quality, README, and Docker setup are first-class product requirements, not afterthoughts.

Target user: Alex, 24, Elo 900–1400, playing blitz online after work. Just lost a game they almost won. The Chess.com analysis panel is locked. They download the PGN. KnightVision gives them the blunder identified, the best move shown, and a single line that names the tactical idea they missed — in under 60 seconds, free.

### What Makes This Special

The differentiator is not a feature — it is access. Chess.com has move classification and commentary: paywalled. Lichess has Stockfish accuracy: free, but no language, no coaching, no explanation. No free tool combines engine accuracy *with* natural language coaching *in* an interactive playback experience. KnightVision does.

The core insight: the "aha moment" — *this drops the rook; Nf5 forks the king and queen* — is the moment learning happens. That moment is currently paywalled at £15/month. Making it free, for every club player, every game, every night — that is the product.

The builder is the user. The product is calibrated against real games from an Elo 1116 player, not an imagined persona. That earned intuition is a structural advantage over tools built for hypothetical users.

## Project Classification

| Attribute | Value |
|---|---|
| Project Type | Web application (React SPA) with FastAPI backend |
| Domain | General (entertainment / hobby — no regulated domain) |
| Complexity | Medium (real-time WebSocket streaming, Stockfish subprocess, pluggable LLM adapters, mobile-first responsive UI) |
| Project Context | Brownfield — architecture, data models, API contracts, and LLM provider spec are fully defined |

## Success Criteria

### User Success

- **PGN format coverage (primary acceptance criterion):** Parses and analyzes PGN exports from Chess.com (custom headers) and Lichess (inline clock annotations `{ [%clk ...] }`) without error. This is the demo-readiness gate — not a secondary compatibility concern.
- **Engagement signal:** User clicks at least one blunder or mistake in the move list per session. A session with zero move interaction is a passive view, not an engaged review.
- **Commentary quality bar:** LLM comment names a specific tactic or idea (e.g., "this hangs the rook to a back-rank mate threat") — not generic affirmations ("this was a mistake"). Generic comments count as LLM fallback failures even if the HTTP call succeeded.
- **Flow completion (table stakes):** PGN upload → Stockfish analysis → board renders with move list and commentary — end to end, without error. This is the baseline; everything else is layered on top.
- **Qualitative outcome:** User reports improved pattern recognition over time — fewer repeated mistakes seen in analysis sessions three months after first use. This is felt, not instrumented.

### Business/Builder Success

- **Adoption signal:** One GitHub issue opened by a stranger (bug report or feature request from someone the author does not know). This is the "it's real" indicator — more meaningful than any star count.
- **Community validation:** One post in r/chess, r/chessbeginners, or equivalent, with replies indicating genuine usage (not just upvotes).
- **Personal learning loop:** ≥20 own games reviewed within 3 months of launch.
- **Portfolio signal:** GitHub stars ≥50 within 3 months — acknowledged as directional, not definitive.
- **Demo-readiness:** Live demo during a job interview or portfolio conversation — zero crashes, full flow from PGN paste to commentary — without preparation beyond opening a browser tab.

### Technical Success

- **Analysis latency:** <60s target, <90s acceptable, >2 minutes signals a performance problem requiring investigation.
- **LLM fallback rate:** <10% of analysis requests fall back to generic/error commentary; <30% acceptable; above 30% indicates a systemic provider issue.
- **Board render/animation:** <100ms target per move render; <500ms acceptable; above that is visually disruptive.
- **Self-host bar:** `docker compose up` → fully functional instance in under 10 minutes on a machine with Docker installed. This is a first-class requirement, not a deployment note.

### Measurable Outcomes

| Outcome | Target | Acceptable | Concern |
|---|---|---|---|
| PGN parse errors (Chess.com / Lichess) | 0 | 0 | Any |
| Consecutive smoke-test analyses without crash | 10 | 10 | <10 |
| Analysis end-to-end time | <60s | <90s | >2min |
| LLM fallback / error commentary rate | <10% | <30% | >30% |
| Board move render time | <100ms | <500ms | >500ms |
| Own games reviewed (3 months post-launch) | 20+ | 10+ | <5 |
| GitHub issues from strangers (3 months) | 1+ | 1 | 0 |
| Docker self-host time | <10min | <10min | >30min |

## Product Scope

### Phase 1 — MVP (Ship This)

- PGN upload (file) and paste (text input)
- Stockfish analysis: move classification (Brilliant / Great / Best / Good / Inaccuracy / Mistake / Blunder) and best-move identification
- LLM commentary layer: 1–2 sentence coaching comment per classified move, streamed via WebSocket
- Pluggable LLM provider selector: top-bar dropdown (Ollama / Groq / HuggingFace) — not a settings drawer, locked as Phase 1 core
- Interactive board: auto-play with configurable speed, click-to-navigate move list, best-move arrow overlay
- Move list panel: move notations with classification badges, clickable navigation
- Mobile-first responsive layout (primary target: 375px+)
- Docker Compose single-command deployment (`docker compose up`)
- Hosted instance (Railway or Render free tier, Groq as default LLM) — live URL for community distribution
- Opening detection: ECO code + opening name via bundled JSON (~200KB), displayed as badge (e.g. "B90 · Sicilian: Najdorf")
- README: clone → configure → run in under 10 minutes

### Phase 1.5 — Eval Graph (Before Any Phase 2 Work)

- Evaluation graph: centipawn score plotted across all moves, click-to-navigate synced with board
- Analysis settings drawer: Stockfish depth and speed controls (excluded from Phase 1 to reduce surface area)

### Phase 2+ — Growth and Vision

- Opening identification improvements (deeper ECO matching, variation names)
- Tactical theme labeling (fork, pin, skewer, discovered attack, back-rank weakness, etc.)
- Game history: store and revisit multiple analyzed games
- Side-by-side game comparison
- Export annotated PGN with KnightVision commentary embedded
- Community / sharing features

## User Journeys

### Journey 1 — Alex: The Post-Loss Ritual (Happy Path)

It's 11:14pm. Alex just resigned a blitz game on Chess.com — a game they almost won. The position was even until somewhere around move 22, then it collapsed fast. The coloured dots on Chess.com's move list tell them where: a red blunder. The analysis panel is locked.

Alex downloads the PGN. Opens KnightVision in the same browser window. The screen shows a single drop zone: *"Drop your PGN file here."* They drop it.

A progress bar appears: *"Analysing move 1 of 54…"* The board starts rendering move by move as results stream in. The move list populates in real time — green badges, blue badges, then, around move 22, a red one. Blunder.

Alex doesn't wait for analysis to finish. They click the red move. The board jumps to that position. A red arrow appears on the board pointing from their queen to the square where it moved. A blue arrow — the best-move arrow — points to a different square entirely. The move detail card shows the badge, the eval swing, and one line:

*"Moving the queen here allows Nf5+ forking king and rook — Black wins material immediately."*

That is the aha moment. Not a number. Not an engine line. A sentence that names the specific tactic they missed. Ten seconds from upload. Free.

Alex clicks through two more flagged moves, reads two more comments, closes the tab.

**Capabilities revealed:** PGN upload, WebSocket streaming, real-time move list population, click-to-navigate, move classification badges, best-move arrow, move detail card with coaching comment.

---

### Journey 2a — Alex: LLM Unavailable (Backend Resilience)

Alex opens KnightVision at 11pm. Groq is the active provider — but their internet is spotty and the Groq health check times out. KnightVision doesn't stall. It doesn't show an error. It runs the analysis.

The blunder on move 22 is classified correctly. The best-move arrow appears. The comment in the detail card reads: *"A serious blunder! Nf5 was essential to stay in the game."*

It's a template. Alex doesn't know that. The classification is right, the arrow is right, the template comment is functional. The provider status indicator in the top bar shows Groq as amber — unavailable — but the board works.

Alex reads the comment. It's less specific than a real coaching comment — it names the move but not the idea. Acceptable for tonight. They switch the provider to Ollama via the top-bar dropdown and run the next game with Ollama running locally.

**Pass/fail gate:** The app must continue to function when the LLM provider fails. Fallback template comments must activate silently and completely — no broken cards, no missing content, no blank panels. The provider status indicator is the only visible signal.

**Capabilities revealed:** Graceful LLM fallback, provider status indicators, runtime provider switching, template comment completeness (functional even if generic).

---

### Journey 2b — Alex: Mobile Review (UI/Layout)

Alex is in bed, laptop closed. They pull up KnightVision on their phone. The board fills the screen width — square, no clipping. Below it: the classification badges, the current move detail card, the coaching comment.

They swipe left. Move advances. Swipe right. Move goes back. They swipe to move 22 — the blunder — and the board updates, the arrow appears, the card shows the comment. The text is readable without zooming. The badge is visible at a glance.

They tap the move list. It slides up as a bottom sheet. The blunder is visible in the list. They tap it. Board jumps. Arrow appears. Comment loads.

**Pass/fail gate:** On a 375px-wide viewport, every Phase 1 feature must be reachable and readable without horizontal scrolling or zooming. Swipe navigation must work reliably on touch. The bottom sheet move list must open and close without layout breakage.

**Capabilities revealed:** Responsive board sizing, swipe navigation, bottom sheet move list, mobile typography legibility, touch target sizing for badges and controls.

---

### Journey 3 — The Self-Hoster: Clean Machine Setup

A developer finds KnightVision on GitHub via a Reddit thread. They play chess casually — Elo 1050. They want their own private instance.

They read the README. Three steps: clone the repo, copy `.env.example` to `.env` and add their Groq API key, run `docker compose up`.

**Pass/fail gate:** `docker compose up` on a machine with Docker installed and nothing else pre-configured must produce a working analysis board. No prior Python, no prior Node, no manual dependency installation. If anything requires a step not in the README, the journey has failed.

The command pulls images, starts the backend container and Ollama container, runs health checks, reports ready. They open the browser. They drop a PGN. Analysis runs — Ollama handles commentary locally. The blunder on move 31 is classified, the best-move arrow appears, the comment names the knight fork they missed.

Later, they open a GitHub issue: *"Ollama container takes 90s to pull the model on first run — README should warn about this."* That issue is the adoption signal from the success criteria.

**Capabilities revealed:** Docker Compose correctness, README completeness, Ollama container startup and model pull, zero-configuration path from clone to working tool.

---

### Journey 4 — The Reddit Visitor: No Onboarding (First-Time User)

A post appears in r/chessbeginners: *"Built a free Chess.com analysis alternative — no subscription, no account. Drop your PGN and get coaching comments on every move."* A stranger clicks the link.

They arrive at a screen with a chess board and a drop zone. The label reads: *"Drop your PGN file here."*

They don't read anything else. They don't need to. They know what a PGN is. They download their last game from Lichess. They drop it.

The board animates. The move list populates. They find the mistake that cost them the game. They read the comment. They leave. No account created. No email entered. No tutorial completed.

**Pass/fail gate:** "Drop your PGN file here" is the entire instruction. If a first-time visitor who knows what a PGN is needs any additional guidance to start an analysis, the UI has failed. Discoverability must require zero clicks beyond the drop action itself.

**Capabilities revealed:** Upload affordance clarity, zero-onboarding requirement, self-explanatory UI, Lichess PGN compatibility (with clock annotations), no-auth session model.

---

### Journey Requirements Summary

| Capability Area | Required By |
|---|---|
| PGN upload (file drop + text paste) | Journeys 1, 2a, 4 |
| WebSocket streaming + real-time move list | Journeys 1, 2a |
| Move classification badges | Journeys 1, 2a, 2b |
| Best-move arrow on board | Journeys 1, 2a, 2b |
| Move detail card with coaching comment | Journeys 1, 2a, 2b |
| LLM fallback (template comments, silent) | Journey 2a |
| Provider status indicator + top-bar switcher | Journey 2a |
| Mobile-responsive board + swipe navigation | Journey 2b |
| Bottom sheet move list (mobile) | Journey 2b |
| Docker Compose single-command setup | Journey 3 |
| README: clone → configure → run | Journey 3 |
| Zero-onboarding drop zone | Journey 4 |
| Lichess PGN format compatibility | Journey 4 |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Zero-cost coaching commentary (the enabling unlock)**
LLM-generated coaching commentary for chess games has existed in commercial tools. What's new is the cost structure: Ollama enables fully local, offline LLM inference at zero marginal cost; Groq's free tier provides 14,400 cloud LLM calls per day at zero cost. KnightVision is the first product to assemble Stockfish + LLM commentary + interactive board review at $0 operational cost. This is not a feature innovation — it is an access innovation. The "why now" is a specific, datable technical unlock (local capable LLMs + generous cloud free tiers), not a market trend.

**2. Open infrastructure for chess analysis**
KnightVision is designed to be forked, self-hosted, and extended — not to be a closed SaaS. The pluggable LLM adapter architecture (`BaseLLMProvider` ABC with concrete Ollama/Groq/HuggingFace subclasses) means any provider can be added without touching analysis logic. This positions KnightVision as infrastructure rather than an application — a reusable analysis stack that others can build on top of. No existing free chess analysis tool is architected this way.

**3. Streaming analysis as first-class UX**
Most chess analysis tools compute results batch-first, then render. KnightVision streams: Stockfish + LLM results are pushed to the frontend move-by-move via WebSocket as they are computed. The move list populates in real time. This means a user can click on the move that lost them the game before analysis is complete — the aha moment arrives faster. Streaming analysis as a UX driver (not just a performance optimization) is novel in this category.

### Market Context & Competitive Landscape

| Tool | Engine | Commentary | Interactive Board | Free |
|---|---|---|---|---|
| Chess.com Analysis | Stockfish | LLM-quality | Yes | No (£15/mo) |
| Lichess Analysis | Stockfish | None | Yes | Yes |
| KnightVision | Stockfish | LLM (pluggable) | Yes | Yes |

No free tool occupies the KnightVision cell. The product creates a new row in this table.

### Validation Approach

- **Primary validation:** Builder uses KnightVision on their own games (Elo 1116). If the coaching comments correctly identify the tactical ideas missed — fork, pin, back-rank weakness — the LLM layer is working. This is manual, qualitative, and intentional.
- **Streaming validation:** Analysis of a 54-move game at depth 18 must begin delivering moves to the frontend within 3 seconds of upload. First result latency is the streaming validation metric.
- **Open infrastructure validation:** A stranger must be able to clone the repo, run `docker compose up`, and swap the LLM provider from Ollama to Groq via the top-bar selector — without reading source code. If they can, the adapter architecture is genuinely open.

### Risk Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM commentary quality is too generic to be useful | Medium | Prompt specifies: name the tactic, name the piece, don't start with "This move". Template fallback is always available. Quality bar validated on builder's own games before launch. |
| Groq free tier rate limits hit during peak usage | Low (hobby scale) | Ollama local path requires no API key. Template fallback activates silently. Rate limit concern is Phase 2+ at meaningful scale. |
| PGN format variations break parsing | Medium | Chess.com clock annotations and custom headers tested explicitly. Lichess export format tested explicitly. Both are acceptance criteria, not edge cases. |
| Docker Compose setup fails on certain machines | Low-Medium | README specifies Docker version requirements. Clean-machine test is part of the self-host acceptance criteria. |

Additional critical technical risks (centipawn perspective flip and Stockfish subprocess crash) are documented in the Project Scoping → Risk Mitigation Strategy section.

## Web Application Specific Requirements

### Project-Type Overview

KnightVision is a single-page application (React + Vite) with a FastAPI backend. The SPA architecture is appropriate because the product has two distinct views (upload and review) with no server-rendered content, no multi-page navigation, and no SEO requirements. The backend is not a standalone API product — it exists exclusively to serve the frontend analysis pipeline.

### Browser Matrix

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome | 90+ | Primary development target |
| Firefox | 90+ | Full support required |
| Safari | 15+ | Desktop and iOS Mobile Safari |
| Mobile Safari | iOS 15+ | First-class mobile experience |
| Edge | 90+ | Chromium-based, covered by Chrome target |

WebSocket support is required for all supported browsers. `react-chessboard` and `chess.js` must function correctly across all targets. No IE11 or legacy browser support.

### Responsive Design Requirements

| Breakpoint | Layout | Board Behaviour | Move List |
|---|---|---|---|
| Desktop (≥1024px) | Board (60%) + Analysis Panel (40%) side-by-side | Fixed square, max ~500px | Scrollable sidebar |
| Tablet (640–1023px) | Board full width, analysis panel below | Full-width square | Collapsed with expand button |
| Mobile (<640px) | Board fills screen width | Square, fills viewport width | Bottom sheet, slide-up on tap |

**Mobile-specific interactions:**
- Swipe left/right on board: advance/go back one move
- Bottom sheet move list: tap to open, tap outside or swipe down to close
- Touch targets for controls and badges: minimum 44×44px (Apple HIG / WCAG 2.5.5)
- No horizontal scrolling at any supported viewport width

### SEO Strategy

**Out of scope for Phase 1.** KnightVision is a tool interface, not a content site. The upload view has no indexable content. Distribution is community-led via Reddit and GitHub. If Phase 2 adds shareable analysis URLs, those pages will be individually indexable — that work belongs to Phase 2.

Phase 1 minimum: correct `<title>`, `<meta description>`, and Open Graph tags on the upload view for link-preview rendering when shared in Reddit posts or Discord. Not SEO — social sharing.

### Accessibility Level

**Target: WCAG 2.1 AA.** Keyboard navigation is a Phase 1 core feature — the app is substantially keyboard-accessible by design; AA formalises what's already required. Colour contrast on classification badges is an explicit risk area. Full accessibility specification is in the Non-Functional Requirements → Accessibility section.

### Implementation Considerations

- **State management:** Zustand for game state (game_id, moves, current move index, playback state). React context or prop drilling for UI-only state (settings panel open/closed). No Redux — overkill for this scope.
- **WebSocket lifecycle:** Connection opened immediately after upload response. Reconnect on drop during analysis (single retry with exponential backoff). Connection closed on analysis complete or page navigation.
- **Bundle size:** ECO opening database (~200KB) bundled. Recharts (Phase 1.5) deferred. No unnecessary large dependencies in Phase 1 bundle.
- **Error boundaries:** React error boundaries on BoardSection and AnalysisPanel to prevent a component crash from blanking the full UI. Error state must show a useful message, not a white screen.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP. The product is complete when one interaction works perfectly: a user clicks a move flagged as Blunder, a best-move arrow appears on the board, and a one-sentence coaching comment names the specific tactic they missed. Everything in Phase 1 exists to make that interaction reliable, fast, and accessible without friction. No revenue gate. No platform features. No user accounts. The MVP is done when the experience is demoed live without breaking.

**Builder profile:** Solo developer, portfolio context. Scope is intentionally constrained to protect completion. Phase 1.5 and Phase 2+ exist precisely so features that would otherwise stretch Phase 1 have a named home to go to.

**Distribution:** Phase 1 requires two parallel deployment paths:
- **Hosted instance** (Railway or Render free tier, Groq as default LLM provider) — the live URL shared in Reddit posts. Required for Journey 4 to exist. Without this, the Reddit visitor hits a README and bounces.
- **Docker Compose self-host** — the path for the GitHub/developer audience. Required for Journey 3. Stays in the README alongside the live URL.

These are different distribution channels serving different user types. Both are Phase 1.

### MVP Feature Set (Phase 1)

**Core user journeys supported:** All five (Journey 1 happy path, Journey 2a LLM fallback, Journey 2b mobile, Journey 3 self-host, Journey 4 Reddit visitor).

**Must-have capabilities:**

| Capability | Justification |
|---|---|
| PGN upload (file drop + text paste) | Table stakes — no other entry point |
| Stockfish analysis at depth 18 | Engine accuracy is non-negotiable |
| Move classification (7-tier) | Primary visual output of the aha moment |
| LLM coaching commentary (1–2 sentences) | The differentiator — the why behind the move |
| LLM provider selector (top-bar, Ollama/Groq/HuggingFace) | Required to switch providers without config file edits |
| Template fallback (silent, complete) | LLM provider unreliability is guaranteed at hobby scale |
| WebSocket streaming (move-by-move) | UX driver — user can navigate to blunder before analysis completes |
| Best-move arrow on board | Half of the aha moment |
| Move detail card with badge + comment | The other half |
| Interactive playback controls + keyboard nav | Core review experience |
| Swipe navigation (mobile) | Mobile is 40% of primary user sessions |
| Bottom sheet move list (mobile) | Required for mobile move navigation |
| Responsive layout (375px–1024px+) | Mobile-first, not mobile-afterthought |
| Accuracy scores (White / Black %) | Zero additional Stockfish calls; high perceived value |
| Docker Compose single-command deployment | Self-hoster journey pass/fail gate |
| Hosted instance (Railway/Render + Groq) | Reddit visitor journey pass/fail gate |
| README (clone → configure → run ≤10min) | Self-hoster journey completion |
| Opening detection (ECO code + name, bundled JSON) | US-13 in project context; zero API cost, zero Stockfish calls |
| Open Graph tags (social link preview) | Reddit post link rendering |

### Risk Mitigation Strategy

**Critical Technical Risk 1 — Centipawn perspective flip (silent, undetectable failure):**
The move classification formula is `cp_loss = max(0, eval_before + eval_after)` where `eval_after` must be negated because Stockfish returns it from the perspective of the side to move after the move is played (the opponent). If this negation is missing or inverted, every classification is wrong — Blunders appear as Good moves, Best moves appear as Blunders — with no crash, no error, and no visible signal. This is the highest-risk bug in the codebase.

*Mitigation:* A mandatory acceptance test against a known game with pre-verified classifications must pass before any analysis output is trusted. Specifically: take a game with a documented Blunder at a known move, run it through the classifier, and verify the Blunder badge appears at that move. This test must be run once manually during development and codified as an automated test before launch.

**Critical Technical Risk 2 — Stockfish subprocess crash (silent freeze):**
If the Stockfish subprocess crashes mid-analysis, the FastAPI background task dies silently. The WebSocket connection remains open but stops sending messages. The frontend progress bar freezes at the last received move with no error displayed. The user has no recovery path.

*Mitigation:* A dead-man timeout on the frontend: if no WebSocket message is received within 30 seconds of the last message, display an error state ("Analysis stalled — the engine stopped responding") and offer a retry button that re-uploads the same PGN. Backend should also emit a heartbeat ping every 10 seconds during analysis so the frontend can distinguish stall from slow progress.

**Market Risk — Docker barrier for casual users:**
The Reddit visitor will not self-host via Docker. Without a hosted instance, Journey 4 breaks and community distribution fails. *Mitigation:* Hosted instance on Railway or Render free tier is Phase 1 scope.

**Resource Risk — Solo developer, scope creep:**
Phase 1.5 and Phase 2+ features are explicitly named to give scope-pressure items a home. Any feature not in the Phase 1 must-have table is deferred by default. The eval graph is the first item at risk — moved to Phase 1.5 rather than squeezed into Phase 1.

## Functional Requirements

### Game Ingestion

- **FR1:** User can upload a PGN file via drag-and-drop onto the upload zone
- **FR2:** User can upload a PGN file via a file picker dialog
- **FR3:** User can submit a PGN by pasting text directly into an input field
- **FR4:** System validates PGN format client-side before submitting for analysis and surfaces a clear error if invalid
- **FR5:** System parses PGN exports from Chess.com without error, including custom PGN headers
- **FR6:** System parses PGN exports from Lichess without error, including inline clock annotations (`{ [%clk ...] }`)

### Chess Analysis Engine

- **FR7:** System analyses every move in a submitted game using Stockfish at the configured depth
- **FR8:** System computes centipawn loss per move with correct perspective — eval_after is negated because Stockfish returns it from the side-to-move's perspective after the move (the opponent's perspective)
- **FR9:** System classifies each move into one of 7 categories (Brilliant / Great / Best / Good / Inaccuracy / Mistake / Blunder) based on centipawn loss thresholds
- **FR10:** System detects Brilliant moves using the combined criterion of zero centipawn loss and a material sacrifice or tactical pattern
- **FR11:** System identifies the engine's best move for each position
- **FR12:** System identifies the top 3 candidate moves with their scores for each position
- **FR13:** System computes separate accuracy scores for White and Black based on average centipawn loss across their moves
- **FR14:** System streams analysis results to the frontend move-by-move as each move completes, not batch-after-all-moves
- **FR15:** System emits a periodic heartbeat signal during analysis so the frontend can detect stalls versus slow-but-progressing analysis

### LLM Commentary

- **FR16:** System generates a 1–2 sentence coaching comment per move via the active LLM provider
- **FR17:** System falls back to a template comment automatically and silently when the LLM provider is unavailable, errors, or exceeds the timeout
- **FR18:** User can switch the active LLM provider at runtime from the UI without restarting the server
- **FR19:** System reports the current availability status of each configured LLM provider
- **FR20:** Each move's commentary records whether the comment was generated by LLM or a fallback template
- **FR21:** LLM prompts are structured to produce comments that name a specific tactic, piece, or positional idea rather than generic evaluations

### Game Review Interface

- **FR22:** User can view their game replayed move-by-move on an animated chess board
- **FR23:** User can navigate moves forward and backward using on-screen playback controls
- **FR24:** User can navigate moves using keyboard shortcuts (arrow keys, Space bar, Home, End)
- **FR25:** User can play the game in auto-advance mode that advances one move per second until paused or the game ends
- **FR26:** User can click any move in the move list to jump directly to that board position
- **FR27:** User can view the classification badge and symbol for each move in the move list
- **FR28:** User can view the coaching comment for the currently displayed move
- **FR29:** User can view a best-move arrow drawn on the board indicating the engine's recommended move for the current position
- **FR30:** User can toggle the best-move arrow visibility on or off
- **FR31:** User can view an eval bar showing positional advantage continuously updated as moves are navigated
- **FR32:** User can view accuracy scores for White and Black displayed in the game summary header
- **FR33:** User can view a real-time progress indicator during analysis showing how many moves have been completed

### Mobile & Accessibility

- **FR34:** User can navigate moves by swiping left and right on the chess board on touch devices
- **FR35:** User can access the full move list via a bottom sheet on mobile viewports
- **FR36:** System renders all Phase 1 functionality without horizontal scrolling on viewports from 375px to 1024px and above
- **FR37:** All interactive elements are operable via keyboard with visible focus indicators
- **FR38:** Move classification badge colours meet WCAG 2.1 AA contrast ratio against the background colour in use
- **FR39:** Board pieces, playback controls, eval bar values, and classification badges have accessible labels readable by screen readers

### Analysis Resilience

- **FR40:** System activates template fallback comments automatically when the LLM provider fails or times out, without requiring any user action
- **FR41:** Frontend detects when analysis has stalled — defined as no WebSocket message received within 30 seconds of the last message — and displays an error state with a clear message
- **FR42:** User can retry a stalled or failed analysis from the error state without re-uploading the PGN
- **FR43:** System displays a clear error message with recovery guidance when analysis fails fatally (e.g., Stockfish crash, invalid game state)

### Deployment & Distribution

- **FR44:** The complete application stack starts with a single `docker compose up` command on any machine with Docker installed, requiring no prior local dependencies
- **FR45:** A publicly accessible hosted instance exists at a stable URL where users can analyse games without local setup
- **FR46:** The README provides complete setup instructions — clone, configure, run — completable in under 10 minutes by a developer unfamiliar with the codebase
- **FR47:** The upload view includes Open Graph metadata so link previews render correctly when the URL is shared on Reddit, Discord, or similar platforms

### Opening Detection

- **FR48:** System displays game metadata in the review header — player names, Elo ratings, result, and date — parsed from PGN headers
- **FR49:** System detects the opening played from the game's moves and displays the ECO code and opening name as a badge (e.g. "B90 · Sicilian: Najdorf") using a bundled ECO JSON lookup requiring no network call
- **FR50:** System falls back to "Unknown Opening" when no ECO match is found

## Non-Functional Requirements

### Performance

| Requirement | Target | Acceptable | Concern Threshold |
|---|---|---|---|
| Full analysis — 54-move game at depth 18 | <60s | <90s | >2min |
| WebSocket — first move result after upload | <3s | <5s | >10s |
| WebSocket — heartbeat interval during analysis | Every 10s | — | >30s without message = stall |
| Board move render / animation | <100ms | <500ms | >500ms |
| Initial SPA bundle load (4G connection) | <3s | <5s | >8s |
| LLM provider response timeout | 10s | — | Fallback triggers at 10s |
| Docker self-host: `docker compose up` to ready | <10min | <10min | >30min |

Performance is a product differentiator: a user who uploads a PGN and waits more than 2 minutes has likely abandoned. The 60-second target exists because the aha moment must feel fast, not just eventually appear.

### Security

KnightVision has a minimal security surface — no user accounts, no PII, no payments, no persistent database. Security requirements are scoped accordingly:

- **API key handling:** Groq and HuggingFace API keys are stored in `.env` only, never committed to the repository, never exposed in frontend responses or logs. `.env.example` provided; `.env` in `.gitignore`.
- **CORS:** Backend allows requests only from explicitly configured origins (frontend dev and preview URLs). No wildcard CORS in any deployment.
- **No user data persistence:** PGN content and analysis results exist in-memory per session only. No user data is written to disk, logged, or transmitted to third parties beyond the LLM provider API call.
- **LLM prompt content:** PGN positions (FEN strings) are sent to cloud LLM providers (Groq, HuggingFace) as part of the prompt. Users should be aware their game data is transmitted to these providers when cloud LLMs are active. Ollama is the offline-only option.
- **Dependency hygiene:** No dependencies with known critical CVEs at time of initial release. `npm audit` and `pip-audit` must pass clean before launch.

### Accessibility

- **Standard:** WCAG 2.1 AA
- **Keyboard navigation:** All interactive elements operable without a pointing device. Tab order logical. Focus states visible and distinguishable.
- **Colour contrast:** Move classification badge colours (emerald, blue, violet, cyan, yellow, orange, red) must meet 4.5:1 contrast ratio for text and 3:1 for UI components against the dark background. This is an explicit risk area given the colour-coded move list is a primary UI element.
- **Eval bar:** Positional advantage must be conveyed by both colour and a numeric or labelled indicator — not colour alone.
- **Screen reader:** Board state, move classifications, coaching comments, and playback controls must have ARIA labels sufficient for a screen reader to describe them.
- **Animation safety:** Board piece animations and eval bar transitions must not flash at frequencies above 3Hz (WCAG 2.3.1 — seizure risk).

### Integration

**Stockfish subprocess:**
- Must initialise and respond to UCI commands within 5 seconds of backend startup
- If Stockfish fails to initialise, backend must report `status: degraded` at `/api/health` and reject PGN uploads with a clear error
- Stockfish binary sourced via `stockfish` PyPI package (auto-downloads correct platform binary) or overridden by `binary_path` in `config.yaml`

**LLM Providers:**
- Health check per provider must complete within 4 seconds (Ollama: 3s, Groq/HuggingFace: 4s)
- Generate call timeout: 10 seconds — fallback template activates on expiry
- Provider switching must take effect on the next analysis call, not require in-flight analysis to restart
- All three providers (Ollama, Groq, HuggingFace) must use the same `BaseLLMProvider` interface — no provider-specific logic outside their adapter class

**WebSocket:**
- Connection must be established within 3 seconds of upload response
- Single reconnect attempt on unexpected disconnection during active analysis (exponential backoff, max 1 retry)
- Connection gracefully closed by server on analysis complete or fatal error

### Reliability

- **Hosted instance availability:** No formal SLA — free-tier hosting. Target: available when a Reddit post is active (hours to days). Acceptable: occasional cold-start delays of <30 seconds on Railway/Render free tier.
- **Graceful degradation:** LLM unavailability must not prevent analysis from completing. Template fallback is the reliability strategy — a degraded-but-complete analysis is preferable to a failed one.
- **Error isolation:** A crash in any single analysis component (LLM provider, opening detector) must not cascade to fail the full analysis pipeline. Each component wraps errors and falls back independently.
- **No data loss risk:** No user data is persisted, so there is no data loss risk to mitigate in Phase 1.

