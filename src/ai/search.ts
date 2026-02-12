import {
  type BoardState,
  type Move,
  type WorkerProgressUpdate,
  Color,
  TTFlag,
} from '../types';
import { evaluate } from './evaluation';
import { TranspositionTable } from './transposition-table';
import { orderMoves, KillerMoves, HistoryTable } from './move-ordering';
import { getBookMove } from './opening-book';
import { generateLegalMoves, makeMove, unmakeMove, isInCheck } from '../engine/validation';
import { generateCaptureMoves } from '../engine/moves';
import { isThreefoldRepetition } from '../engine/game-state';
// constants used indirectly via engine modules

const INFINITY = 1000000;
const MATE_SCORE = 900000;
const DRAW_SCORE = 0;
const MAX_QUIESCENCE_DEPTH = 10;

export interface SearchResult {
  bestMove: Move | null;
  score: number;
  depth: number;
  nodesSearched: number;
}

export interface SearchOptions {
  maxDepth: number;
  useBook?: boolean;
  positionHistory?: number[];
  randomness?: number;
  onProgress?: (update: WorkerProgressUpdate) => void;
}

export class SearchEngine {
  private tt: TranspositionTable;
  private killers: KillerMoves;
  private history: HistoryTable;
  private nodesSearched: number = 0;
  private positionHistory: number[] = [];
  private randomness: number = 0; // centipawns of noise at root

  constructor() {
    this.tt = new TranspositionTable();
    this.killers = new KillerMoves();
    this.history = new HistoryTable();
  }

  /**
   * Run iterative deepening search and return the best move.
   */
  search(state: BoardState, options: SearchOptions): SearchResult {
    this.nodesSearched = 0;
    this.killers.clear();
    this.history.clear();
    this.positionHistory = options.positionHistory || [];
    this.randomness = options.randomness || 0;

    const legalMoves = generateLegalMoves(state);
    if (legalMoves.length === 0) {
      return { bestMove: null, score: 0, depth: 0, nodesSearched: 0 };
    }

    // Only one legal move: return immediately
    if (legalMoves.length === 1) {
      return { bestMove: legalMoves[0], score: 0, depth: 0, nodesSearched: 1 };
    }

    // Opening book lookup
    if (options.useBook !== false) {
      const bookMove = getBookMove(state, legalMoves);
      if (bookMove) {
        return { bestMove: bookMove, score: 0, depth: 0, nodesSearched: 0 };
      }
    }

    let bestMove: Move = legalMoves[0];
    let bestScore = -INFINITY;

    // Iterative deepening
    for (let depth = 1; depth <= options.maxDepth; depth++) {
      const result = this.searchRoot(state, legalMoves, depth);
      if (result.bestMove) {
        bestMove = result.bestMove;
        bestScore = result.score;
      }

      if (options.onProgress) {
        options.onProgress({
          type: 'progress',
          depth,
          bestMove,
          score: bestScore,
          nodesSearched: this.nodesSearched,
        });
      }

      // If we found a forced mate, stop early
      if (Math.abs(bestScore) > MATE_SCORE - 100) {
        break;
      }
    }

    return {
      bestMove,
      score: bestScore,
      depth: options.maxDepth,
      nodesSearched: this.nodesSearched,
    };
  }

  private searchRoot(state: BoardState, legalMoves: Move[], depth: number): SearchResult {
    let bestMove = legalMoves[0];
    let bestScore = -INFINITY;
    let alpha = -INFINITY;
    const beta = INFINITY;

    const ttEntry = this.tt.probe(state.zobristHash);
    const orderedMoves = orderMoves(legalMoves, ttEntry, this.killers, this.history, 0);

    for (const move of orderedMoves) {
      const undo = makeMove(state, move);

      // Check for repetition
      const isRepetition = isThreefoldRepetition(this.positionHistory, state.zobristHash);
      let score: number;

      if (isRepetition) {
        score = DRAW_SCORE;
      } else {
        score = -this.negamax(state, depth - 1, -beta, -alpha, 1);
      }

      unmakeMove(state, move, undo);

      // Add randomness at root level for varied play
      if (this.randomness > 0 && Math.abs(score) < MATE_SCORE - 200) {
        score += Math.floor(Math.random() * this.randomness * 2 + 1) - this.randomness;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    // Store in TT
    this.tt.store(state.zobristHash, depth, bestScore, TTFlag.Exact, bestMove);

    return { bestMove, score: bestScore, depth, nodesSearched: this.nodesSearched };
  }

  private negamax(
    state: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
  ): number {
    this.nodesSearched++;

    // TT probe
    const ttEntry = this.tt.probe(state.zobristHash);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === TTFlag.Exact) return ttEntry.score;
      if (ttEntry.flag === TTFlag.LowerBound && ttEntry.score > alpha) alpha = ttEntry.score;
      if (ttEntry.flag === TTFlag.UpperBound && ttEntry.score < beta) beta = ttEntry.score;
      if (alpha >= beta) return ttEntry.score;
    }

    // Leaf node: enter quiescence search
    if (depth <= 0) {
      return this.quiescence(state, alpha, beta, 0);
    }

    const legalMoves = generateLegalMoves(state);

    // Checkmate or stalemate
    if (legalMoves.length === 0) {
      if (isInCheck(state, state.sideToMove)) {
        return -MATE_SCORE + ply; // Checkmate (closer = worse for us)
      }
      return DRAW_SCORE; // Stalemate
    }

    const orderedMoves = orderMoves(legalMoves, ttEntry, this.killers, this.history, ply);
    let bestScore = -INFINITY;
    let bestMove: Move | null = null;
    const origAlpha = alpha;

    for (const move of orderedMoves) {
      const undo = makeMove(state, move);

      // Check for repetition
      const isRepetition = isThreefoldRepetition(this.positionHistory, state.zobristHash);
      let score: number;

      if (isRepetition) {
        score = DRAW_SCORE;
      } else {
        score = -this.negamax(state, depth - 1, -beta, -alpha, ply + 1);
      }

      unmakeMove(state, move, undo);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        // Beta cutoff
        this.killers.store(ply, move);
        this.history.update(move, depth);
        break;
      }
    }

    // Store in TT
    let flag: TTFlag;
    if (bestScore <= origAlpha) {
      flag = TTFlag.UpperBound;
    } else if (bestScore >= beta) {
      flag = TTFlag.LowerBound;
    } else {
      flag = TTFlag.Exact;
    }
    this.tt.store(state.zobristHash, depth, bestScore, flag, bestMove);

    return bestScore;
  }

  private quiescence(
    state: BoardState,
    alpha: number,
    beta: number,
    qDepth: number,
  ): number {
    this.nodesSearched++;

    // Stand-pat score
    const standPat = evaluate(state);
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    if (qDepth >= MAX_QUIESCENCE_DEPTH) return alpha;

    // Generate capture moves and filter to legal
    const captureMoves = generateCaptureMoves(state);
    const us = state.sideToMove;
    const enemy = us === Color.White ? Color.Black : Color.White;

    for (const move of captureMoves) {
      const undo = makeMove(state, move);

      // Legality check: king must not be in check after move
      const kingSq = state.kingSquares[us];
      const inCheck = isInCheckFast(state, kingSq, enemy);

      if (inCheck) {
        unmakeMove(state, move, undo);
        continue;
      }

      const score = -this.quiescence(state, -beta, -alpha, qDepth + 1);
      unmakeMove(state, move, undo);

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }

  /**
   * Clear the transposition table and heuristic data.
   */
  reset(): void {
    this.tt.clear();
    this.killers.clear();
    this.history.clear();
  }
}

// Inline check detection for quiescence (avoids importing isSquareAttacked again)
import { isSquareAttacked } from '../engine/validation';

function isInCheckFast(state: BoardState, kingSq: number, byColor: number): boolean {
  return isSquareAttacked(state, kingSq, byColor);
}

/**
 * Convenience function for simple search calls.
 */
const _defaultEngine = new SearchEngine();
export function searchBestMove(
  state: BoardState,
  depth: number,
  positionHistory?: number[],
): { bestMove: Move; score: number; nodesSearched: number } {
  _defaultEngine.reset();
  const result = _defaultEngine.search(state, {
    maxDepth: depth,
    useBook: false,
    positionHistory,
  });
  return {
    bestMove: result.bestMove!,
    score: result.score,
    nodesSearched: result.nodesSearched,
  };
}
