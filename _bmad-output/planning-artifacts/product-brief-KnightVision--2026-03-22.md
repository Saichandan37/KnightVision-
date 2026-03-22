---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
inputDocuments:
  - docs/project-context.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/llm-provider-spec.md
date: 2026-03-22
author: Sai Chandan
---

# Product Brief: KnightVision

## Executive Summary

KnightVision is a free, open-source chess game analysis tool that gives club-level
players (Elo 800–1500) the one thing existing tools don't: the *why* behind every
move, in plain English, instantly.

Built by a club player for club players, KnightVision combines the accuracy of the
Stockfish chess engine with LLM-generated coaching commentary — delivered as an
interactive animated board review. Upload a PGN, and within seconds you're watching
your game auto-play with move classifications, a best-move arrow, and a one-line
coaching comment for every critical moment. No subscription. No engine dump. Just
the understanding a coach would give you, available for free.

---

## Core Vision

### Problem Statement

After a loss, club-level chess players can see *what* went wrong — a dropped piece
on move 22 — but not *why*. What was the tactical pattern they missed? What was the
correct idea? Current tools answer the first question, not the second:

- **Chess.com** provides excellent analysis (move classification, best-move arrows,
  commentary) but locks it behind a ~£15/month subscription — out of reach for
  casual improvers.
- **Lichess** is free and uses Stockfish, but delivers an engine dump: raw move
  sequences with no natural language explanation. It tells you *Nf5 was better*,
  not *why Nf5 wins*.

Players are left with a red square and no understanding. The knowledge gap isn't
filled — it just costs less to remain confused.

### Problem Impact

Without accessible post-game analysis, club players repeat the same mistakes. They
know their rating isn't improving but can't identify the patterns to fix. The "aha"
moment — *this drops the rook; Nf5 forks king and queen* — is the moment learning
happens. That moment is currently paywalled.

### Why Existing Solutions Fall Short

| Tool | Strength | Critical Gap |
|---|---|---|
| Chess.com Analysis | Polished UI, rich commentary, accurate | £15/month paywall |
| Lichess + Stockfish | Free, accurate engine | Engine lines only — no language, no coaching |
| Manual coach review | Best learning outcome | Expensive, not scalable, not on-demand |

No free tool currently combines engine accuracy *with* natural language coaching
commentary *in* an interactive playback experience.

### Proposed Solution

KnightVision is a web application that accepts a PGN file, analyses every move with
Stockfish at depth 18, classifies each move (Brilliant → Blunder on a 7-tier scale),
generates a 1–2 sentence coaching comment per move via a pluggable LLM (Ollama
locally, Groq or HuggingFace as cloud options), and presents the full game as an
animated interactive board review — free, forever.

The core experience: upload a game, watch it auto-play, see each move flash its
classification badge, read the coaching comment, click the best-move arrow. The
"aha" moment in under 10 seconds per move — no account required, no paywall.

### Key Differentiators

- **Free, always.** Stockfish is local and free. LLM runs on Ollama locally or
  Groq's generous free tier. No subscription model is possible or planned.
- **Built by the user, for the user.** The creator is actively playing at Elo 1116
  and used their own games to define the product. This is not a tool built for an
  imagined user.
- **The "why", not just the "what".** LLM coaching commentary is the primary
  differentiator — Stockfish everywhere, coaching language nowhere else for free.
- **Interactive playback, not a static report.** Animated board, eval bar, move
  navigation, keyboard shortcuts, mobile swipe — a review experience, not a data
  dump.
- **LLM-agnostic and offline-capable.** Pluggable provider architecture means it
  works fully offline (Ollama) or falls back to template comments if no LLM is
  available. The core never breaks.

---

## Target Users

### Primary Users

#### Persona: The Frustrated Improver

**Profile:** Alex, 24. Works a 9-to-5, plays 3–5 blitz games online (Chess.com or
Lichess) most evenings after work. Elo 900–1400. Not a tournament player — chess is
a competitive hobby, a mental outlet, something to be genuinely good at.

**The moment:** It's 11pm. Alex just lost a game they almost won. They can see the
coloured dots on Chess.com's move list — a red one around move 22 — but the analysis
panel is locked behind a subscription. They're too curious and too annoyed to just
close the tab. They download the PGN.

**Device:** Laptop in bed (60%) or phone (40%). Whatever's closest. Mobile is not
an edge case — it's a first-class experience for this user.

**What they want from a session:** Find the 3 moments where it went wrong. Understand
*why* — not a line of moves, a sentence. Then close the tab and go to sleep. They
are not here to study chess theory at midnight. They want the aha moment and then
rest.

**Depth preference:** The eval graph and top candidate moves are there, and they'll
occasionally dig in — but most sessions are: play, identify the blunder, read the
comment, feel the click of understanding, close. The tool must serve the quick
session first; the deep session second.

**Technical comfort:** Knows what a PGN is. Has seen Stockfish before on Lichess.
Already trusts the engine. Doesn't need to be told what centipawns are — but
doesn't need to see them either.

**What makes them say "yes, this is it":** A red Blunder badge, a best-move arrow,
and one line that says *"This drops the rook — Nf5 instead forks the king and
queen."* Ten seconds. Free. Done.

**Elo range (refined):** 900–1400. Below 900 the user doesn't know what a PGN is
and the commentary volume would overwhelm. Above 1400 the user typically has paid
tools or deeper resources. This middle band is the sweet spot: frustrated, curious,
improving, price-sensitive.

---

### Secondary Users

**Out of scope for Phase 1:**

- **Chess coaches** — have professional tooling already; complex multi-student
  workflows are not served by a single-game PGN reviewer.
- **Beginners (< Elo 800)** — don't yet know what a PGN is; commentary depth
  would overwhelm rather than teach.
- **Advanced players (> Elo 1500)** — typically have premium subscriptions or
  access to stronger dedicated tools.

**Incidental user — Developer/chess player:** A secondary audience will emerge
organically via GitHub: developers who also play chess and want to self-host or
contribute. They're not the primary but they'll arrive. The clean architecture and
free/open stack serve them without any extra design effort.

---

### User Journey

**Discovery:** Reddit (r/chess, r/chessbeginners) and Lichess forums — this is
precisely where the primary user lives and where "free Chess.com analysis
alternative" posts get traction. GitHub for the developer-adjacent audience.
Launch strategy is community-led: share it in those communities directly.

**Arrival:** They land on KnightVision with a PGN already in hand (just downloaded
from Chess.com or Lichess). No tutorial. No onboarding flow. The drop zone is
self-explanatory to anyone who knows what a PGN is — and if they got here, they do.

**First use (< 60 seconds):**
1. Drop PGN → upload
2. Progress bar fills as analysis streams in
3. Game auto-plays — move classifications appear as badges
4. They click to the red move — Blunder badge, best-move arrow, one coaching comment
5. Aha moment.

**Success moment:** Reading that first coaching comment that names the tactical idea
they missed. Not a number. Not an engine line. A sentence that sounds like a coach.

**Repeat usage:** They come back after every loss they want to understand. It becomes
the post-game ritual — the thing they do before closing Chess.com. No account
needed, no friction, no cost barrier.

**Framing for the product:** *Stockfish accuracy + coach voice.* The user already
trusts Stockfish from Lichess — that trust is inherited. The LLM commentary is the
differentiator they don't know they want until they read the first comment.

---

## Success Metrics

### North Star Metric

**"Did the user understand why their move was bad?"**

This is the ultimate measure of KnightVision's value — but it is intentionally
unmeasurable in Phase 1, which has no authentication, no user accounts, and no
analytics infrastructure. It is documented here to anchor all proxy metrics: every
KPI below exists to approximate this outcome.

---

### User Success Metrics

**Primary engagement signal: move list interaction**
- A user who clicks on a specific move in the list (rather than only watching
  auto-play) is demonstrably engaged — they found something worth investigating.
  This is the behaviour that indicates the tool is working.
- Target: users navigate to at least one blunder or mistake move per session.

**Session depth proxy (North Star proxy for Phase 1)**
- If a user clicks through more than 5 individual moves in a session, they are
  engaged beyond passive playback. This is the closest measurable approximation
  to "they understood and wanted to understand more."
- This metric requires basic event analytics (no auth needed) and is a Phase 2
  instrumentation task — but the data model should be designed to support it.

**LLM commentary quality bar**
- A comment passes if it names the specific tactical or positional idea in the
  position: *"Dropping the rook here allows a back-rank checkmate in two."*
- A comment fails if it could be copy-pasted onto a different move and still make
  sense: *"A mistake that loses material"* is generic noise, not coaching.
- Qualitative bar, not a quantitative KPI — validated by the builder reviewing
  their own games during development and post-launch.

**Flow completion (table stakes)**
- PGN upload → full analysis → interactive review board renders without error.
- This is the minimum viable experience, not a success signal on its own.

---

### Builder / Project Objectives

*KnightVision is 70% portfolio piece, 30% personal tool. Success metrics reflect
both honestly.*

| Objective | Target | Timeframe |
|---|---|---|
| Proper README and documented architecture on GitHub | Published | Launch |
| Personal usage — own games reviewed | ≥ 10 games | 3 months post-launch |
| Community post in r/chess or r/chessbeginners with genuine usage responses | ≥ 1 post with comments confirming real use | 3 months post-launch |
| GitHub stars | ≥ 50 | 3 months post-launch |

**Note on GitHub stars:** Acknowledged as a vanity metric. The meaningful signal
is comments from users saying "I used this to review my game" — that confirms the
tool reached and served the primary persona, not just developers browsing repos.

---

### Technical Performance KPIs

| Metric | Target | Acceptable | Concern Threshold |
|---|---|---|---|
| Analysis time (54-move game, depth 18) | < 60 seconds | < 90 seconds | > 2 minutes |
| LLM fallback rate (template used instead of LLM) | < 10% | < 30% | > 30% |
| Board render / move animation | < 100ms | < 200ms | > 500ms |

**LLM fallback rate rationale:** A fallback rate consistently above 30% means the
commentary layer is broken in practice — the app feels hollow, the differentiator
is absent. Below 10% confirms the LLM setup is working for the typical user's
environment. This metric should be visible in console logs from launch, with a
proper dashboard considered for Phase 2.

**Analysis time rationale:** 60 seconds is the target. 90 seconds is acceptable if
commentary quality is high — users will tolerate a wait if the result is worth it.
Beyond 2 minutes, session abandonment becomes a real risk.

---

## MVP Scope

### Core Features (Phase 1 — Required to Ship)

**PGN Ingestion**
- Drag-and-drop PGN file upload
- Direct PGN text paste
- Client-side validation via chess.js before upload

**Analysis Engine**
- Stockfish analysis at depth 18 (configurable in config.yaml)
- Centipawn evaluation per position, top 3 candidate moves, best-move in UCI + SAN
- WebSocket streaming — results pushed to frontend move-by-move as computed
- Real-time progress bar during analysis ("Analysing move 12/54…")

**Move Classification**
- 7-tier system: Brilliant / Great / Best / Good / Inaccuracy / Mistake / Blunder
- Colour-coded badges per category (emerald → red scale)
- Thresholds configurable in config.yaml without code changes
- Brilliant detection: cp_loss == 0 + sacrifice/tactic check

**LLM Commentary**
- 1–2 sentence coaching comment per move via pluggable LLM adapter
- Template fallback for every category — activates on timeout (10s) or error
- `comment_source` field indicates whether comment is LLM or fallback

**LLM Provider Switcher (simplified)**
- Top-bar dropdown or radio group: Ollama / Groq / HuggingFace
- Status indicator per provider (green = reachable, red = unavailable)
- Runtime switching — no server restart required
- *Rationale:* This is the technical differentiator that must be visible and usable
  in the UI. When someone can't run Ollama locally, they must be able to switch to
  Groq without touching a config file. A config-only LLM switcher kills the demo.

**Interactive Board Review**
- Animated board (react-chessboard) with piece move animations
- Eval bar — vertical, left of board, updates per move
- Best-move arrow — shown on paused/navigated move, toggle on/off
- Move list — colour-coded by category, scrollable, click to jump to move
- Move detail card — badge, eval before/after, coaching comment, top 3 candidates

**Playback Controls**
- ⏮ ◀ ⏸/▶ ▶ ⏭ buttons with 1-second auto-advance
- Keyboard: ← → Space Home End
- Mobile: swipe left/right on board for prev/next move

**Accuracy Scores**
- White accuracy % and Black accuracy % computed from average cp_loss
- Displayed in game header (White vs Black, Elo, result, date)

**Opening Detection**
- ECO code + name lookup against bundled JSON (~200KB)
- Displayed as badge: "B90 · Sicilian: Najdorf"
- Graceful fallback to "Unknown Opening"

**Deployment & Portability**
- Docker Compose — single `docker compose up` spins up backend + Ollama container
- README with three commands: clone, configure API keys in .env, run
- Must work for a complete stranger cloning the repo — "works on my machine" is
  not the bar. The Docker setup is both the portability solution and a selling
  point: the whole stack including local LLM in one command.

---

### Out of Scope for Phase 1

| Feature | Status | Rationale |
|---|---|---|
| Evaluation graph (recharts line chart) | **Phase 1.5** | Eval bar already shows position advantage move-by-move. Graph is a summary view — nice to have, not essential for 11pm blunder review. First feature to cut if schedule is tight. |
| Full settings drawer/modal | Dropped | Replaced by simplified top-bar LLM selector. Stockfish depth and playback speed remain config.yaml only for Phase 1. |
| Authentication & user accounts | Phase 2+ | No database in Phase 1. All state in-memory per session. |
| Multi-game PGN files | Phase 2+ | Single-game focus keeps Phase 1 clean. |
| PDF export | Phase 2+ | Data model designed to support this without Phase 1 re-work. |
| Custom position analysis (FEN paste) | Phase 2+ | Out of scope for the post-game review use case. |
| Endgame tablebase (Syzygy) | Phase 2+ | Separate integration; no impact on Phase 1 architecture. |
| Share analysis via URL | Phase 2+ | Requires persistent DB layer. |
| User-configurable LLM prompt | Phase 2+ | Prompt is hardcoded but well-structured for future exposure. |

---

### MVP Success Criteria (Phase 1 Complete When…)

1. A stranger can clone the repo, run `docker compose up`, and reach a working
   analysis board in under 5 minutes following the README.
2. A PGN from Chess.com or Lichess uploads, analyses, and renders the full review
   board with badges, comments, and best-move arrows.
3. The LLM switcher in the top bar works: switching to Groq with a valid API key
   produces LLM comments; switching to Ollama with the container running produces
   LLM comments; fallback templates appear when neither is available.
4. The builder has reviewed at least 3 of their own games end-to-end on the
   running app and found no blocking bugs.
5. The README is complete: setup instructions, architecture overview, config
   reference, and a screenshot or GIF of the board in action.

---

### Future Vision (Phase 2+)

If KnightVision resonates in the chess community and gets real usage, the natural
growth path is:

- **Evaluation graph** — the first Phase 2 feature, already designed and deprioritised
  from Phase 1 purely on schedule grounds
- **Persistent storage + shareable links** — add a DB/Redis layer; let users share
  a link to their game analysis
- **Multi-game PGN** — upload a full tournament file and browse all games
- **PDF export** — printable game report with board diagrams and commentary
- **Custom position analysis** — FEN paste for mid-game or problem positions
- **Session analytics** — move click tracking, session depth metrics (the Phase 2
  instrumentation to measure the North Star proxy)
- **Possible expansion:** Mobile-native wrapper (PWA or React Native) for the
  60% mobile use case; the architecture already supports it
