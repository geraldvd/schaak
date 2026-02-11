import {
  type BoardState,
  type Square88,
  Piece,
  Color,
  CastlingRight,
} from '../types';
import {
  PIECE_FROM_CHAR,
  CHAR_FROM_PIECE,
  toSquare88,
  squareToAlgebraic,
} from '../constants';
import { computeZobristHash } from './zobrist';

/**
 * Create an empty board state.
 */
export function createEmptyBoard(): BoardState {
  return {
    board: new Array(128).fill(Piece.None),
    sideToMove: Color.White,
    castlingRights: CastlingRight.None,
    enPassantSquare: -1,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    kingSquares: [0x74, 0x04], // default e1, e8
    zobristHash: 0,
  };
}

/**
 * Parse a FEN string into a BoardState.
 */
export function parseFEN(fen: string): BoardState {
  const state = createEmptyBoard();
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error(`Invalid FEN: ${fen}`);

  // 1. Piece placement
  const rows = parts[0].split('/');
  if (rows.length !== 8) throw new Error(`Invalid FEN board: ${parts[0]}`);

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const ch of rows[rank]) {
      if (ch >= '1' && ch <= '8') {
        file += parseInt(ch);
      } else {
        const piece = PIECE_FROM_CHAR[ch];
        if (piece === undefined) throw new Error(`Invalid piece char: ${ch}`);
        const sq = toSquare88(rank, file);
        state.board[sq] = piece;
        if (piece === Piece.WhiteKing) state.kingSquares[Color.White] = sq;
        if (piece === Piece.BlackKing) state.kingSquares[Color.Black] = sq;
        file++;
      }
    }
  }

  // 2. Side to move
  state.sideToMove = parts[1] === 'b' ? Color.Black : Color.White;

  // 3. Castling rights
  state.castlingRights = CastlingRight.None;
  if (parts[2] !== '-') {
    for (const ch of parts[2]) {
      switch (ch) {
        case 'K': state.castlingRights |= CastlingRight.WhiteKingside; break;
        case 'Q': state.castlingRights |= CastlingRight.WhiteQueenside; break;
        case 'k': state.castlingRights |= CastlingRight.BlackKingside; break;
        case 'q': state.castlingRights |= CastlingRight.BlackQueenside; break;
      }
    }
  }

  // 4. En passant square
  if (parts[3] !== '-') {
    const file = parts[3].charCodeAt(0) - 97;
    const rank = 8 - parseInt(parts[3][1]);
    state.enPassantSquare = toSquare88(rank, file);
  }

  // 5. Halfmove clock
  state.halfMoveClock = parts.length > 4 ? parseInt(parts[4]) : 0;

  // 6. Fullmove number
  state.fullMoveNumber = parts.length > 5 ? parseInt(parts[5]) : 1;

  // Compute zobrist hash
  state.zobristHash = computeZobristHash(state);

  return state;
}

/**
 * Convert a BoardState to FEN string.
 */
export function toFEN(state: BoardState): string {
  const parts: string[] = [];

  // 1. Piece placement
  const rows: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = state.board[toSquare88(rank, file)];
      if (piece === Piece.None) {
        empty++;
      } else {
        if (empty > 0) { row += empty.toString(); empty = 0; }
        row += CHAR_FROM_PIECE[piece];
      }
    }
    if (empty > 0) row += empty.toString();
    rows.push(row);
  }
  parts.push(rows.join('/'));

  // 2. Side to move
  parts.push(state.sideToMove === Color.White ? 'w' : 'b');

  // 3. Castling rights
  let castling = '';
  if (state.castlingRights & CastlingRight.WhiteKingside) castling += 'K';
  if (state.castlingRights & CastlingRight.WhiteQueenside) castling += 'Q';
  if (state.castlingRights & CastlingRight.BlackKingside) castling += 'k';
  if (state.castlingRights & CastlingRight.BlackQueenside) castling += 'q';
  parts.push(castling || '-');

  // 4. En passant
  parts.push(state.enPassantSquare === -1 ? '-' : squareToAlgebraic(state.enPassantSquare));

  // 5. Halfmove clock
  parts.push(state.halfMoveClock.toString());

  // 6. Fullmove number
  parts.push(state.fullMoveNumber.toString());

  return parts.join(' ');
}

/**
 * Clone a board state (deep copy of the board array).
 */
export function cloneState(state: BoardState): BoardState {
  return {
    board: state.board.slice(),
    sideToMove: state.sideToMove,
    castlingRights: state.castlingRights,
    enPassantSquare: state.enPassantSquare,
    halfMoveClock: state.halfMoveClock,
    fullMoveNumber: state.fullMoveNumber,
    kingSquares: [state.kingSquares[0], state.kingSquares[1]],
    zobristHash: state.zobristHash,
  };
}

/**
 * Get all pieces of a given color. Returns array of [square, piece] pairs.
 */
export function getPieces(state: BoardState, color: Color): [Square88, Piece][] {
  const pieces: [Square88, Piece][] = [];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue; // skip invalid squares
    const p = state.board[sq];
    if (p !== Piece.None && ((p >> 3) & 1) === color) {
      pieces.push([sq, p]);
    }
  }
  return pieces;
}
