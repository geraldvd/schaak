import { describe, it, expect } from 'vitest';
import { parseFEN } from '../../src/engine/board';
import { makeMove, generateLegalMoves } from '../../src/engine/validation';
import {
  isCheckmate,
  isStalemate,
  isFiftyMoveDraw,
  isInsufficientMaterial,
  isThreefoldRepetition,
  getGameResult,
} from '../../src/engine/game-state';
import { parseSAN } from '../../src/engine/notation';
import { GameResult, Color } from '../../src/types';

describe('game-state', () => {
  describe('isCheckmate', () => {
    it('should detect fool\'s mate', () => {
      // 1. f3 e5 2. g4 Qh4#
      let state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      const moves = ['f3', 'e5', 'g4', 'Qh4'];
      for (const san of moves) {
        const move = parseSAN(state, san);
        expect(move, `Failed to parse SAN: ${san}`).not.toBeNull();
        makeMove(state, move!);
      }

      expect(isCheckmate(state)).toBe(true);
    });

    it('should detect scholar\'s mate', () => {
      // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
      let state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      const moves = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7'];
      for (const san of moves) {
        const move = parseSAN(state, san);
        expect(move, `Failed to parse SAN: ${san}`).not.toBeNull();
        makeMove(state, move!);
      }

      expect(isCheckmate(state)).toBe(true);
    });

    it('should not report checkmate when king is in check but can escape', () => {
      // King in check but has legal moves
      const state = parseFEN('rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2');
      expect(isCheckmate(state)).toBe(false);
    });

    it('should not report checkmate in starting position', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(isCheckmate(state)).toBe(false);
    });
  });

  describe('isStalemate', () => {
    it('should detect stalemate - king trapped with no legal moves', () => {
      // Black king on a8, white queen on b6, white king on c8 - black to move, stalemate
      const state = parseFEN('k7/8/1Q6/8/8/8/8/2K5 b - - 0 1');
      expect(isStalemate(state)).toBe(true);
    });

    it('should not report stalemate when moves are available', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(isStalemate(state)).toBe(false);
    });

    it('should not report stalemate when king is in check with no legal moves (checkmate)', () => {
      // Fool's mate position
      const state = parseFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      expect(isStalemate(state)).toBe(false);
      expect(isCheckmate(state)).toBe(true);
    });
  });

  describe('isFiftyMoveDraw', () => {
    it('should detect fifty-move draw when halfMoveClock >= 100', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4K3 w - - 100 80');
      expect(isFiftyMoveDraw(state)).toBe(true);
    });

    it('should detect fifty-move draw at exactly 100 half-moves', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4K3 w - - 100 51');
      expect(isFiftyMoveDraw(state)).toBe(true);
    });

    it('should not report fifty-move draw when halfMoveClock < 100', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4K3 w - - 99 50');
      expect(isFiftyMoveDraw(state)).toBe(false);
    });

    it('should not report fifty-move draw at start', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(isFiftyMoveDraw(state)).toBe(false);
    });
  });

  describe('isInsufficientMaterial', () => {
    it('should detect K vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4K3 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(true);
    });

    it('should detect K+N vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4KN2 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(true);
    });

    it('should detect K+B vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4KB2 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(true);
    });

    it('should detect K+B vs K+B same color squares', () => {
      // Both bishops on light squares (c1 and f8 are dark, c8 and f1 are light)
      const state = parseFEN('2b5/8/8/8/8/5k2/8/4K1B1 w - - 0 1');
      // c8 = dark square (rank 0 + file 2 = even), g1 = dark square (rank 7 + file 6 = odd... wait)
      // Let me use a clearer position. White bishop on b1 (dark), black bishop on g8 (dark)
      const state2 = parseFEN('6b1/8/8/8/8/5k2/8/1B2K3 w - - 0 1');
      // b1: rank=7, file=1, sum=8 (even). g8: rank=0, file=6, sum=6 (even). Same color.
      expect(isInsufficientMaterial(state2)).toBe(true);
    });

    it('should not detect insufficient material with K+R vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4KR2 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(false);
    });

    it('should not detect insufficient material with K+Q vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4KQ2 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(false);
    });

    it('should not detect insufficient material with pawns on the board', () => {
      const state = parseFEN('8/8/8/8/4P3/5k2/8/4K3 w - - 0 1');
      expect(isInsufficientMaterial(state)).toBe(false);
    });
  });

  describe('isThreefoldRepetition', () => {
    it('should detect threefold repetition', () => {
      const hash = 12345;
      const history = [12345, 99999, 12345, 88888];
      expect(isThreefoldRepetition(history, hash)).toBe(true);
    });

    it('should not detect repetition with fewer than 2 prior occurrences', () => {
      const hash = 12345;
      const history = [12345, 99999, 88888];
      expect(isThreefoldRepetition(history, hash)).toBe(false);
    });

    it('should not detect repetition with no matching hashes', () => {
      const hash = 12345;
      const history = [11111, 22222, 33333];
      expect(isThreefoldRepetition(history, hash)).toBe(false);
    });
  });

  describe('getGameResult', () => {
    it('should return InProgress for starting position', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(getGameResult(state, [])).toBe(GameResult.InProgress);
    });

    it('should return BlackWins for fool\'s mate', () => {
      let state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const moves = ['f3', 'e5', 'g4', 'Qh4'];
      for (const san of moves) {
        const move = parseSAN(state, san);
        expect(move).not.toBeNull();
        makeMove(state, move!);
      }
      expect(getGameResult(state, [])).toBe(GameResult.BlackWins);
    });

    it('should return DrawStalemate for stalemate position', () => {
      const state = parseFEN('k7/8/1Q6/8/8/8/8/2K5 b - - 0 1');
      expect(getGameResult(state, [])).toBe(GameResult.DrawStalemate);
    });

    it('should return DrawFiftyMove for 50-move draw', () => {
      // Use K+R vs K+R so insufficient material doesn't trigger first
      const state = parseFEN('4k2r/8/8/8/8/8/8/4K2R w Kk - 100 80');
      expect(getGameResult(state, [])).toBe(GameResult.DrawFiftyMove);
    });

    it('should return DrawInsufficientMaterial for K vs K', () => {
      const state = parseFEN('8/8/8/8/8/5k2/8/4K3 w - - 0 1');
      expect(getGameResult(state, [])).toBe(GameResult.DrawInsufficientMaterial);
    });
  });
});
