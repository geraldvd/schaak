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
  squareRank,
  KNIGHT_OFFSETS,
  KING_OFFSETS,
  BISHOP_DIRECTIONS,
  ROOK_DIRECTIONS,
  QUEEN_DIRECTIONS,
  PAWN_PUSH_DIR,
  PAWN_CAPTURE_OFFSETS,
  PAWN_START_RANK,
  PROMOTION_RANK,
  CASTLING_CONFIG,
} from '../constants';

function createMove(
  from: Square88,
  to: Square88,
  piece: Piece,
  captured: Piece,
  flag: MoveFlag
): Move {
  return { from, to, piece, captured, flag };
}

/**
 * Generate all pseudo-legal moves for the side to move.
 * These may leave the king in check — filtering happens in validation.ts.
 */
export function generatePseudoLegalMoves(state: BoardState): Move[] {
  const moves: Move[] = [];
  const us = state.sideToMove;
  const board = state.board;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const piece = board[sq];
    if (piece === Piece.None) continue;
    if (pieceColor(piece) !== us) continue;

    const type = pieceType(piece);

    switch (type) {
      case PieceType.Pawn:
        generatePawnMoves(state, sq, piece, us, moves);
        break;
      case PieceType.Knight:
        generateKnightMoves(state, sq, piece, us, moves);
        break;
      case PieceType.Bishop:
        generateSlidingMoves(state, sq, piece, us, BISHOP_DIRECTIONS, moves);
        break;
      case PieceType.Rook:
        generateSlidingMoves(state, sq, piece, us, ROOK_DIRECTIONS, moves);
        break;
      case PieceType.Queen:
        generateSlidingMoves(state, sq, piece, us, QUEEN_DIRECTIONS, moves);
        break;
      case PieceType.King:
        generateKingMoves(state, sq, piece, us, moves);
        break;
    }
  }

  return moves;
}

function generatePawnMoves(
  state: BoardState,
  sq: Square88,
  piece: Piece,
  color: Color,
  moves: Move[]
): void {
  const board = state.board;
  const pushDir = PAWN_PUSH_DIR[color];
  const startRank = PAWN_START_RANK[color];
  const promoRank = PROMOTION_RANK[color];

  // Single push
  const pushTo = sq + pushDir;
  if (isValidSquare(pushTo) && board[pushTo] === Piece.None) {
    if (squareRank(pushTo) === promoRank) {
      moves.push(createMove(sq, pushTo, piece, Piece.None, MoveFlag.PromoteQueen));
      moves.push(createMove(sq, pushTo, piece, Piece.None, MoveFlag.PromoteRook));
      moves.push(createMove(sq, pushTo, piece, Piece.None, MoveFlag.PromoteBishop));
      moves.push(createMove(sq, pushTo, piece, Piece.None, MoveFlag.PromoteKnight));
    } else {
      moves.push(createMove(sq, pushTo, piece, Piece.None, MoveFlag.None));
    }

    // Double push (only from starting rank, both squares must be empty)
    if (squareRank(sq) === startRank) {
      const doubleTo = sq + pushDir * 2;
      if (isValidSquare(doubleTo) && board[doubleTo] === Piece.None) {
        moves.push(createMove(sq, doubleTo, piece, Piece.None, MoveFlag.DoublePush));
      }
    }
  }

  // Captures
  for (const offset of PAWN_CAPTURE_OFFSETS[color]) {
    const capTo = sq + offset;
    if (!isValidSquare(capTo)) continue;

    const target = board[capTo];
    if (target !== Piece.None && pieceColor(target) !== color) {
      if (squareRank(capTo) === promoRank) {
        moves.push(createMove(sq, capTo, piece, target, MoveFlag.PromoteQueen));
        moves.push(createMove(sq, capTo, piece, target, MoveFlag.PromoteRook));
        moves.push(createMove(sq, capTo, piece, target, MoveFlag.PromoteBishop));
        moves.push(createMove(sq, capTo, piece, target, MoveFlag.PromoteKnight));
      } else {
        moves.push(createMove(sq, capTo, piece, target, MoveFlag.None));
      }
    }

    // En passant
    if (capTo === state.enPassantSquare) {
      // The captured pawn is on the same rank as the moving pawn, on the en passant file
      const epCapturedSq = capTo - pushDir;
      const epCaptured = board[epCapturedSq];
      moves.push(createMove(sq, capTo, piece, epCaptured, MoveFlag.EnPassant));
    }
  }
}

function generateKnightMoves(
  state: BoardState,
  sq: Square88,
  piece: Piece,
  color: Color,
  moves: Move[]
): void {
  const board = state.board;
  for (const offset of KNIGHT_OFFSETS) {
    const to = sq + offset;
    if (!isValidSquare(to)) continue;
    const target = board[to];
    if (target === Piece.None) {
      moves.push(createMove(sq, to, piece, Piece.None, MoveFlag.None));
    } else if (pieceColor(target) !== color) {
      moves.push(createMove(sq, to, piece, target, MoveFlag.None));
    }
  }
}

function generateSlidingMoves(
  state: BoardState,
  sq: Square88,
  piece: Piece,
  color: Color,
  directions: number[],
  moves: Move[]
): void {
  const board = state.board;
  for (const dir of directions) {
    let to = sq + dir;
    while (isValidSquare(to)) {
      const target = board[to];
      if (target === Piece.None) {
        moves.push(createMove(sq, to, piece, Piece.None, MoveFlag.None));
      } else {
        if (pieceColor(target) !== color) {
          moves.push(createMove(sq, to, piece, target, MoveFlag.None));
        }
        break; // blocked by piece
      }
      to += dir;
    }
  }
}

function generateKingMoves(
  state: BoardState,
  sq: Square88,
  piece: Piece,
  color: Color,
  moves: Move[]
): void {
  const board = state.board;

  // Normal king moves
  for (const offset of KING_OFFSETS) {
    const to = sq + offset;
    if (!isValidSquare(to)) continue;
    const target = board[to];
    if (target === Piece.None) {
      moves.push(createMove(sq, to, piece, Piece.None, MoveFlag.None));
    } else if (pieceColor(target) !== color) {
      moves.push(createMove(sq, to, piece, target, MoveFlag.None));
    }
  }

  // Castling (pseudo-legal: we check path is clear here, check legality in validation)
  const kingsideRight = color === Color.White
    ? CastlingRight.WhiteKingside
    : CastlingRight.BlackKingside;
  const queensideRight = color === Color.White
    ? CastlingRight.WhiteQueenside
    : CastlingRight.BlackQueenside;

  if (state.castlingRights & kingsideRight) {
    const config = CASTLING_CONFIG[kingsideRight];
    if (sq === config.kingFrom) {
      const pathClear = config.pathSquares.every(s => board[s] === Piece.None);
      if (pathClear) {
        moves.push(createMove(sq, config.kingTo, piece, Piece.None, MoveFlag.KingsideCastle));
      }
    }
  }

  if (state.castlingRights & queensideRight) {
    const config = CASTLING_CONFIG[queensideRight];
    if (sq === config.kingFrom) {
      const emptySquares = config.emptySquares || config.pathSquares;
      const pathClear = emptySquares.every(s => board[s] === Piece.None);
      if (pathClear) {
        moves.push(createMove(sq, config.kingTo, piece, Piece.None, MoveFlag.QueensideCastle));
      }
    }
  }
}

/**
 * Generate pseudo-legal capture moves only (for quiescence search).
 */
export function generateCaptureMoves(state: BoardState): Move[] {
  const allMoves = generatePseudoLegalMoves(state);
  return allMoves.filter(m => m.captured !== Piece.None || m.flag === MoveFlag.EnPassant);
}
