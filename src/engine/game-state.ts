import {
  type BoardState,
  Piece,
  Color,
  PieceType,
  GameResult,
} from '../types';
import { pieceType, pieceColor } from '../constants';
import { isInCheck, generateLegalMoves } from './validation';

/**
 * Check if the current position is checkmate.
 */
export function isCheckmate(state: BoardState): boolean {
  const legalMoves = generateLegalMoves(state);
  if (legalMoves.length > 0) return false;
  return isInCheck(state, state.sideToMove);
}

/**
 * Check if the current position is stalemate.
 */
export function isStalemate(state: BoardState): boolean {
  const legalMoves = generateLegalMoves(state);
  if (legalMoves.length > 0) return false;
  return !isInCheck(state, state.sideToMove);
}

/**
 * Check 50-move rule draw.
 */
export function isFiftyMoveDraw(state: BoardState): boolean {
  return state.halfMoveClock >= 100; // 100 half-moves = 50 full moves
}

/**
 * Check threefold repetition from position history.
 */
export function isThreefoldRepetition(positionHistory: number[], currentHash: number): boolean {
  let count = 0;
  for (const hash of positionHistory) {
    if (hash === currentHash) {
      count++;
      if (count >= 2) return true; // current position + 2 prior = threefold
    }
  }
  return false;
}

/**
 * Check insufficient material draw.
 * K vs K, K+N vs K, K+B vs K, K+B vs K+B (same color bishops)
 */
export function isInsufficientMaterial(state: BoardState): boolean {
  const pieces: { type: PieceType; color: Color; sq: number }[] = [];

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = state.board[sq];
    if (p === Piece.None) continue;
    pieces.push({ type: pieceType(p), color: pieceColor(p), sq });
  }

  // K vs K
  if (pieces.length === 2) return true;

  // K+N vs K or K+B vs K
  if (pieces.length === 3) {
    const nonKing = pieces.find(p => p.type !== PieceType.King);
    if (nonKing && (nonKing.type === PieceType.Knight || nonKing.type === PieceType.Bishop)) {
      return true;
    }
  }

  // K+B vs K+B same color bishops
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === PieceType.Bishop);
    if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
      // Check if bishops are on same color square
      const sq1Color = ((bishops[0].sq >> 4) + (bishops[0].sq & 7)) % 2;
      const sq2Color = ((bishops[1].sq >> 4) + (bishops[1].sq & 7)) % 2;
      if (sq1Color === sq2Color) return true;
    }
  }

  return false;
}

/**
 * Determine the game result for the current position.
 */
export function getGameResult(state: BoardState, positionHistory: number[]): GameResult {
  if (isInsufficientMaterial(state)) return GameResult.DrawInsufficientMaterial;
  if (isFiftyMoveDraw(state)) return GameResult.DrawFiftyMove;
  if (isThreefoldRepetition(positionHistory, state.zobristHash)) return GameResult.DrawRepetition;

  const legalMoves = generateLegalMoves(state);
  if (legalMoves.length === 0) {
    if (isInCheck(state, state.sideToMove)) {
      return state.sideToMove === Color.White ? GameResult.BlackWins : GameResult.WhiteWins;
    }
    return GameResult.DrawStalemate;
  }

  return GameResult.InProgress;
}
