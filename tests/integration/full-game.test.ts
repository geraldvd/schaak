import { describe, it, expect } from 'vitest';
import { parseFEN } from '../../src/engine/board';
import { generateLegalMoves, makeMove } from '../../src/engine/validation';
import { isCheckmate, getGameResult } from '../../src/engine/game-state';
import { moveToSAN, parseSAN } from '../../src/engine/notation';
import { GameResult, Color } from '../../src/types';

describe('full-game integration', () => {
  describe('scholar\'s mate playthrough', () => {
    it('should play through scholar\'s mate and detect checkmate', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const positionHistory: number[] = [];

      const moves = [
        'e4',   // 1. e4
        'e5',   // 1... e5
        'Bc4',  // 2. Bc4
        'Nc6',  // 2... Nc6
        'Qh5',  // 3. Qh5
        'Nf6',  // 3... Nf6??
        'Qxf7', // 4. Qxf7#
      ];

      for (let i = 0; i < moves.length; i++) {
        positionHistory.push(state.zobristHash);
        const result = getGameResult(state, positionHistory);
        expect(result).toBe(GameResult.InProgress);

        const move = parseSAN(state, moves[i]);
        expect(move, `Move ${i + 1}: Failed to parse ${moves[i]}`).not.toBeNull();

        const san = moveToSAN(state, move!);
        expect(san).toBeTruthy();

        makeMove(state, move!);
      }

      // Game should be over - checkmate
      // After Qxf7#, it's black's turn, black is in checkmate, so WHITE wins
      expect(isCheckmate(state)).toBe(true);
      expect(state.sideToMove).toBe(Color.Black);
      expect(getGameResult(state, positionHistory)).toBe(GameResult.WhiteWins);
    });
  });

  describe('fool\'s mate playthrough', () => {
    it('should play through fool\'s mate', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const positionHistory: number[] = [];

      const moves = [
        'f3',   // 1. f3
        'e5',   // 1... e5
        'g4',   // 2. g4??
        'Qh4',  // 2... Qh4#
      ];

      for (const san of moves) {
        positionHistory.push(state.zobristHash);
        const move = parseSAN(state, san);
        expect(move, `Failed to parse ${san}`).not.toBeNull();
        makeMove(state, move!);
      }

      expect(isCheckmate(state)).toBe(true);
      // White is in checkmate (it's white's turn, white is in check, no legal moves)
      expect(state.sideToMove).toBe(Color.White);
      expect(getGameResult(state, positionHistory)).toBe(GameResult.BlackWins);
    });
  });

  describe('move generation consistency', () => {
    it('should maintain consistent state after a sequence of moves', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      // Play Italian game opening
      const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];

      for (const san of moves) {
        const legalBefore = generateLegalMoves(state);
        expect(legalBefore.length).toBeGreaterThan(0);

        const move = parseSAN(state, san);
        expect(move, `Failed to parse ${san}`).not.toBeNull();
        makeMove(state, move!);
      }

      // After Italian game setup, both sides should have many legal moves
      const legalMoves = generateLegalMoves(state);
      expect(legalMoves.length).toBeGreaterThan(20);
    });

    it('should correctly track full move number', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      const moves = ['e4', 'e5', 'Nf3', 'Nc6'];

      for (const san of moves) {
        const move = parseSAN(state, san);
        expect(move).not.toBeNull();
        makeMove(state, move!);
      }

      // After 2 full moves (1. e4 e5 2. Nf3 Nc6), fullMoveNumber should be 3
      expect(state.fullMoveNumber).toBe(3);
      expect(state.sideToMove).toBe(Color.White);
    });
  });

  describe('game with captures', () => {
    it('should correctly handle a sequence with multiple captures', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      // Scandinavian defense with early captures
      const moves = [
        'e4',   // 1. e4
        'd5',   // 1... d5
        'exd5', // 2. exd5
        'Qxd5', // 2... Qxd5
        'Nc3',  // 3. Nc3
        'Qa5',  // 3... Qa5
      ];

      for (const san of moves) {
        const move = parseSAN(state, san);
        expect(move, `Failed to parse ${san}`).not.toBeNull();
        makeMove(state, move!);
      }

      // Game should still be in progress
      expect(getGameResult(state, [])).toBe(GameResult.InProgress);
      expect(state.fullMoveNumber).toBe(4);
    });
  });
});
