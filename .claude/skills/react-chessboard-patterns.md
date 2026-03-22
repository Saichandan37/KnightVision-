# Skill: React Chessboard UI Patterns

## Purpose
Implementation patterns for the chess board UI using `react-chessboard` v4, `chess.js` v1, and Tailwind CSS. Covers board rendering, move animation, best-move arrows, eval bar, playback state machine, keyboard navigation, and mobile swipe gestures.

---

## Dependencies
```json
{
  "react-chessboard": "^4.6.0",
  "chess.js": "^1.0.0",
  "recharts": "^2.10.0"
}
```

---

## 1. Board Component with Highlights and Arrows

```tsx
// components/board/ChessBoard.tsx
import { Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';
import type { MoveAnalysis } from '../../types/chess';
import { CATEGORY_CONFIG } from '../../types/chess';

interface ChessBoardProps {
  fen: string;
  currentMove?: MoveAnalysis;
  showBestMoveArrow: boolean;
  onSquareClick?: (square: Square) => void;
}

export function ChessBoard({ fen, currentMove, showBestMoveArrow }: ChessBoardProps) {
  // Highlight from/to squares of the last move played
  const lastMoveHighlight: Record<string, { backgroundColor: string }> = {};
  if (currentMove) {
    const fromSq = currentMove.move_uci.slice(0, 2);
    const toSq = currentMove.move_uci.slice(2, 4);
    lastMoveHighlight[fromSq] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    lastMoveHighlight[toSq] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
  }

  // Best move arrow
  const arrows: [string, string, string][] = [];
  if (showBestMoveArrow && currentMove?.best_move_uci && currentMove.best_move_uci.length >= 4) {
    const from = currentMove.best_move_uci.slice(0, 2);
    const to = currentMove.best_move_uci.slice(2, 4);
    arrows.push([from, to, 'rgba(0, 128, 255, 0.7)']);  // blue arrow for best move
  }

  return (
    <Chessboard
      position={fen}
      boardWidth={Math.min(window.innerWidth - 32, 560)}  // responsive width
      customSquareStyles={lastMoveHighlight}
      customArrows={arrows}
      animationDuration={150}    // ms — fast enough to feel responsive
      areArrowsAllowed={false}   // disable user drawing arrows
      arePiecesDraggable={false} // review mode — no dragging
    />
  );
}
```

---

## 2. Playback State Machine Hook

```tsx
// hooks/usePlayback.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { MoveAnalysis } from '../types/chess';

export type PlaybackState = 'idle' | 'ready' | 'playing' | 'paused';

interface UsePlaybackReturn {
  currentIndex: number;           // -1 = starting position (before move 0)
  playbackState: PlaybackState;
  currentMove: MoveAnalysis | undefined;
  currentFen: string;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
}

export function usePlayback(moves: MoveAnalysis[], speedMs: number = 1000): UsePlaybackReturn {
  const [currentIndex, setCurrentIndex] = useState(-1);  // -1 = starting position
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const play = useCallback(() => {
    if (moves.length === 0) return;
    setPlaybackState('playing');
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= moves.length) {
          clearAutoPlay();
          setPlaybackState('paused');
          return prev;  // stay at last move
        }
        return next;
      });
    }, speedMs);
  }, [moves.length, speedMs]);

  const pause = useCallback(() => {
    clearAutoPlay();
    setPlaybackState('paused');
  }, []);

  const next = useCallback(() => {
    clearAutoPlay();
    setPlaybackState('paused');
    setCurrentIndex(prev => Math.min(prev + 1, moves.length - 1));
  }, [moves.length]);

  const prev = useCallback(() => {
    clearAutoPlay();
    setPlaybackState('paused');
    setCurrentIndex(prev => Math.max(prev - 1, -1));
  }, []);

  const jumpTo = useCallback((index: number) => {
    clearAutoPlay();
    setPlaybackState('paused');
    setCurrentIndex(Math.max(-1, Math.min(index, moves.length - 1)));
  }, [moves.length]);

  // When moves arrive, transition from idle to ready
  useEffect(() => {
    if (moves.length > 0 && playbackState === 'idle') {
      setPlaybackState('paused');
    }
  }, [moves.length]);

  useEffect(() => () => clearAutoPlay(), []);  // cleanup on unmount

  const currentMove = currentIndex >= 0 ? moves[currentIndex] : undefined;
  const currentFen = currentMove?.fen_after ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return { currentIndex, playbackState, currentMove, currentFen, play, pause, next, prev, jumpTo };
}
```

---

## 3. Keyboard Navigation Hook

```tsx
// hooks/useKeyboard.ts
import { useEffect } from 'react';

interface KeyboardActions {
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
}

export function useKeyboardNavigation({ onNext, onPrev, onTogglePlay, onJumpStart, onJumpEnd }: KeyboardActions) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); onNext(); break;
        case 'ArrowLeft':  e.preventDefault(); onPrev(); break;
        case ' ':          e.preventDefault(); onTogglePlay(); break;
        case 'Home':       e.preventDefault(); onJumpStart(); break;
        case 'End':        e.preventDefault(); onJumpEnd(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNext, onPrev, onTogglePlay, onJumpStart, onJumpEnd]);
}
```

---

## 4. Mobile Swipe Hook

```tsx
// hooks/useSwipe.ts
import { useRef } from 'react';

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const MIN_SWIPE_DISTANCE = 50;  // px

  return {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) < MIN_SWIPE_DISTANCE) return;
      diff > 0 ? onSwipeLeft() : onSwipeRight();
      touchStartX.current = null;
    },
  };
}

// Usage on board wrapper:
// <div {...useSwipe(next, prev)}>
//   <ChessBoard ... />
// </div>
```

---

## 5. Eval Bar Component

The vertical eval bar shows white/black advantage. White is on top (or bottom depending on board orientation).

```tsx
// components/board/EvalBar.tsx
interface EvalBarProps {
  scoreCP: number;   // From white's perspective. Positive = white winning.
  height: number;    // Match board height in px
}

export function EvalBar({ scoreCP, height }: EvalBarProps) {
  // Clamp to ±600 cp for display (beyond this it looks the same)
  const SCALE = 600;
  const clamped = Math.max(-SCALE, Math.min(SCALE, scoreCP));
  // whitePercent: 50% = equal. 100% = white completely winning. 0% = black completely winning.
  const whitePercent = ((clamped + SCALE) / (SCALE * 2)) * 100;

  const label = Math.abs(scoreCP) >= 30000
    ? scoreCP > 0 ? 'M' : 'M'   // Mate
    : (Math.abs(scoreCP) / 100).toFixed(1);

  return (
    <div className="flex flex-col items-center" style={{ height, width: 20 }}>
      {/* Black section (top) */}
      <div
        className="w-full bg-gray-800 transition-all duration-300 rounded-t"
        style={{ height: `${100 - whitePercent}%` }}
      />
      {/* White section (bottom) */}
      <div
        className="w-full bg-white transition-all duration-300 rounded-b"
        style={{ height: `${whitePercent}%` }}
      />
      {/* Score label */}
      <div className="text-xs font-bold mt-1" style={{ color: scoreCP >= 0 ? '#fff' : '#888' }}>
        {label}
      </div>
    </div>
  );
}

// Note: scoreCP must be from WHITE's perspective always.
// If current move was black's turn, the Stockfish eval_after_cp is from BLACK's perspective.
// Convert: white_perspective_cp = -eval_after_cp (when it was black's move)
```

---

## 6. Category Badge Component

```tsx
// components/analysis/CategoryBadge.tsx
import { CATEGORY_CONFIG, MoveCategory } from '../../types/chess';

interface CategoryBadgeProps {
  category: MoveCategory;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${sizeClass} ${config.colour} ${config.bgColour} ${config.borderColour}`}>
      <span>{config.symbol}</span>
      <span>{config.label}</span>
    </span>
  );
}
```

---

## 7. Colour-Coded Move List

```tsx
// components/analysis/MoveList.tsx
import { useRef, useEffect } from 'react';
import { CATEGORY_CONFIG, MoveAnalysis } from '../../types/chess';

interface MoveListProps {
  moves: MoveAnalysis[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function MoveList({ moves, currentIndex, onSelect }: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active move into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  // Group into pairs (white + black per row)
  const movePairs: Array<[MoveAnalysis?, MoveAnalysis?]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="overflow-y-auto h-full font-mono text-sm">
      {movePairs.map(([white, black], pairIdx) => (
        <div key={pairIdx} className="flex items-center gap-1 py-0.5 px-2">
          {/* Move number */}
          <span className="text-gray-500 w-8 text-right flex-shrink-0">
            {(pairIdx + 1)}.
          </span>
          {/* White move */}
          {white && (
            <MoveButton
              move={white}
              isActive={white.move_index === currentIndex}
              ref={white.move_index === currentIndex ? activeRef : null}
              onClick={() => onSelect(white.move_index)}
            />
          )}
          {/* Black move */}
          {black && (
            <MoveButton
              move={black}
              isActive={black.move_index === currentIndex}
              ref={black.move_index === currentIndex ? activeRef : null}
              onClick={() => onSelect(black.move_index)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const MoveButton = React.forwardRef<HTMLButtonElement, {
  move: MoveAnalysis; isActive: boolean; onClick: () => void;
}>(({ move, isActive, onClick }, ref) => {
  const config = CATEGORY_CONFIG[move.category];
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`
        px-2 py-0.5 rounded text-left w-24 truncate transition-colors
        ${isActive ? `${config.bgColour} ${config.colour} font-bold` : 'hover:bg-white/5 text-gray-300'}
        border ${isActive ? config.borderColour : 'border-transparent'}
      `}
      title={`${move.category} (${move.category_symbol}) — CP loss: ${move.cp_loss}`}
    >
      {move.move_san}
      <span className="ml-1 text-xs opacity-70">{move.category_symbol}</span>
    </button>
  );
});
```

---

## 8. Eval Graph

```tsx
// components/graph/EvalGraph.tsx
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
import type { MoveAnalysis } from '../../types/chess';

interface EvalGraphProps {
  moves: MoveAnalysis[];
  currentIndex: number;
  onClickMove: (index: number) => void;
}

export function EvalGraph({ moves, currentIndex, onClickMove }: EvalGraphProps) {
  const data = moves.map((m, i) => ({
    index: i,
    label: `${m.move_number}${m.colour === 'white' ? '.' : '...'}${m.move_san}`,
    // Always store from white's perspective for consistent graph direction
    eval: m.colour === 'white' ? -m.eval_after_cp / 100 : m.eval_after_cp / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} onClick={d => d?.activePayload && onClickMove(d.activePayload[0].payload.index)}>
        <defs>
          <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="blackGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="#374151" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#374151" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="index" hide />
        <YAxis domain={[-6, 6]} hide />
        <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
        {/* Current move marker */}
        <ReferenceLine x={currentIndex} stroke="#6c8efb" strokeWidth={2} />
        <Area type="monotone" dataKey="eval" stroke="#9ca3af" fill="url(#whiteGrad)" strokeWidth={1.5} dot={false} />
        <Tooltip
          content={({ active, payload }) => active && payload?.[0] ? (
            <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs">
              <div className="text-gray-400">{payload[0].payload.label}</div>
              <div className="text-white">{payload[0].value > 0 ? '+' : ''}{payload[0].value}</div>
            </div>
          ) : null}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

## 9. Responsive Layout (Tailwind)

```tsx
// Main layout — desktop: side by side / mobile: stacked
<div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-gray-950">
  {/* Board section */}
  <div className="flex-shrink-0 flex flex-col items-center gap-2">
    <div className="flex items-stretch gap-2">
      <EvalBar scoreCP={whitePerspectiveEval} height={boardSize} />
      <div {...swipeHandlers}>
        <ChessBoard fen={currentFen} currentMove={currentMove} showBestMoveArrow={showArrows} />
      </div>
    </div>
    <PlaybackControls ... />
  </div>

  {/* Analysis panel — scrollable */}
  <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
    <MoveDetail move={currentMove} />
    <div className="flex-1 min-h-0">
      <MoveList moves={moves} currentIndex={currentIndex} onSelect={jumpTo} />
    </div>
    <EvalGraph moves={moves} currentIndex={currentIndex} onClickMove={jumpTo} />
  </div>
</div>
```

---

## Rules for Developer Agents

1. **`board.fen()` changes after `board.push(move)`** — always capture FEN before and after.
2. **Board size must be square** — compute `boardSize = Math.min(viewportWidth - 64, 560)` and set `boardWidth` on Chessboard.
3. **`currentIndex = -1`** means show the starting position FEN, not `moves[0].fen_before`. Derive the starting FEN from the PGN game object.
4. **Best move arrow source**: `moves[currentIndex].best_move_uci` — the best move FROM the current position (engine's recommendation for the current position, which may differ from the actual played move).
5. **Eval bar always in white's perspective** — negate the eval when it was black's move. A positive eval = white is winning.
6. **Auto-scroll in MoveList** — always scroll the active move button into view with `scrollIntoView({ block: 'nearest' })`.
7. **Keyboard events** — always call `e.preventDefault()` for arrow keys and Space to prevent page scrolling.
8. **Swipe threshold** — ignore swipes < 50px to avoid accidental navigation on scroll.
