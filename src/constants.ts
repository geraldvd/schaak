import { Color, Piece, PieceType, CastlingRight, type Square88 } from './types';

// Starting position FEN
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Piece values in centipawns
export const PIECE_VALUES: Record<number, number> = {
  [PieceType.Pawn]: 100,
  [PieceType.Knight]: 320,
  [PieceType.Bishop]: 330,
  [PieceType.Rook]: 500,
  [PieceType.Queen]: 900,
  [PieceType.King]: 20000,
};

// Direction offsets on 0x88 board
export const DIRECTIONS = {
  N: -16,
  S: 16,
  E: 1,
  W: -1,
  NE: -15,
  NW: -17,
  SE: 17,
  SW: 15,
};

// Knight move offsets
export const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33];

// King move offsets (all 8 directions)
export const KING_OFFSETS = [-17, -16, -15, -1, 1, 15, 16, 17];

// Sliding piece directions
export const BISHOP_DIRECTIONS = [DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW];
export const ROOK_DIRECTIONS = [DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W];
export const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS];

// Pawn push directions per color
export const PAWN_PUSH_DIR: Record<number, number> = {
  [Color.White]: DIRECTIONS.N,
  [Color.Black]: DIRECTIONS.S,
};

// Pawn capture offsets per color
export const PAWN_CAPTURE_OFFSETS: Record<number, number[]> = {
  [Color.White]: [DIRECTIONS.NW, DIRECTIONS.NE],
  [Color.Black]: [DIRECTIONS.SW, DIRECTIONS.SE],
};

// Starting ranks for pawns (0x88 rank)
export const PAWN_START_RANK: Record<number, number> = {
  [Color.White]: 6,  // rank 2 in 0x88 = row index 6
  [Color.Black]: 1,  // rank 7 in 0x88 = row index 1
};

// Promotion rank (rank index in 0x88)
export const PROMOTION_RANK: Record<number, number> = {
  [Color.White]: 0,  // rank 8
  [Color.Black]: 7,  // rank 1
};

// Castling squares
export const CASTLING_CONFIG = {
  [CastlingRight.WhiteKingside]: {
    kingFrom: 0x74 as Square88,  // e1
    kingTo: 0x76 as Square88,    // g1
    rookFrom: 0x77 as Square88,  // h1
    rookTo: 0x75 as Square88,    // f1
    pathSquares: [0x75, 0x76] as Square88[],  // f1, g1
    right: CastlingRight.WhiteKingside,
  },
  [CastlingRight.WhiteQueenside]: {
    kingFrom: 0x74 as Square88,  // e1
    kingTo: 0x72 as Square88,    // c1
    rookFrom: 0x70 as Square88,  // a1
    rookTo: 0x73 as Square88,    // d1
    pathSquares: [0x73, 0x72] as Square88[],  // d1, c1
    emptySquares: [0x71, 0x72, 0x73] as Square88[],  // b1, c1, d1
    right: CastlingRight.WhiteQueenside,
  },
  [CastlingRight.BlackKingside]: {
    kingFrom: 0x04 as Square88,  // e8
    kingTo: 0x06 as Square88,    // g8
    rookFrom: 0x07 as Square88,  // h8
    rookTo: 0x05 as Square88,    // f8
    pathSquares: [0x05, 0x06] as Square88[],  // f8, g8
    right: CastlingRight.BlackKingside,
  },
  [CastlingRight.BlackQueenside]: {
    kingFrom: 0x04 as Square88,  // e8
    kingTo: 0x02 as Square88,    // c8
    rookFrom: 0x00 as Square88,  // a8
    rookTo: 0x03 as Square88,    // d8
    pathSquares: [0x03, 0x02] as Square88[],  // d8, c8
    emptySquares: [0x01, 0x02, 0x03] as Square88[],  // b8, c8, d8
    right: CastlingRight.BlackQueenside,
  },
};

// Castling rights mask: indexed by square, AND with castling rights after a move
// from/to that square to remove the appropriate rights
export const CASTLING_RIGHTS_MASK: number[] = new Array(128).fill(15);
CASTLING_RIGHTS_MASK[0x74] = ~(CastlingRight.WhiteKingside | CastlingRight.WhiteQueenside) & 0xF; // e1 - white king
CASTLING_RIGHTS_MASK[0x77] = ~CastlingRight.WhiteKingside & 0xF;   // h1
CASTLING_RIGHTS_MASK[0x70] = ~CastlingRight.WhiteQueenside & 0xF;  // a1
CASTLING_RIGHTS_MASK[0x04] = ~(CastlingRight.BlackKingside | CastlingRight.BlackQueenside) & 0xF; // e8 - black king
CASTLING_RIGHTS_MASK[0x07] = ~CastlingRight.BlackKingside & 0xF;   // h8
CASTLING_RIGHTS_MASK[0x00] = ~CastlingRight.BlackQueenside & 0xF;  // a8

// Piece character mappings for FEN
export const PIECE_FROM_CHAR: Record<string, Piece> = {
  'P': Piece.WhitePawn,
  'N': Piece.WhiteKnight,
  'B': Piece.WhiteBishop,
  'R': Piece.WhiteRook,
  'Q': Piece.WhiteQueen,
  'K': Piece.WhiteKing,
  'p': Piece.BlackPawn,
  'n': Piece.BlackKnight,
  'b': Piece.BlackBishop,
  'r': Piece.BlackRook,
  'q': Piece.BlackQueen,
  'k': Piece.BlackKing,
};

export const CHAR_FROM_PIECE: Record<number, string> = {
  [Piece.WhitePawn]: 'P',
  [Piece.WhiteKnight]: 'N',
  [Piece.WhiteBishop]: 'B',
  [Piece.WhiteRook]: 'R',
  [Piece.WhiteQueen]: 'Q',
  [Piece.WhiteKing]: 'K',
  [Piece.BlackPawn]: 'p',
  [Piece.BlackKnight]: 'n',
  [Piece.BlackBishop]: 'b',
  [Piece.BlackRook]: 'r',
  [Piece.BlackQueen]: 'q',
  [Piece.BlackKing]: 'k',
};

// Extract piece type from encoded piece
export function pieceType(p: Piece): PieceType {
  return (p & 7) as PieceType;
}

// Extract piece color from encoded piece
export function pieceColor(p: Piece): Color {
  return ((p >> 3) & 1) as Color;
}

// Make a piece from color and type
export function makePiece(color: Color, type: PieceType): Piece {
  return ((color << 3) | type) as Piece;
}

// Check if square is valid on 0x88 board
export function isValidSquare(sq: number): boolean {
  return (sq & 0x88) === 0;
}

// Convert 0x88 index to rank (0=8, 7=1)
export function squareRank(sq: Square88): number {
  return sq >> 4;
}

// Convert 0x88 index to file (0=a, 7=h)
export function squareFile(sq: Square88): number {
  return sq & 7;
}

// Convert rank (0-7) and file (0-7) to 0x88 index
export function toSquare88(rank: number, file: number): Square88 {
  return (rank << 4) | file;
}

// Convert algebraic notation (e.g., "e4") to 0x88 square
export function algebraicToSquare(alg: string): Square88 {
  const file = alg.charCodeAt(0) - 97; // 'a' = 0
  const rank = 8 - parseInt(alg[1]);   // '8' = 0, '1' = 7
  return toSquare88(rank, file);
}

// Convert 0x88 square to algebraic notation
export function squareToAlgebraic(sq: Square88): string {
  const file = String.fromCharCode(97 + squareFile(sq));
  const rank = (8 - squareRank(sq)).toString();
  return file + rank;
}
