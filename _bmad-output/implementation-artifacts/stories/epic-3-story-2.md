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

---

## Dev Agent Record

### Implementation Notes

**Regex pattern:** `r"\bcategory[:\s]+(\w+)"` with `re.IGNORECASE` — matches `category: blunder`, `Category: Blunder`, `category blunder` (space instead of colon), all case variants. Word boundary `\b` prevents partial matches.

**Default on no match:** Returns `_TEMPLATES["good"]` — the safest neutral template. Applied when: prompt contains no `category` keyword, category word is unrecognised, or prompt is empty.

**Startup registration in `main.py` lifespan:** `provider_registry.register("fallback", FallbackProvider())` + `provider_registry.set_provider("fallback")` — fallback is always the active provider until a real LLM provider is registered at startup (Epic 3, stories 3.3–3.5).

**`comment_source = "fallback"` is the caller's responsibility:** This provider's `generate()` returns a plain string. The calling layer (Epic 4 WebSocket handler) inspects whether the provider used was `FallbackProvider` (or provider_name == "fallback") and sets `comment_source = "fallback"` instead of `"llm"`.

### Completion Notes
✅ Both AC gate tests pass. 146/146 total tests pass (18 new + 128 regression).
- `test_ac_blunder_returns_exact_template` ✓
- `test_ac_unrecognised_category_returns_good_template` ✓

---

## File List
- `backend/app/llm/fallback_provider.py` (new)
- `backend/app/main.py` (updated — register FallbackProvider at startup)
- `backend/tests/services/test_fallback_provider.py` (new — 2 AC gate tests)
- `backend/tests/test_fallback_provider.py` (new — 16 supporting tests)

---

## Change Log
- 2026-03-22: FallbackProvider — regex category extraction, 7 templates, safe default, startup registration (Sai Chandan / Claude)

---

## Status
review
