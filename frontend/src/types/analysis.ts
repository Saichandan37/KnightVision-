/**
 * TypeScript types matching the backend Pydantic models.
 * Keep in sync with backend/app/models/api.py.
 */

export type MoveCategory =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export interface CandidateMove {
  uci: string
  san: string
  centipawns: number
}

/** Core move result from the analysis engine (matches backend MoveResult). */
export interface MoveResult {
  move_index: number
  move_number: number
  san: string
  uci: string
  category: MoveCategory
  cp_loss: number
  eval_before_cp: number
  eval_after_cp: number
  best_move_uci: string
  best_move_san: string
  top_candidates: CandidateMove[]
  comment: string
  comment_source: 'llm' | 'fallback'
}

/** MoveResult enriched with buffered flag for WebSocket streaming. */
export interface WSMoveResult extends MoveResult {
  /** true → replay (no board animation); false → live (animate) */
  buffered: boolean
}

/** Game metadata extracted from PGN headers (matches backend GameMeta). */
export interface GameMeta {
  white: string
  black: string
  white_elo: number | null
  black_elo: number | null
  result: string
  date: string | null
  opening_eco: string | null
  opening_name: string | null
}

export interface WSHeartbeat {
  type: 'heartbeat'
  timestamp: number
}

export interface WSError {
  type: 'error'
  message: string
}

export interface AnalysisComplete {
  type: 'analysis_complete'
  white_accuracy: number
  black_accuracy: number
  total_moves: number
}
