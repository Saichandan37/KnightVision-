# Skill: LLM Commentary Generation

## Purpose
Generate a 1-2 sentence human-readable explanation for each chess move using the active LLM provider. Commentary supplements Stockfish's objective evaluation with natural language accessible to club-level players (Elo 800–1500). The LLM **never evaluates positions** — Stockfish is the sole source of truth for scores and categories.

---

## Inputs (from Analysis Orchestrator, per move)
```python
move_number: int          # e.g. 4
colour: str               # "white" | "black"
move_san: str             # e.g. "Bb5"
fen_before: str           # FEN of position before this move
category: str             # e.g. "Best"
category_symbol: str      # e.g. "✓"
cp_loss: int              # e.g. 0
best_move_san: str        # e.g. "Bb5" (engine's top choice)
eval_before_cp: int       # e.g. 45 (centipawns, mover's perspective)
eval_after_cp: int        # e.g. 40 (centipawns, opponent's perspective)
opening_name: str | None  # e.g. "Ruy Lopez" or None
```

---

## Prompt Template

```python
def build_commentary_prompt(move_data: dict) -> str:
    opening_line = (
        f"Opening: {move_data['opening_name']} ({move_data.get('opening_eco', '')})\n"
        if move_data.get('opening_name') else ""
    )
    return f"""You are a chess coach reviewing a game. Write a 1-2 sentence comment about this specific move for a club-level player (Elo 800-1500). Be concrete — name the tactical idea, positional concept, or error. Do not start with "This move".

Move #{move_data['move_number']} ({move_data['colour'].capitalize()} plays {move_data['move_san']})
Category: {move_data['category']} ({move_data['category_symbol']})
Centipawn loss: {move_data['cp_loss']}
Engine's best move: {move_data['best_move_san']}
Position (FEN): {move_data['fen_before']}
{opening_line}
Comment:"""
```

**Prompt design principles:**
- Stay under 300 tokens total — faster inference, lower rate-limit usage
- Specify audience (club-level, 800–1500 Elo) so the LLM uses accessible language
- Provide category AND symbol so the LLM understands the quality judgement
- Include `best_move_san` — essential for Mistake/Blunder comments so LLM can name the correct move
- Provide the FEN — capable models can reason about the position (tactics, king safety, open files)
- Do NOT ask the LLM to re-evaluate or give a score — it only explains the pre-computed Stockfish judgment

---

## Commentary by Category (what to expect / guide LLM toward)

| Category | Expected commentary style |
|----------|--------------------------|
| Brilliant | Excitement about the sacrifice/tactic; note that it requires seeing many moves ahead |
| Great | Praise for finding a strong move among alternatives; name the idea |
| Best | Neutral confirmation; briefly name the positional or tactical reason |
| Good | Short positive acknowledgment; note the strategic goal |
| Inaccuracy | Gentle explanation of what was slightly wrong; name the better option (`best_move_san`) |
| Mistake | Clear explanation of the error; what advantage it conceded; what `best_move_san` would have done |
| Blunder | Direct explanation of what was lost (material, mating attack, etc.); name `best_move_san` |

---

## Calling the LLM (via ProviderRegistry)

```python
# backend/services/analysis_orchestrator.py
async def get_move_commentary(
    move_data: dict,
    llm_registry: ProviderRegistry
) -> tuple[str, str]:
    """
    Returns (comment_text, comment_source).
    comment_source: "llm" | "fallback"
    """
    prompt = build_commentary_prompt(move_data)
    comment, source = await llm_registry.generate_with_fallback(
        prompt=prompt,
        category=move_data["category"],
        best_move_san=move_data["best_move_san"]
    )
    return comment, source
```

**Always use `generate_with_fallback()`** — never call the provider directly. This ensures:
- 10-second timeout is enforced
- Fallback triggers automatically on timeout or any error
- `comment_source` field accurately reflects whether real LLM or template was used

---

## Fallback Templates

When the LLM is unavailable (offline, rate-limited, timed out), these templates activate automatically via `FallbackProvider.get_fallback_comment(category, best_move_san)`:

```python
FALLBACK_TEMPLATES = {
    "Brilliant":  "A brilliant sacrifice! The engine confirms this is the only winning continuation in a deeply tactical position.",
    "Great":      "An excellent move, significantly stronger than the alternatives available here.",
    "Best":       "The engine's top pick — the objectively strongest move in this position.",
    "Good":       "A solid, reasonable move that keeps the position stable.",
    "Inaccuracy": "A slight inaccuracy. {best_move} would have maintained a better position.",
    "Mistake":    "A mistake that gives the opponent an advantage. {best_move} was the correct approach.",
    "Blunder":    "A serious blunder! {best_move} was essential to stay in the game.",
}
```

The `{best_move}` placeholder is filled with `best_move_san` (e.g. "Bb5"). Fallback comments are intentionally generic but always accurate and safe.

---

## Frontend Display

```tsx
// components/analysis/MoveDetail.tsx
interface MoveDetailProps {
  move: MoveAnalysis;
}

export function MoveDetail({ move }: MoveDetailProps) {
  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-3">
      {/* Move + category */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-white">{move.move_san}</span>
        <CategoryBadge category={move.category} />
        {move.comment_source === 'fallback' && (
          <span className="text-xs text-gray-500 italic">template</span>
        )}
      </div>

      {/* Eval info */}
      <div className="flex gap-4 text-sm text-gray-400">
        <span>CP loss: <span className="text-white">{move.cp_loss}</span></span>
        {move.category !== 'Best' && move.category !== 'Brilliant' && (
          <span>Better: <span className="text-blue-400 font-mono">{move.best_move_san}</span></span>
        )}
      </div>

      {/* LLM/fallback comment */}
      <p className="text-sm text-gray-300 leading-relaxed italic">
        "{move.comment}"
      </p>

      {/* Top 3 candidate moves */}
      <div className="space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Engine's top moves</div>
        {move.top_candidates.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{i + 1}.</span>
            <span className={`font-mono ${i === 0 ? 'text-blue-400' : 'text-gray-400'}`}>{c.move_san}</span>
            <span className="text-gray-600 text-xs">
              {c.score_cp > 0 ? '+' : ''}{(c.score_cp / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Parallel LLM Calls (Performance Optimisation)

For large games (50+ moves), LLM calls can be parallelised in batches of 5 to avoid overwhelming rate-limited providers:

```python
import asyncio

async def generate_all_comments(
    move_data_list: list[dict],
    llm_registry: ProviderRegistry,
    batch_size: int = 5
) -> list[tuple[str, str]]:
    """Generate commentary for all moves. Batched to respect rate limits."""
    results = []
    for i in range(0, len(move_data_list), batch_size):
        batch = move_data_list[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[get_move_commentary(m, llm_registry) for m in batch],
            return_exceptions=False
        )
        results.extend(batch_results)
    return results
```

For Groq free tier (30 req/min), `batch_size=5` with no extra delay is safe for typical 50-move games.

---

## Rules for Developer Agents

1. **LLM is NOT used to classify moves.** It only explains the category determined by Stockfish.
2. **Always use `generate_with_fallback()`** — never call provider directly. This guarantees the 10-second timeout and fallback.
3. **`comment_source`** must be stored in the `MoveAnalysis` model as `"llm"` or `"fallback"`. The frontend shows a subtle "template" indicator when it's a fallback.
4. **Do not ask the LLM for a score.** The prompt provides the score — the LLM explains it.
5. **Prompt must include `best_move_san`** for Inaccuracy/Mistake/Blunder categories — without it, the fallback template cannot name the correct move.
6. **Max output: 120 tokens** — set `max_tokens=120` on all providers. Longer = slower + more rate-limit usage.
7. **For LLM parallelism**: only parallelise after Stockfish analysis is complete for each move — don't interleave Stockfish and LLM per-move in the same async step without thinking about CPU/IO contention.
