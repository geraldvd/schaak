import {
  type BoardState,
  type Move,
  type Square88,
  Piece,
  Color,
  PieceType,
  MoveFlag,
  CastlingRight,
} from '../types';
import {
  isValidSquare,
  pieceType,
  pieceColor,
  makePiece,
  KNIGHT_OFFSETS,
  KING_OFFSETS,
  BISHOP_DIRECTIONS,
  ROOK_DIRECTIONS,
  PAWN_CAPTURE_OFFSETS,
  CASTLING_RIGHTS_MASK,
  CASTLING_CONFIG,
} from '../constants';
import { generatePseudoLegalMoves } from './moves';
import {
  ZOBRIST_PIECE,
  ZOBRIST_SIDE,
  ZOBRIST_CASTLING,
  ZOBRIST_EN_PASSANT,
} from './zobrist';

/**
 * Check if a square is attacked by the given color.
 */
export function isSquareAttacked(state: BoardState, sq: Square88, byColor: Color): boolean {
  const board = state.board;

  // Knight attacks
  for (const offset of KNIGHT_OFFSETS) {
    const from = sq + offset;
    if (!isValidSquare(from)) continue;
    const p = board[from];
    if (p !== Piece.None && pieceColor(p) === byColor && pieceType(p) === PieceType.Knight) {
      return true;
    }
  }

  // King attacks
  for (const offset of KING_OFFSETS) {
    const from = sq + offset;
    if (!isValidSquare(from)) continue;
    const p = board[from];
    if (p !== Piece.None && pieceColor(p) === byColor && pieceType(p) === PieceType.King) {
      return true;
    }
  }

  // Pawn attacks (reverse lookup: check if a pawn of `byColor` can capture on `sq`)
  const pawnOffsets = PAWN_CAPTURE_OFFSETS[byColor];
  for (const offset of pawnOffsets) {
    // A pawn attacks sq from sq - offset
    const from = sq - offset;
    if (!isValidSquare(from)) continue;
    const p = board[from];
    if (p !== Piece.None && pieceColor(p) === byColor && pieceType(p) === PieceType.Pawn) {
      return true;
    }
  }

  // Sliding attacks: bishop/queen on diagonals
  for (const dir of BISHOP_DIRECTIONS) {
    let from = sq + dir;
    while (isValidSquare(from)) {
      const p = board[from];
      if (p !== Piece.None) {
        if (pieceColor(p) === byColor) {
          const t = pieceType(p);
          if (t === PieceType.Bishop || t === PieceType.Queen) return true;
        }
        break;
      }
      from += dir;
    }
  }

  // Sliding attacks: rook/queen on files/ranks
  for (const dir of ROOK_DIRECTIONS) {
    let from = sq + dir;
    while (isValidSquare(from)) {
      const p = board[from];
      if (p !== Piece.None) {
        if (pieceColor(p) === byColor) {
          const t = pieceType(p);
          if (t === PieceType.Rook || t === PieceType.Queen) return true;
        }
        break;
      }
      from += dir;
    }
  }

  return false;
}

/**
 * Check if the given side's king is in check.
 */
export function isInCheck(state: BoardState, color: Color): boolean {
  const kingSq = state.kingSquares[color];
  const enemy = color === Color.White ? Color.Black : Color.White;
  return isSquareAttacked(state, kingSq, enemy);
}

/**
 * Make a move on the board state (mutates in place). Returns undo info.
 */
export interface UndoInfo {
  capturedPiece: Piece;
  castlingRights: number;
  enPassantSquare: number;
  halfMoveClock: number;
  zobristHash: number;
}

export function makeMove(state: BoardState, move: Move): UndoInfo {
  const board = state.board;
  const undo: UndoInfo = {
    capturedPiece: move.captured,
    castlingRights: state.castlingRights,
    enPassantSquare: state.enPassantSquare,
    halfMoveClock: state.halfMoveClock,
    zobristHash: state.zobristHash,
  };

  let hash = state.zobristHash;

  // Remove piece from source
  hash ^= ZOBRIST_PIECE[move.piece][move.from];
  board[move.from] = Piece.None;

  // Remove captured piece from target (if any, and not en passant)
  if (move.captured !== Piece.None && move.flag !== MoveFlag.EnPassant) {
    hash ^= ZOBRIST_PIECE[move.captured][move.to];
  }

  // Handle special moves
  let placedPiece = move.piece;

  switch (move.flag) {
    case MoveFlag.EnPassant: {
      // Remove the captured pawn
      const capturedSq = state.sideToMove === Color.White
        ? move.to + 16  // captured pawn is one rank below (higher index)
        : move.to - 16; // captured pawn is one rank above
      hash ^= ZOBRIST_PIECE[board[capturedSq]][capturedSq];
      board[capturedSq] = Piece.None;
      break;
    }
    case MoveFlag.KingsideCastle: {
      const config = CASTLING_CONFIG[
        state.sideToMove === Color.White
          ? CastlingRight.WhiteKingside
          : CastlingRight.BlackKingside
      ];
      const rook = board[config.rookFrom];
      hash ^= ZOBRIST_PIECE[rook][config.rookFrom];
      board[config.rookFrom] = Piece.None;
      board[config.rookTo] = rook;
      hash ^= ZOBRIST_PIECE[rook][config.rookTo];
      break;
    }
    case MoveFlag.QueensideCastle: {
      const config = CASTLING_CONFIG[
        state.sideToMove === Color.White
          ? CastlingRight.WhiteQueenside
          : CastlingRight.BlackQueenside
      ];
      const rook = board[config.rookFrom];
      hash ^= ZOBRIST_PIECE[rook][config.rookFrom];
      board[config.rookFrom] = Piece.None;
      board[config.rookTo] = rook;
      hash ^= ZOBRIST_PIECE[rook][config.rookTo];
      break;
    }
    case MoveFlag.PromoteQueen:
      placedPiece = makePiece(state.sideToMove, PieceType.Queen);
      break;
    case MoveFlag.PromoteRook:
      placedPiece = makePiece(state.sideToMove, PieceType.Rook);
      break;
    case MoveFlag.PromoteBishop:
      placedPiece = makePiece(state.sideToMove, PieceType.Bishop);
      break;
    case MoveFlag.PromoteKnight:
      placedPiece = makePiece(state.sideToMove, PieceType.Knight);
      break;
  }

  // Place piece at destination
  board[move.to] = placedPiece;
  hash ^= ZOBRIST_PIECE[placedPiece][move.to];

  // Update king square
  if (pieceType(move.piece) === PieceType.King) {
    state.kingSquares[state.sideToMove] = move.to;
  }

  // Update castling rights
  hash ^= ZOBRIST_CASTLING[state.castlingRights];
  state.castlingRights &= CASTLING_RIGHTS_MASK[move.from];
  state.castlingRights &= CASTLING_RIGHTS_MASK[move.to];
  hash ^= ZOBRIST_CASTLING[state.castlingRights];

  // Update en passant square
  if (state.enPassantSquare !== -1) {
    hash ^= ZOBRIST_EN_PASSANT[state.enPassantSquare & 7];
  }
  if (move.flag === MoveFlag.DoublePush) {
    state.enPassantSquare = (move.from + move.to) >> 1; // square between from and to
    hash ^= ZOBRIST_EN_PASSANT[state.enPassantSquare & 7];
  } else {
    state.enPassantSquare = -1;
  }

  // Update halfmove clock
  if (pieceType(move.piece) === PieceType.Pawn || move.captured !== Piece.None) {
    state.halfMoveClock = 0;
  } else {
    state.halfMoveClock++;
  }

  // Update fullmove number
  if (state.sideToMove === Color.Black) {
    state.fullMoveNumber++;
  }

  // Switch side
  state.sideToMove = state.sideToMove === Color.White ? Color.Black : Color.White;
  hash ^= ZOBRIST_SIDE;

  state.zobristHash = hash;

  return undo;
}

/**
 * Unmake a move on the board state (mutates in place).
 */
export function unmakeMove(state: BoardState, move: Move, undo: UndoInfo): void {
  const board = state.board;

  // Switch side back
  state.sideToMove = state.sideToMove === Color.White ? Color.Black : Color.White;

  // Restore piece at source
  board[move.from] = move.piece;

  // Handle special moves
  switch (move.flag) {
    case MoveFlag.EnPassant: {
      // Restore the captured pawn
      const capturedSq = state.sideToMove === Color.White
        ? move.to + 16
        : move.to - 16;
      board[capturedSq] = undo.capturedPiece;
      board[move.to] = Piece.None;
      break;
    }
    case MoveFlag.KingsideCastle: {
      const config = CASTLING_CONFIG[
        state.sideToMove === Color.White
          ? CastlingRight.WhiteKingside
          : CastlingRight.BlackKingside
      ];
      const rook = board[config.rookTo];
      board[config.rookTo] = Piece.None;
      board[config.rookFrom] = rook;
      board[move.to] = Piece.None;
      break;
    }
    case MoveFlag.QueensideCastle: {
      const config = CASTLING_CONFIG[
        state.sideToMove === Color.White
          ? CastlingRight.WhiteQueenside
          : CastlingRight.BlackQueenside
      ];
      const rook = board[config.rookTo];
      board[config.rookTo] = Piece.None;
      board[config.rookFrom] = rook;
      board[move.to] = Piece.None;
      break;
    }
    default:
      // Restore captured piece at destination (or empty)
      board[move.to] = move.captured !== Piece.None ? move.captured : Piece.None;
      break;
  }

  // Restore king square
  if (pieceType(move.piece) === PieceType.King) {
    state.kingSquares[state.sideToMove] = move.from;
  }

  // Restore state
  state.castlingRights = undo.castlingRights;
  state.enPassantSquare = undo.enPassantSquare;
  state.halfMoveClock = undo.halfMoveClock;
  state.zobristHash = undo.zobristHash;

  if (state.sideToMove === Color.Black) {
    state.fullMoveNumber--;
  }
}

/**
 * Generate all legal moves for the current position.
 */
export function generateLegalMoves(state: BoardState): Move[] {
  const pseudoMoves = generatePseudoLegalMoves(state);
  const legalMoves: Move[] = [];
  const us = state.sideToMove;
  const enemy = us === Color.White ? Color.Black : Color.White;

  for (const move of pseudoMoves) {
    // For castling, check that king doesn't move through or out of check
    if (move.flag === MoveFlag.KingsideCastle || move.flag === MoveFlag.QueensideCastle) {
      // King must not be in check before castling
      if (isSquareAttacked(state, move.from, enemy)) continue;

      // King must not pass through attacked squares
      const right = move.flag === MoveFlag.KingsideCastle
        ? (us === Color.White ? CastlingRight.WhiteKingside : CastlingRight.BlackKingside)
        : (us === Color.White ? CastlingRight.WhiteQueenside : CastlingRight.BlackQueenside);
      const config = CASTLING_CONFIG[right];
      let pathSafe = true;
      for (const sq of config.pathSquares) {
        if (isSquareAttacked(state, sq, enemy)) {
          pathSafe = false;
          break;
        }
      }
      if (!pathSafe) continue;
    }

    // Make the move, check if our king is in check, then unmake
    const undo = makeMove(state, move);
    // After makeMove, sideToMove has flipped, so "us" is now the opponent from state's perspective
    const kingSq = state.kingSquares[us];
    const inCheck = isSquareAttacked(state, kingSq, enemy);
    unmakeMove(state, move, undo);

    if (!inCheck) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}
