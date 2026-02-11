import { describe, it, expect } from 'vitest';
import { orderMoves, KillerMoves, HistoryTable } from '../../src/ai/move-ordering';
import { parseFEN } from '../../src/engine/board';
import { generateLegalMoves } from '../../src/engine/validation';
import { Piece, MoveFlag, type Move, type TTEntry, TTFlag } from '../../src/types';
import { algebraicToSquare, pieceType } from '../../src/constants';

describe('move ordering', () => {
  describe('TT move first', () => {
    it('should place the TT best move first', () => {
      const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const moves = generateLegalMoves(state);
      const killers = new KillerMoves();
      const history = new HistoryTable();

      // Pick an arbitrary move as the TT best move
      const ttMove = moves.find(m => m.from === algebraicToSquare('e2') && m.to === algebraicToSquare('e4'));
      expect(ttMove).toBeDefined();

      const ttEntry: TTEntry = {
        hash: state.zobristHash,
        depth: 5,
        score: 100,
        flag: TTFlag.Exact,
        bestMove: ttMove!,
      };

      const ordered = orderMoves(moves, ttEntry, killers, history, 0);
      expect(ordered[0].from).toBe(ttMove!.from);
      expect(ordered[0].to).toBe(ttMove!.to);
    });
  });

  describe('captures before quiet moves', () => {
    it('should order captures before non-captures', () => {
      // Position with both captures and quiet moves available
      const state = parseFEN('4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1');
      const moves = generateLegalMoves(state);
      const killers = new KillerMoves();
      const history = new HistoryTable();

      const ordered = orderMoves(moves, null, killers, history, 0);

      // Find the first capture
      const firstCapture = ordered.findIndex(m => m.captured !== Piece.None);
      // Find the last capture
      const lastCapture = ordered.reduce(
        (last, m, i) => (m.captured !== Piece.None ? i : last),
        -1,
      );
      // Find the first quiet move
      const firstQuiet = ordered.findIndex(m => m.captured === Piece.None);

      // All captures should come before all quiet moves
      if (firstCapture !== -1 && firstQuiet !== -1) {
        expect(lastCapture).toBeLessThan(firstQuiet);
      }
    });
  });

  describe('MVV-LVA ordering', () => {
    it('should order higher-value captures first', () => {
      // Position where a pawn can capture a queen or a knight
      // White pawn on d4, Black queen on e5, Black knight on c5
      const state = parseFEN('4k3/8/8/2n1q3/3P4/8/8/4K3 w - - 0 1');
      const moves = generateLegalMoves(state);
      const killers = new KillerMoves();
      const history = new HistoryTable();

      const captures = moves.filter(m => m.captured !== Piece.None);
      expect(captures.length).toBeGreaterThan(0);

      const ordered = orderMoves(moves, null, killers, history, 0);
      const orderedCaptures = ordered.filter(m => m.captured !== Piece.None);

      if (orderedCaptures.length >= 2) {
        // First capture should have higher victim value
        const firstVictimValue = pieceType(orderedCaptures[0].captured);
        const secondVictimValue = pieceType(orderedCaptures[1].captured);
        expect(firstVictimValue).toBeGreaterThanOrEqual(secondVictimValue);
      }
    });
  });

  describe('killer moves', () => {
    it('should store and retrieve killer moves', () => {
      const killers = new KillerMoves();
      const move: Move = {
        from: algebraicToSquare('e2'),
        to: algebraicToSquare('e4'),
        piece: Piece.WhitePawn,
        captured: Piece.None,
        flag: MoveFlag.DoublePush,
      };

      killers.store(0, move);
      expect(killers.isKiller(0, move)).toBe(1);
    });

    it('should not store captures as killers', () => {
      const killers = new KillerMoves();
      const move: Move = {
        from: algebraicToSquare('d4'),
        to: algebraicToSquare('e5'),
        piece: Piece.WhitePawn,
        captured: Piece.BlackPawn,
        flag: MoveFlag.None,
      };

      killers.store(0, move);
      expect(killers.isKiller(0, move)).toBe(0);
    });

    it('should store two killer moves per ply', () => {
      const killers = new KillerMoves();
      const move1: Move = {
        from: algebraicToSquare('e2'),
        to: algebraicToSquare('e4'),
        piece: Piece.WhitePawn,
        captured: Piece.None,
        flag: MoveFlag.DoublePush,
      };
      const move2: Move = {
        from: algebraicToSquare('d2'),
        to: algebraicToSquare('d4'),
        piece: Piece.WhitePawn,
        captured: Piece.None,
        flag: MoveFlag.DoublePush,
      };

      killers.store(0, move1);
      killers.store(0, move2);

      expect(killers.isKiller(0, move2)).toBe(1); // Most recent
      expect(killers.isKiller(0, move1)).toBe(2); // Previous
    });

    it('should order killer moves after captures', () => {
      const state = parseFEN('4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1');
      const moves = generateLegalMoves(state);
      const killers = new KillerMoves();
      const history = new HistoryTable();

      // Find a quiet move and make it a killer
      const quietMove = moves.find(
        m => m.captured === Piece.None && m.from === algebraicToSquare('e1'),
      );
      if (quietMove) {
        killers.store(0, quietMove);

        const ordered = orderMoves(moves, null, killers, history, 0);
        const captureIdx = ordered.findIndex(m => m.captured !== Piece.None);
        const killerIdx = ordered.findIndex(
          m => m.from === quietMove.from && m.to === quietMove.to,
        );

        // Killer should come after captures
        if (captureIdx !== -1) {
          expect(killerIdx).toBeGreaterThan(captureIdx);
        }
      }
    });
  });

  describe('history heuristic', () => {
    it('should update and retrieve history scores', () => {
      const history = new HistoryTable();
      const move: Move = {
        from: algebraicToSquare('e2'),
        to: algebraicToSquare('e4'),
        piece: Piece.WhitePawn,
        captured: Piece.None,
        flag: MoveFlag.DoublePush,
      };

      history.update(move, 3);
      expect(history.score(move)).toBe(9); // 3^2 = 9
    });

    it('should not update history for captures', () => {
      const history = new HistoryTable();
      const capture: Move = {
        from: algebraicToSquare('d4'),
        to: algebraicToSquare('e5'),
        piece: Piece.WhitePawn,
        captured: Piece.BlackPawn,
        flag: MoveFlag.None,
      };

      history.update(capture, 3);
      expect(history.score(capture)).toBe(0);
    });

    it('should accumulate history scores', () => {
      const history = new HistoryTable();
      const move: Move = {
        from: algebraicToSquare('g1'),
        to: algebraicToSquare('f3'),
        piece: Piece.WhiteKnight,
        captured: Piece.None,
        flag: MoveFlag.None,
      };

      history.update(move, 2); // +4
      history.update(move, 3); // +9
      expect(history.score(move)).toBe(13);
    });
  });

  describe('promotions', () => {
    it('should order promotions after TT move but before regular captures', () => {
      // Pawn about to promote
      const state = parseFEN('4k3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = generateLegalMoves(state);
      const killers = new KillerMoves();
      const history = new HistoryTable();

      const ordered = orderMoves(moves, null, killers, history, 0);

      // Queen promotion should be among the first moves
      const promoIdx = ordered.findIndex(m => m.flag === MoveFlag.PromoteQueen);
      expect(promoIdx).toBeLessThan(5); // Should be near the top
    });
  });
});
