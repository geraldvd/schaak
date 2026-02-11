import { describe, it, expect } from 'vitest';
import { evaluate, computeGamePhase } from '../../src/ai/evaluation';
import { parseFEN } from '../../src/engine/board';
import { Color } from '../../src/types';

describe('evaluation', () => {
  describe('symmetry', () => {
    it('should evaluate the starting position as roughly equal', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const score = evaluate(state);
      // Starting position should be close to 0 (slight advantage for white due to tempo)
      expect(Math.abs(score)).toBeLessThan(50);
    });

    it('should give symmetric evaluation for mirrored positions', () => {
      // White to move
      const whiteState = parseFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      const whiteScore = evaluate(whiteState);

      // Same position but mirrored - black to move with mirrored pieces
      const blackState = parseFEN('rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const blackScore = evaluate(blackState);

      // Scores should be approximately negatives of each other
      // Allow some tolerance for asymmetric terms
      expect(Math.abs(whiteScore + blackScore)).toBeLessThan(150);
    });

    it('should evaluate an empty board with only kings as roughly 0', () => {
      const state = parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      const score = evaluate(state);
      expect(Math.abs(score)).toBeLessThan(100);
    });
  });

  describe('material advantage', () => {
    it('should favor the side with a material advantage', () => {
      // White has an extra queen
      const state = parseFEN('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
      const score = evaluate(state);
      expect(score).toBeGreaterThan(800); // Queen is ~900cp
    });

    it('should prefer having a queen over a rook', () => {
      const queenState = parseFEN('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
      const rookState = parseFEN('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
      const queenScore = evaluate(queenState);
      const rookScore = evaluate(rookState);
      expect(queenScore).toBeGreaterThan(rookScore);
    });

    it('should prefer having two rooks over one queen', () => {
      const twoRooks = parseFEN('4k3/8/8/8/8/8/8/RR2K3 w - - 0 1');
      const oneQueen = parseFEN('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
      const twoRooksScore = evaluate(twoRooks);
      const oneQueenScore = evaluate(oneQueen);
      expect(twoRooksScore).toBeGreaterThan(oneQueenScore);
    });

    it('should prefer bishop over knight (slightly)', () => {
      const bishopState = parseFEN('4k3/8/8/8/8/8/8/B3K3 w - - 0 1');
      const knightState = parseFEN('4k3/8/8/8/8/8/8/N3K3 w - - 0 1');
      const bishopScore = evaluate(bishopState);
      const knightScore = evaluate(knightState);
      expect(bishopScore).toBeGreaterThanOrEqual(knightScore);
    });

    it('should evaluate black material advantage as negative from white perspective', () => {
      // Black has an extra queen, it's white to move
      const state = parseFEN('q3k3/8/8/8/8/8/8/4K3 w - - 0 1');
      const score = evaluate(state);
      expect(score).toBeLessThan(-800);
    });
  });

  describe('bishop pair', () => {
    it('should give bonus for bishop pair', () => {
      const pairState = parseFEN('4k3/8/8/8/8/8/8/BB2K3 w - - 0 1');
      const singleState = parseFEN('4k3/8/8/8/8/8/8/B3K3 w - - 0 1');
      const pairScore = evaluate(pairState);
      const singleScore = evaluate(singleState);
      // Bishop pair should be worth more than sum of material
      const diff = pairScore - singleScore;
      // Should be at least the bishop value + bonus
      expect(diff).toBeGreaterThan(300); // ~330 (bishop) + 50 (pair bonus)
    });
  });

  describe('pawn structure', () => {
    it('should penalize doubled pawns', () => {
      const doubledState = parseFEN('4k3/8/8/8/8/4P3/4P3/4K3 w - - 0 1');
      const normalState = parseFEN('4k3/8/8/8/8/8/3PP3/4K3 w - - 0 1');
      const doubledScore = evaluate(doubledState);
      const normalScore = evaluate(normalState);
      expect(normalScore).toBeGreaterThan(doubledScore);
    });

    it('should penalize isolated pawns', () => {
      const isolatedState = parseFEN('4k3/8/8/8/8/8/1P1P4/4K3 w - - 0 1');
      const connectedState = parseFEN('4k3/8/8/8/8/8/PP6/4K3 w - - 0 1');
      const isolatedScore = evaluate(isolatedState);
      const connectedScore = evaluate(connectedState);
      expect(connectedScore).toBeGreaterThan(isolatedScore);
    });

    it('should reward passed pawns', () => {
      // White pawn on e5 with no black pawns to stop it
      const passedState = parseFEN('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1');
      // White pawn on e2 blocked by black pawn on e4
      const blockedState = parseFEN('4k3/8/8/8/4p3/8/4P3/4K3 w - - 0 1');
      const passedScore = evaluate(passedState);
      const blockedScore = evaluate(blockedState);
      expect(passedScore).toBeGreaterThan(blockedScore);
    });
  });

  describe('game phase', () => {
    it('should return full phase for starting position', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const phase = computeGamePhase(state);
      expect(phase).toBe(24); // Full material
    });

    it('should return low phase for endgame position', () => {
      const state = parseFEN('4k3/4p3/8/8/8/8/4P3/4K3 w - - 0 1');
      const phase = computeGamePhase(state);
      expect(phase).toBe(0); // Only pawns and kings
    });

    it('should return intermediate phase for middlegame', () => {
      const state = parseFEN('r1bqk2r/pppppppp/8/8/8/8/PPPPPPPP/R1BQK2R w KQkq - 0 1');
      const phase = computeGamePhase(state);
      expect(phase).toBeGreaterThan(0);
      expect(phase).toBeLessThan(24);
    });
  });
});
