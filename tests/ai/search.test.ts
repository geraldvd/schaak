import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../../src/ai/search';
import { parseFEN } from '../../src/engine/board';
import { algebraicToSquare } from '../../src/constants';
import { MoveFlag, type Move } from '../../src/types';

function moveToAlgebraic(move: Move): string {
  const files = 'abcdefgh';
  const fromFile = files[move.from & 7];
  const fromRank = (8 - (move.from >> 4)).toString();
  const toFile = files[move.to & 7];
  const toRank = (8 - (move.to >> 4)).toString();
  return `${fromFile}${fromRank}${toFile}${toRank}`;
}

describe('search', () => {
  describe('mate in 1', () => {
    it('should find back rank mate', () => {
      // White to move: Rook on a1, Black king on h8 with pawns f7,g7,h7
      // Ra8# is mate (back rank, king blocked by own pawns)
      const state = parseFEN('7k/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 3, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Ra8# is the mating move
      expect(result.bestMove!.to).toBe(algebraicToSquare('a8'));
      expect(result.score).toBeGreaterThan(800000); // Mate score
    });

    it('should find queen mate in 1', () => {
      // White Qh6, Kg1. Black Kg8, Rf8, pawns f7, g7, h7.
      // Qxg7# is checkmate (queen captures g7, covers f8,h8,f7,h7,g8).
      // Bishop on d4 protects g7 so Kxg7 is illegal after Qxg7
      const state = parseFEN('5rk1/5ppp/7Q/8/3B4/8/8/6K1 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 3, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Should find a mating move with a mate score
      expect(result.score).toBeGreaterThan(800000);
    });
  });

  describe('mate in 2', () => {
    it('should find winning continuation', () => {
      // White queen and king vs black king with pawns - strong advantage
      const state = parseFEN('5rk1/5ppp/8/8/8/8/1Q6/4K3 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 5, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Should find a strong move (winning material or threatening mate)
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('tactical puzzles', () => {
    it('should find a winning queen capture', () => {
      // White knight on f3 can capture black queen on d4
      const state = parseFEN('4k3/8/8/8/3q4/5N2/8/4K3 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 4, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Nxd4 captures the queen
      expect(result.bestMove!.to).toBe(algebraicToSquare('d4'));
      expect(result.score).toBeGreaterThan(250);
    });

    it('should capture a hanging piece', () => {
      // Black rook is hanging on a5
      const state = parseFEN('4k3/8/8/r7/8/8/8/R3K3 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 3, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Rxa5 captures the rook
      expect(result.bestMove!.to).toBe(algebraicToSquare('a5'));
    });

    it('should avoid losing material', () => {
      // White should not move bishop into a pawn capture
      const state = parseFEN('4k3/pp6/8/8/8/8/PP6/B3K3 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 4, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // The bishop should not move to b7 or anywhere it gets captured
      expect(result.score).toBeGreaterThanOrEqual(-50); // Should not lose material
    });
  });

  describe('avoids stalemate when winning', () => {
    it('should not stalemate the opponent when winning', () => {
      // White is up a queen, should not stalemate
      const state = parseFEN('k7/8/1K6/8/8/8/8/Q7 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 4, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Score should remain very positive (winning)
      expect(result.score).toBeGreaterThan(500);
    });
  });

  describe('search properties', () => {
    it('should return a legal move from the starting position', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 3, useBook: false });

      expect(result.bestMove).not.toBeNull();
      expect(result.nodesSearched).toBeGreaterThan(0);
    });

    it('should search deeper with higher depth', () => {
      const state = parseFEN('r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2');
      const engine = new SearchEngine();

      const shallow = engine.search(state, { maxDepth: 2, useBook: false });
      engine.reset();
      const deep = engine.search(state, { maxDepth: 4, useBook: false });

      expect(deep.nodesSearched).toBeGreaterThan(shallow.nodesSearched);
    });

    it('should return immediately with only one legal move', () => {
      // King on h1, black queen on g3 gives check. Only legal move is Kh1-g1... no.
      // Better: white king on a1, black queen on b3 (checks on diagonal). Only Kb1 or Ka2.
      // Simpler: position where only 1 legal move exists
      // King on h1 in check from Rh8: must block or move. Kg2 only escape.
      // Actually: Kh1, black Rg2 (not check), black Rh3 (not check).
      // Let's use: white Kg1, black Qa7 - only escape from check?
      // Simplest: White King on a1, black queen on c2, black king on c4
      // Queen on c2 attacks a2, b1, b2 - king can only go to b1? c2 attacks b1 diag? No, c2->b1 is diagonal. So a1 king with Qc2: attacks b1(diagonal), a2(file). So no moves. Is king in check? c2 to a1? No diagonal or line. Not in check. That's stalemate.
      // Let me use a forced recapture: white king h1, black Rook h2 giving check. King must go to g1.
      const state = parseFEN('4k3/8/8/8/8/8/7r/6BK w - - 0 1');
      // King on h1, bishop on g1, black rook on h2 gives check on the h-file
      // Wait, Rh2 checks h1? Yes, rook on h2 attacks h1 along h-file.
      // King must move. g1 is blocked by own bishop. Only legal: capture not possible. Actually no legal moves here.
      // Let me try: Kh1, Rh3 (checks h-file? No, h3 to h1 blocked by nothing - yes it checks!)
      // Kh1, Black Rh3. King can go to g1 or g2. Two moves.
      // Need exactly 1 legal move: Kh1, black Qg3 (checks? g3 to h1? No.)
      // Let me just use a simpler approach: king forced to one square.
      // White: Kh1, Pawn g2, Pawn h2. Black: Qf1 gives check. Only move Kh2? No, h2 pawn blocks. Only Qf1 checks h1? f1 to h1 is along rank 1. So Qf1+ and king on h1, pawns g2/h2. Kh1 can't go to g1 (Qf1 attacks). Can't go to g2/h2 (own pawns). No legal moves - it's checkmate.
      // OK let me just use a real position where there's exactly one legal move:
      // Kh8, pawn g7. Black queen on f6. Kg8 is the only move (g7 blocked, h7 attacked by Qf6? f6 attacks h8 diag? No. f6 to h8 = going +2 right, -2 up, that's diagonal, yes! So Qf6 does check h8? Let me verify: f6 is file 5, rank 2 (0x88: 0x25). h8 is file 7, rank 0 (0x07). Direction: +1 file, -1 rank per step = NE direction. f6->g7->h8. So yes, Qf6 attacks h8 diagonally through g7. But g7 has a pawn blocking. So Qf6 does NOT attack h8 (blocked by g7 pawn). So king not in check.
      // This is getting complicated. Let me pick a known position.
      // Simplest: king in corner, single escape.
      // White: Ka1. Black: Kb3, Rc2. King on a1 can only go to b1 (a2 attacked by Rc2 + Kb3, b2 attacked by Kb3). b1: attacked by Rc2? No (c2 is on c-file, rank 2). Attacked by Kb3? b3 to b1 is 2 squares - king can only move 1. So Kb1 is legal. Any others? a2: attacked by Rc2 (rank 2, a2 on rank 2? No, a2 is rank 6 in 0x88). Wait I'm confusing 0x88 and normal chess coords. Let me think in normal chess: a1 is bottom-left.
      // Ka1. Black Kb3 controls a2, b2, c2, a4, b4, c4, c3, a3. Rc1 controls c-file + rank 1.
      // Actually let me just use: White Ka1, Black Kb3 (controls a2,a3,a4,b2,b4,c2,c3,c4), Black Qd1 (controls rank 1: a1 is attacked! So king is in check from Qd1 along rank 1). King must move. a2 attacked by Kb3. b1 attacked by Qd1 (rank 1). b2 attacked by Kb3. So no legal moves - checkmate.
      // I'll just use a pin/discovered check situation. Actually let me just use a position I'm sure has exactly 1 legal move.
      // Simpler approach: White Kf1, White Rf2. Black Qe3. Not in check. Rf2 is pinned (if Qe3 could reach f1 through f2). Qe3 to f2 to f1: e3->f2 is diagonal, f2->f1 is along f-file. Not a pin since two different directions.
      // I'll use the simplest possible: only one piece that can move.
      // White: only King. Black: King + Bishop controlling all but one square.
      // Actually just test a known forced-single-move position:
      // FEN where white has K+R and there's only one non-losing move due to threat. That's too complex.
      // Simple: Bare king with only one escape square.
      // Ka1, Black Kb3 (controls a2, b2), Black Rc8 (controls c-file). Not in check.
      // Moves: Ka1->a2(Kb3 attacks), Ka1->b1(free!), Ka1->b2(Kb3 attacks).
      // Only b1! Perfect.
      const state2 = parseFEN('2r1k3/8/8/8/8/1k6/8/K7 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state2, { maxDepth: 5, useBook: false });

      expect(result.bestMove).not.toBeNull();
      expect(result.bestMove!.to).toBe(algebraicToSquare('b1'));
      expect(result.nodesSearched).toBeLessThanOrEqual(1);
    });

    it('should detect checkmate and return null move', () => {
      // White king h1, black queen g2 checks h1 diagonally, black bishop f3 protects g2
      // Kh1 can't go: g1 (Qg2 via g-file), h2 (Qg2 via rank), Kxg2 (Bf3 protects).
      // This is checkmate.
      const mateState = parseFEN('4k3/8/8/8/8/5b2/6q1/7K w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(mateState, { maxDepth: 3, useBook: false });

      expect(result.bestMove).toBeNull();
    });
  });

  describe('promotion', () => {
    it('should promote pawn when advantageous', () => {
      // White pawn on e7 about to promote, black king far away on a8
      const state = parseFEN('k7/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const engine = new SearchEngine();
      const result = engine.search(state, { maxDepth: 3, useBook: false });

      expect(result.bestMove).not.toBeNull();
      // Should be a promotion move (queen promotion is best)
      const flag = result.bestMove!.flag;
      expect(flag).toBeGreaterThanOrEqual(MoveFlag.PromoteKnight);
      expect(flag).toBeLessThanOrEqual(MoveFlag.PromoteQueen);
    });
  });
});
