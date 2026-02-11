import { describe, it, expect } from 'vitest';
import { generatePseudoLegalMoves } from '../../src/engine/moves';
import { parseFEN } from '../../src/engine/board';
import { INITIAL_FEN } from '../../src/constants';
import { PieceType, MoveFlag } from '../../src/types';
import { pieceType } from '../../src/constants';

describe('pseudo-legal move generation', () => {
  it('should generate 20 moves from starting position', () => {
    const state = parseFEN(INITIAL_FEN);
    const moves = generatePseudoLegalMoves(state);
    expect(moves.length).toBe(20);
  });

  it('should include pawn double pushes', () => {
    const state = parseFEN(INITIAL_FEN);
    const moves = generatePseudoLegalMoves(state);
    const doublePushes = moves.filter(m => m.flag === MoveFlag.DoublePush);
    expect(doublePushes.length).toBe(8);
  });

  it('should include knight moves', () => {
    const state = parseFEN(INITIAL_FEN);
    const moves = generatePseudoLegalMoves(state);
    const knightMoves = moves.filter(m => pieceType(m.piece) === PieceType.Knight);
    expect(knightMoves.length).toBe(4);
  });

  it('should generate en passant captures', () => {
    // White pawn on e5, black just played d7-d5
    const state = parseFEN('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1');
    const moves = generatePseudoLegalMoves(state);
    const epMoves = moves.filter(m => m.flag === MoveFlag.EnPassant);
    expect(epMoves.length).toBe(1);
  });

  it('should generate promotion moves', () => {
    const state = parseFEN('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    const moves = generatePseudoLegalMoves(state);
    const promos = moves.filter(m =>
      m.flag >= MoveFlag.PromoteKnight && m.flag <= MoveFlag.PromoteQueen
    );
    expect(promos.length).toBe(4); // Q, R, B, N
  });

  it('should generate castling moves when available', () => {
    const state = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const moves = generatePseudoLegalMoves(state);
    const castling = moves.filter(m =>
      m.flag === MoveFlag.KingsideCastle || m.flag === MoveFlag.QueensideCastle
    );
    expect(castling.length).toBe(2);
  });
});
