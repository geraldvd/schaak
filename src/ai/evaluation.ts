import {
  type BoardState,
  Piece,
  Color,
  PieceType,
} from '../types';
import {
  PIECE_VALUES,
  pieceType,
  pieceColor,
  squareRank,
  squareFile,
  isValidSquare,
  KNIGHT_OFFSETS,
  BISHOP_DIRECTIONS,
  ROOK_DIRECTIONS,
  PAWN_PUSH_DIR,
  PAWN_CAPTURE_OFFSETS,
} from '../constants';
import { PST_MG, PST_EG, getPSTValue } from './piece-square-tables';

// Phase weights for game phase calculation
const PHASE_WEIGHTS: Record<number, number> = {
  [PieceType.Pawn]: 0,
  [PieceType.Knight]: 1,
  [PieceType.Bishop]: 1,
  [PieceType.Rook]: 2,
  [PieceType.Queen]: 4,
  [PieceType.King]: 0,
};

const TOTAL_PHASE = 24; // 4 minor (4) + 4 rook (8) + 2 queen (8) + 4 minor (already counted) = 2*1 + 2*1 + 2*2 + 2*4 = 2+2+4+8 = 16... actually: 2N(2)+2B(2)+2R(4)+2Q(8) = 16 per side? No.
// Total phase = 4 knights/bishops * 1 + 4 rooks * 2 + 2 queens * 4 = 4 + 8 + 8 = 20?
// Standard: Knight=1, Bishop=1, Rook=2, Queen=4. Total = 2*1+2*1+2*2+2*4 per side... but both sides:
// 4 knights (4) + 4 bishops (4) + 4 rooks (8) + 2 queens (8) = 24
// Actually TOTAL_PHASE = 24 is correct.

const BISHOP_PAIR_BONUS = 50;
const DOUBLED_PAWN_PENALTY = -25;
const ISOLATED_PAWN_PENALTY = -20;
const BACKWARD_PAWN_PENALTY = -15;
const PASSED_PAWN_BONUS_BASE = 20;

// Passed pawn bonus scaled by rank advancement (from perspective of the pawn's color)
const PASSED_PAWN_RANK_BONUS = [0, 0, 0, 10, 20, 40, 60, 0]; // index = ranks advanced (0-7)

const MOBILITY_MINOR = 4; // centipawns per square for knights/bishops
const MOBILITY_MAJOR = 2; // centipawns per square for rooks/queens

const PAWN_SHIELD_BONUS = 10;
const PAWN_SHIELD_MISSING_PENALTY = -15;
const OPEN_FILE_NEAR_KING_PENALTY = -20;

// Configurable aggression factor (-50 to +50)
// Positive = prefer attacking, mobile positions; Negative = prefer solid, safe positions
let aggressionFactor = 0;

/**
 * Set the aggression factor for evaluation.
 * Positive values weight mobility higher and king safety lower (attacking style).
 * Negative values weight king safety higher and mobility lower (defensive style).
 */
export function setAggressionFactor(value: number): void {
  aggressionFactor = Math.max(-50, Math.min(50, value));
}

/**
 * Compute game phase (0 = endgame, TOTAL_PHASE = opening/middlegame).
 */
export function computeGamePhase(state: BoardState): number {
  let phase = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None) continue;
    const pt = pieceType(p);
    phase += PHASE_WEIGHTS[pt] || 0;
  }
  return Math.min(phase, TOTAL_PHASE);
}

/**
 * Evaluate material and PST (combined for efficiency).
 */
function evaluateMaterialAndPST(state: BoardState): { mgScore: number; egScore: number } {
  let mgScore = 0;
  let egScore = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None) continue;

    const pt = pieceType(p);
    const color = pieceColor(p);
    const rank = squareRank(sq);
    const file = squareFile(sq);
    const isWhite = color === Color.White;
    const sign = isWhite ? 1 : -1;

    // Material
    const materialValue = PIECE_VALUES[pt] || 0;
    mgScore += sign * materialValue;
    egScore += sign * materialValue;

    // PST
    mgScore += sign * getPSTValue(PST_MG, pt, rank, file, isWhite);
    egScore += sign * getPSTValue(PST_EG, pt, rank, file, isWhite);
  }

  return { mgScore, egScore };
}

/**
 * Evaluate bishop pair bonus.
 */
function evaluateBishopPair(state: BoardState): number {
  let whiteBishops = 0;
  let blackBishops = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.WhiteBishop) whiteBishops++;
    else if (p === Piece.BlackBishop) blackBishops++;
  }

  let score = 0;
  if (whiteBishops >= 2) score += BISHOP_PAIR_BONUS;
  if (blackBishops >= 2) score -= BISHOP_PAIR_BONUS;
  return score;
}

/**
 * Evaluate pawn structure: doubled, isolated, backward, passed pawns.
 */
function evaluatePawnStructure(state: BoardState): number {
  const whitePawnsOnFile: number[] = new Array(8).fill(0);
  const blackPawnsOnFile: number[] = new Array(8).fill(0);
  const whitePawnMinRank: number[] = new Array(8).fill(8); // lowest rank index (highest rank) per file
  const blackPawnMaxRank: number[] = new Array(8).fill(-1); // highest rank index (lowest rank) per file

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None) continue;

    const pt = pieceType(p);
    if (pt !== PieceType.Pawn) continue;

    const file = squareFile(sq);
    const rank = squareRank(sq);

    if (pieceColor(p) === Color.White) {
      whitePawnsOnFile[file]++;
      whitePawnMinRank[file] = Math.min(whitePawnMinRank[file], rank);
    } else {
      blackPawnsOnFile[file]++;
      blackPawnMaxRank[file] = Math.max(blackPawnMaxRank[file], rank);
    }
  }

  let score = 0;

  for (let file = 0; file < 8; file++) {
    // Doubled pawns
    if (whitePawnsOnFile[file] > 1) {
      score += DOUBLED_PAWN_PENALTY * (whitePawnsOnFile[file] - 1);
    }
    if (blackPawnsOnFile[file] > 1) {
      score -= DOUBLED_PAWN_PENALTY * (blackPawnsOnFile[file] - 1);
    }

    // Isolated pawns (no friendly pawns on adjacent files)
    if (whitePawnsOnFile[file] > 0) {
      const hasNeighbor =
        (file > 0 && whitePawnsOnFile[file - 1] > 0) ||
        (file < 7 && whitePawnsOnFile[file + 1] > 0);
      if (!hasNeighbor) {
        score += ISOLATED_PAWN_PENALTY * whitePawnsOnFile[file];
      }
    }
    if (blackPawnsOnFile[file] > 0) {
      const hasNeighbor =
        (file > 0 && blackPawnsOnFile[file - 1] > 0) ||
        (file < 7 && blackPawnsOnFile[file + 1] > 0);
      if (!hasNeighbor) {
        score -= ISOLATED_PAWN_PENALTY * blackPawnsOnFile[file];
      }
    }

    // Passed pawns (no enemy pawns on same or adjacent files that can block)
    if (whitePawnsOnFile[file] > 0) {
      const bestRank = whitePawnMinRank[file];
      let passed = true;
      for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
        if (blackPawnsOnFile[f] > 0 && blackPawnMaxRank[f] >= bestRank) {
          passed = false;
          break;
        }
      }
      if (passed) {
        // Rank from white's perspective: rank 0 = rank 8, rank 7 = rank 1
        // Advancement = 7 - bestRank (rank 6 = start, advancement 1; rank 1 = 6)
        const advancement = 7 - bestRank;
        score += PASSED_PAWN_BONUS_BASE + PASSED_PAWN_RANK_BONUS[advancement];
      }
    }

    if (blackPawnsOnFile[file] > 0) {
      const bestRank = blackPawnMaxRank[file];
      let passed = true;
      for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
        if (whitePawnsOnFile[f] > 0 && whitePawnMinRank[f] <= bestRank) {
          passed = false;
          break;
        }
      }
      if (passed) {
        const advancement = bestRank;
        score -= PASSED_PAWN_BONUS_BASE + PASSED_PAWN_RANK_BONUS[advancement];
      }
    }
  }

  // Backward pawns
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None || pieceType(p) !== PieceType.Pawn) continue;

    const file = squareFile(sq);
    const rank = squareRank(sq);
    const color = pieceColor(p);

    if (color === Color.White) {
      // A pawn is backward if no friendly pawns on adjacent files are behind or equal
      const leftFile = file > 0 ? whitePawnMinRank[file - 1] : 8;
      const rightFile = file < 7 ? whitePawnMinRank[file + 1] : 8;
      // For white, "behind" means higher rank index
      if (leftFile < rank && rightFile < rank) {
        // Check if the stop square is controlled by an enemy pawn
        const stopSq = sq + PAWN_PUSH_DIR[Color.White];
        if (isValidSquare(stopSq)) {
          for (const offset of PAWN_CAPTURE_OFFSETS[Color.Black]) {
            const attackerSq = stopSq - offset;
            if (isValidSquare(attackerSq) && state.board[attackerSq] === Piece.BlackPawn) {
              score += BACKWARD_PAWN_PENALTY;
              break;
            }
          }
        }
      }
    } else {
      const leftFile = file > 0 ? blackPawnMaxRank[file - 1] : -1;
      const rightFile = file < 7 ? blackPawnMaxRank[file + 1] : -1;
      if (leftFile > rank && rightFile > rank) {
        const stopSq = sq + PAWN_PUSH_DIR[Color.Black];
        if (isValidSquare(stopSq)) {
          for (const offset of PAWN_CAPTURE_OFFSETS[Color.White]) {
            const attackerSq = stopSq - offset;
            if (isValidSquare(attackerSq) && state.board[attackerSq] === Piece.WhitePawn) {
              score -= BACKWARD_PAWN_PENALTY;
              break;
            }
          }
        }
      }
    }
  }

  return score;
}

/**
 * Simple mobility evaluation: count pseudo-legal non-pawn, non-king piece moves.
 */
function evaluateMobility(state: BoardState): number {
  let score = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None) continue;

    const pt = pieceType(p);
    if (pt === PieceType.Pawn || pt === PieceType.King) continue;

    const color = pieceColor(p);
    const sign = color === Color.White ? 1 : -1;
    let moves = 0;

    if (pt === PieceType.Knight) {
      for (const offset of KNIGHT_OFFSETS) {
        const to = sq + offset;
        if (!isValidSquare(to)) continue;
        const target = state.board[to];
        if (target === Piece.None || pieceColor(target) !== color) {
          moves++;
        }
      }
      score += sign * moves * MOBILITY_MINOR;
    } else {
      const directions = pt === PieceType.Bishop
        ? BISHOP_DIRECTIONS
        : pt === PieceType.Rook
          ? ROOK_DIRECTIONS
          : [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]; // queen

      for (const dir of directions) {
        let to = sq + dir;
        while (isValidSquare(to)) {
          const target = state.board[to];
          if (target === Piece.None) {
            moves++;
          } else {
            if (pieceColor(target) !== color) moves++;
            break;
          }
          to += dir;
        }
      }

      const cpPerSquare = (pt === PieceType.Bishop) ? MOBILITY_MINOR : MOBILITY_MAJOR;
      score += sign * moves * cpPerSquare;
    }
  }

  return score;
}

/**
 * Evaluate king safety: pawn shield, open files near king.
 */
function evaluateKingSafety(state: BoardState): number {
  let score = 0;

  for (const color of [Color.White, Color.Black]) {
    const sign = color === Color.White ? 1 : -1;
    const kingSq = state.kingSquares[color];
    const kingFile = squareFile(kingSq);
    const kingRank = squareRank(kingSq);

    // Pawn shield: check pawns in front of king
    const pawnDir = color === Color.White ? -16 : 16; // direction toward opponent
    const friendlyPawn = color === Color.White ? Piece.WhitePawn : Piece.BlackPawn;

    let shieldCount = 0;
    for (let df = -1; df <= 1; df++) {
      const file = kingFile + df;
      if (file < 0 || file > 7) continue;

      // Check 1 and 2 squares in front of king
      for (let dist = 1; dist <= 2; dist++) {
        const checkRank = kingRank + (pawnDir >> 4) * dist;
        if (checkRank < 0 || checkRank > 7) continue;
        const checkSq = (checkRank << 4) | file;
        if (isValidSquare(checkSq) && state.board[checkSq] === friendlyPawn) {
          shieldCount++;
          break; // found pawn on this file
        }
      }
    }

    // Award bonus for pawn shield, penalize missing pawns
    score += sign * (shieldCount * PAWN_SHIELD_BONUS + (3 - shieldCount) * PAWN_SHIELD_MISSING_PENALTY);

    // Open files near king
    for (let df = -1; df <= 1; df++) {
      const file = kingFile + df;
      if (file < 0 || file > 7) continue;

      let hasFriendlyPawn = false;
      for (let rank = 0; rank < 8; rank++) {
        const sq = (rank << 4) | file;
        if (state.board[sq] === friendlyPawn) {
          hasFriendlyPawn = true;
          break;
        }
      }

      if (!hasFriendlyPawn) {
        score += sign * OPEN_FILE_NEAR_KING_PENALTY;
      }
    }
  }

  return score;
}

/**
 * Static board evaluation from the perspective of the side to move.
 * Positive = good for side to move, negative = bad.
 */
export function evaluate(state: BoardState): number {
  const phase = computeGamePhase(state);
  const phaseRatio = phase / TOTAL_PHASE; // 1.0 = full middlegame, 0.0 = endgame

  // Material + PST (interpolated)
  const { mgScore, egScore } = evaluateMaterialAndPST(state);
  let score = Math.round(mgScore * phaseRatio + egScore * (1 - phaseRatio));

  // Bishop pair
  score += evaluateBishopPair(state);

  // Pawn structure
  score += evaluatePawnStructure(state);

  // Mobility (scaled down in endgame, boosted by aggression)
  const mobilityScale = (0.5 + 0.5 * phaseRatio) * (1 + aggressionFactor * 0.015);
  score += Math.round(evaluateMobility(state) * mobilityScale);

  // King safety (more important in middlegame, boosted by negative aggression)
  const kingSafetyScale = phaseRatio * (1 - aggressionFactor * 0.01);
  score += Math.round(evaluateKingSafety(state) * kingSafetyScale);

  // Return from side-to-move perspective
  return state.sideToMove === Color.White ? score : -score;
}
