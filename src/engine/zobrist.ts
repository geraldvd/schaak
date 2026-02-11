import { type BoardState, Piece, Color } from '../types';

// Pseudo-random number generator (xorshift32) for reproducible Zobrist keys
function xorshift32(state: { seed: number }): number {
  let x = state.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x;
  return x >>> 0; // ensure unsigned 32-bit
}

// Generate a pair of 32-bit numbers to form a "wide" hash (we'll use two 32-bit numbers XOR'd)
function nextZobristKey(rng: { seed: number }): number {
  return xorshift32(rng);
}

// Zobrist keys: piece[pieceIndex][square], sideToMove, castling[16], enPassant[8]
const rng = { seed: 1070372 };

// 15 piece types (0-14) x 64 squares mapped to 0x88
export const ZOBRIST_PIECE: number[][] = [];
for (let piece = 0; piece < 15; piece++) {
  ZOBRIST_PIECE[piece] = [];
  for (let sq = 0; sq < 128; sq++) {
    ZOBRIST_PIECE[piece][sq] = (sq & 0x88) === 0 ? nextZobristKey(rng) : 0;
  }
}

export const ZOBRIST_SIDE = nextZobristKey(rng);

export const ZOBRIST_CASTLING: number[] = [];
for (let i = 0; i < 16; i++) {
  ZOBRIST_CASTLING[i] = nextZobristKey(rng);
}

export const ZOBRIST_EN_PASSANT: number[] = [];
for (let file = 0; file < 8; file++) {
  ZOBRIST_EN_PASSANT[file] = nextZobristKey(rng);
}

/**
 * Compute the full Zobrist hash for a board state (used for initialization).
 */
export function computeZobristHash(state: BoardState): number {
  let hash = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const piece = state.board[sq];
    if (piece !== Piece.None) {
      hash ^= ZOBRIST_PIECE[piece][sq];
    }
  }

  if (state.sideToMove === Color.Black) {
    hash ^= ZOBRIST_SIDE;
  }

  hash ^= ZOBRIST_CASTLING[state.castlingRights];

  if (state.enPassantSquare !== -1) {
    hash ^= ZOBRIST_EN_PASSANT[state.enPassantSquare & 7];
  }

  return hash;
}
