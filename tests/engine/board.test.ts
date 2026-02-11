import { describe, it, expect } from 'vitest';
import { parseFEN, toFEN, cloneState, getPieces } from '../../src/engine/board';
import { INITIAL_FEN, algebraicToSquare, squareToAlgebraic } from '../../src/constants';
import { Piece, Color } from '../../src/types';

describe('board', () => {
  describe('parseFEN', () => {
    it('should parse the initial position', () => {
      const state = parseFEN(INITIAL_FEN);
      expect(state.board[algebraicToSquare('e1')]).toBe(Piece.WhiteKing);
      expect(state.board[algebraicToSquare('e8')]).toBe(Piece.BlackKing);
      expect(state.board[algebraicToSquare('d1')]).toBe(Piece.WhiteQueen);
      expect(state.board[algebraicToSquare('d8')]).toBe(Piece.BlackQueen);
      expect(state.board[algebraicToSquare('a2')]).toBe(Piece.WhitePawn);
      expect(state.board[algebraicToSquare('e7')]).toBe(Piece.BlackPawn);
      expect(state.sideToMove).toBe(Color.White);
      expect(state.castlingRights).toBe(15); // KQkq
      expect(state.enPassantSquare).toBe(-1);
      expect(state.halfMoveClock).toBe(0);
      expect(state.fullMoveNumber).toBe(1);
    });

    it('should parse FEN with en passant', () => {
      const fen = 'rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq e6 0 1';
      const state = parseFEN(fen);
      expect(state.enPassantSquare).toBe(algebraicToSquare('e6'));
      expect(state.sideToMove).toBe(Color.Black);
    });

    it('should parse FEN with no castling rights', () => {
      const fen = '8/8/8/8/8/8/8/4K2k w - - 0 1';
      const state = parseFEN(fen);
      expect(state.castlingRights).toBe(0);
    });
  });

  describe('toFEN', () => {
    it('should round-trip the initial position', () => {
      const state = parseFEN(INITIAL_FEN);
      expect(toFEN(state)).toBe(INITIAL_FEN);
    });

    it('should round-trip complex positions', () => {
      const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      const state = parseFEN(fen);
      expect(toFEN(state)).toBe(fen);
    });
  });

  describe('cloneState', () => {
    it('should create an independent copy', () => {
      const state = parseFEN(INITIAL_FEN);
      const clone = cloneState(state);
      clone.board[algebraicToSquare('e2')] = Piece.None;
      expect(state.board[algebraicToSquare('e2')]).toBe(Piece.WhitePawn);
    });
  });

  describe('getPieces', () => {
    it('should return all white pieces in starting position', () => {
      const state = parseFEN(INITIAL_FEN);
      const whitePieces = getPieces(state, Color.White);
      expect(whitePieces.length).toBe(16);
    });

    it('should return all black pieces in starting position', () => {
      const state = parseFEN(INITIAL_FEN);
      const blackPieces = getPieces(state, Color.Black);
      expect(blackPieces.length).toBe(16);
    });
  });

  describe('square utilities', () => {
    it('should convert algebraic to 0x88 and back', () => {
      expect(squareToAlgebraic(algebraicToSquare('a1'))).toBe('a1');
      expect(squareToAlgebraic(algebraicToSquare('h8'))).toBe('h8');
      expect(squareToAlgebraic(algebraicToSquare('e4'))).toBe('e4');
    });
  });
});
