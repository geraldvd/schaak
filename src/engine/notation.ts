import {
  type BoardState,
  type Move,
  Piece,
  PieceType,
  MoveFlag,
} from '../types';
import {
  pieceType,
  squareToAlgebraic,
  algebraicToSquare,
  squareFile,
  squareRank,
} from '../constants';
import { generateLegalMoves, isInCheck, makeMove, unmakeMove } from './validation';

const PIECE_CHARS: Record<number, string> = {
  [PieceType.Knight]: 'N',
  [PieceType.Bishop]: 'B',
  [PieceType.Rook]: 'R',
  [PieceType.Queen]: 'Q',
  [PieceType.King]: 'K',
};

const PROMO_CHARS: Record<number, string> = {
  [MoveFlag.PromoteKnight]: 'N',
  [MoveFlag.PromoteBishop]: 'B',
  [MoveFlag.PromoteRook]: 'R',
  [MoveFlag.PromoteQueen]: 'Q',
};

/**
 * Convert a move to Standard Algebraic Notation (SAN).
 * Requires the board state BEFORE the move is made (for disambiguation).
 */
export function moveToSAN(state: BoardState, move: Move): string {
  // Castling
  if (move.flag === MoveFlag.KingsideCastle) return 'O-O';
  if (move.flag === MoveFlag.QueensideCastle) return 'O-O-O';

  const pt = pieceType(move.piece);
  let san = '';

  if (pt === PieceType.Pawn) {
    // Pawn moves
    if (move.captured !== Piece.None || move.flag === MoveFlag.EnPassant) {
      san += String.fromCharCode(97 + squareFile(move.from)); // file letter for captures
      san += 'x';
    }
    san += squareToAlgebraic(move.to);

    // Promotion
    if (PROMO_CHARS[move.flag]) {
      san += '=' + PROMO_CHARS[move.flag];
    }
  } else {
    san += PIECE_CHARS[pt] || '';

    // Disambiguation
    const legalMoves = generateLegalMoves(state);
    const ambiguous = legalMoves.filter(m =>
      m.to === move.to &&
      m.from !== move.from &&
      pieceType(m.piece) === pt
    );

    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(m => squareFile(m.from) === squareFile(move.from));
      const sameRank = ambiguous.some(m => squareRank(m.from) === squareRank(move.from));

      if (!sameFile) {
        san += String.fromCharCode(97 + squareFile(move.from));
      } else if (!sameRank) {
        san += (8 - squareRank(move.from)).toString();
      } else {
        san += squareToAlgebraic(move.from);
      }
    }

    if (move.captured !== Piece.None) {
      san += 'x';
    }

    san += squareToAlgebraic(move.to);
  }

  // Check/Checkmate suffix
  const undo = makeMove(state, move);
  const inCheck = isInCheck(state, state.sideToMove);
  if (inCheck) {
    const hasLegal = generateLegalMoves(state).length > 0;
    san += hasLegal ? '+' : '#';
  }
  unmakeMove(state, move, undo);

  return san;
}

/**
 * Parse a SAN string to find the corresponding move.
 */
export function parseSAN(state: BoardState, san: string): Move | null {
  const legalMoves = generateLegalMoves(state);

  // Try castling first
  if (san === 'O-O' || san === '0-0') {
    return legalMoves.find(m => m.flag === MoveFlag.KingsideCastle) || null;
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    return legalMoves.find(m => m.flag === MoveFlag.QueensideCastle) || null;
  }

  // Strip check/mate symbols
  const cleaned = san.replace(/[+#!?]+$/, '');

  let pt: PieceType | null = null;
  let fromFile: number | null = null;
  let fromRank: number | null = null;
  let toSquare: number | null = null;
  let isCapture = false;
  let promoType: MoveFlag | null = null;

  let i = 0;

  // Piece type
  if ('NBRQK'.includes(cleaned[i])) {
    pt = { N: PieceType.Knight, B: PieceType.Bishop, R: PieceType.Rook, Q: PieceType.Queen, K: PieceType.King }[cleaned[i]]!;
    i++;
  } else {
    pt = PieceType.Pawn;
  }

  // Parse the rest - find the target square (last two chars before promotion)
  const promoIdx = cleaned.indexOf('=');
  const endIdx = promoIdx !== -1 ? promoIdx : cleaned.length;

  // Find target square: last file+rank pair
  let targetStr = '';
  let disambig = '';

  // Remove 'x' and find squares
  const body = cleaned.slice(i, endIdx).replace('x', () => { isCapture = true; return ''; });

  if (body.length >= 2) {
    targetStr = body.slice(-2);
    disambig = body.slice(0, -2);
  } else if (body.length === 1 && pt === PieceType.Pawn) {
    // edge case shouldn't happen in valid SAN
    targetStr = body;
  }

  if (targetStr.length === 2) {
    toSquare = algebraicToSquare(targetStr);
  }

  // Disambiguation
  if (disambig.length >= 1) {
    const ch = disambig[0];
    if (ch >= 'a' && ch <= 'h') fromFile = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '8') fromRank = 8 - parseInt(ch);
  }
  if (disambig.length >= 2) {
    const ch = disambig[1];
    if (ch >= '1' && ch <= '8') fromRank = 8 - parseInt(ch);
  }

  // Pawn capture disambiguation: if pawn and capture, first char was file
  if (pt === PieceType.Pawn && isCapture && fromFile === null && i > 0) {
    // Already handled by piece char parsing
  }

  // Promotion
  if (promoIdx !== -1) {
    const promoChar = cleaned[promoIdx + 1];
    const promoMap: Record<string, MoveFlag> = {
      Q: MoveFlag.PromoteQueen,
      R: MoveFlag.PromoteRook,
      B: MoveFlag.PromoteBishop,
      N: MoveFlag.PromoteKnight,
    };
    promoType = promoMap[promoChar] || null;
  }

  // Find matching legal move
  for (const move of legalMoves) {
    if (pieceType(move.piece) !== pt) continue;
    if (toSquare !== null && move.to !== toSquare) continue;
    if (fromFile !== null && squareFile(move.from) !== fromFile) continue;
    if (fromRank !== null && squareRank(move.from) !== fromRank) continue;
    if (promoType !== null && move.flag !== promoType) continue;
    if (promoType === null && move.flag >= MoveFlag.PromoteKnight && move.flag <= MoveFlag.PromoteQueen) continue;
    return move;
  }

  return null;
}
