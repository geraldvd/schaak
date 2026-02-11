import { type Move, type TTEntry, Piece, MoveFlag } from '../types';
import { pieceType, PIECE_VALUES } from '../constants';

// MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
// Higher score = better capture to search first
function mvvLvaScore(move: Move): number {
  if (move.captured === Piece.None) return 0;
  const victimValue = PIECE_VALUES[pieceType(move.captured)] || 0;
  const attackerValue = PIECE_VALUES[pieceType(move.piece)] || 0;
  // We want high victim, low attacker -> higher score
  return victimValue * 10 - attackerValue;
}

const TT_MOVE_SCORE = 100000;
const CAPTURE_BASE_SCORE = 50000;
const KILLER_SCORE_1 = 40000;
const KILLER_SCORE_2 = 39000;
const PROMOTION_SCORE = 45000;

/**
 * Killer move storage: two killer moves per ply.
 */
export class KillerMoves {
  private killers: [Move | null, Move | null][];

  constructor(maxPly: number = 64) {
    this.killers = new Array(maxPly);
    for (let i = 0; i < maxPly; i++) {
      this.killers[i] = [null, null];
    }
  }

  store(ply: number, move: Move): void {
    if (ply >= this.killers.length) return;
    const slot = this.killers[ply];
    // Don't store captures as killers
    if (move.captured !== Piece.None) return;
    // Don't store duplicates
    if (slot[0] && movesEqual(slot[0], move)) return;
    slot[1] = slot[0];
    slot[0] = move;
  }

  isKiller(ply: number, move: Move): 0 | 1 | 2 {
    if (ply >= this.killers.length) return 0;
    const slot = this.killers[ply];
    if (slot[0] && movesEqual(slot[0], move)) return 1;
    if (slot[1] && movesEqual(slot[1], move)) return 2;
    return 0;
  }

  clear(): void {
    for (let i = 0; i < this.killers.length; i++) {
      this.killers[i] = [null, null];
    }
  }
}

/**
 * History heuristic: score non-capture moves that caused beta cutoffs.
 */
export class HistoryTable {
  // [piece][toSquare] -> score
  private table: number[][];

  constructor() {
    this.table = new Array(15);
    for (let i = 0; i < 15; i++) {
      this.table[i] = new Array(128).fill(0);
    }
  }

  update(move: Move, depth: number): void {
    if (move.captured !== Piece.None) return;
    this.table[move.piece][move.to] += depth * depth;
    // Prevent overflow
    if (this.table[move.piece][move.to] > 1000000) {
      this.age();
    }
  }

  score(move: Move): number {
    return this.table[move.piece][move.to];
  }

  private age(): void {
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 128; j++) {
        this.table[i][j] = Math.floor(this.table[i][j] / 2);
      }
    }
  }

  clear(): void {
    for (let i = 0; i < 15; i++) {
      this.table[i].fill(0);
    }
  }
}

function movesEqual(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.flag === b.flag;
}

/**
 * Score and sort moves for search ordering.
 * TT best move > promotions > captures (MVV-LVA) > killer moves > history heuristic
 */
export function orderMoves(
  moves: Move[],
  ttEntry: TTEntry | null,
  killers: KillerMoves,
  history: HistoryTable,
  ply: number,
): Move[] {
  const scored: { move: Move; score: number }[] = [];

  for (const move of moves) {
    let score = 0;

    // TT best move gets highest priority
    if (ttEntry?.bestMove && movesEqual(move, ttEntry.bestMove)) {
      score = TT_MOVE_SCORE;
    }
    // Promotions
    else if (move.flag >= MoveFlag.PromoteKnight && move.flag <= MoveFlag.PromoteQueen) {
      score = PROMOTION_SCORE + (move.flag - MoveFlag.PromoteKnight);
    }
    // Captures: MVV-LVA
    else if (move.captured !== Piece.None) {
      score = CAPTURE_BASE_SCORE + mvvLvaScore(move);
    }
    // Killer moves
    else {
      const killerRank = killers.isKiller(ply, move);
      if (killerRank === 1) {
        score = KILLER_SCORE_1;
      } else if (killerRank === 2) {
        score = KILLER_SCORE_2;
      } else {
        // History heuristic
        score = history.score(move);
      }
    }

    scored.push({ move, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}
