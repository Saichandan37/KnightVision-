# Story 3.2 — Fallback Template Provider

## User Story
As a developer, I want a template-based fallback provider so that the system always produces a coaching comment even when no LLM is reachable.

## Tasks
- Create `backend/app/llm/fallback_provider.py` with `FallbackProvider(BaseLLMProvider)`
- `generate()` does NOT call any external service — it extracts the `MoveCategory` from the prompt using regex and returns a hardcoded template string per category
- Templates (one per `MoveCategory`):
  - brilliant: "A brilliant sacrifice — this move creates complications the opponent cannot handle."
  - great: "An excellent move that finds the best practical option."
  - best: "The engine's top choice — well played."
  - good: "A solid move that keeps the position balanced."
  - inaccuracy: "A slight inaccuracy — there was a better option available."
  - mistake: "A mistake that gives the opponent a meaningful advantage."
  - blunder: "A blunder that loses significant material or allows a decisive tactic."
- `comment_source` must be set to `"fallback"` when this provider is used (handled by the calling layer — this provider just returns the string)
- Register `FallbackProvider` as `"fallback"` in the registry at startup

## Acceptance Criterion
Calling `FallbackProvider().generate("...category: blunder...")` returns the exact blunder template string, and calling it with an unrecognised category returns the `good` template as a safe default.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
