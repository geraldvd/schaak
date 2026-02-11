import { describe, it, expect } from 'vitest';
import { parseFEN } from '../../src/engine/board';
import { generateLegalMoves, makeMove, unmakeMove } from '../../src/engine/validation';
import type { BoardState } from '../../src/types';

/**
 * Perft: count the number of leaf nodes at a given depth.
 * This is the gold standard for move generation correctness.
 */
function perft(state: BoardState, depth: number): number {
  if (depth === 0) return 1;

  const moves = generateLegalMoves(state);
  if (depth === 1) return moves.length; // leaf node optimization

  let nodes = 0;
  for (const move of moves) {
    const undo = makeMove(state, move);
    nodes += perft(state, depth - 1);
    unmakeMove(state, move, undo);
  }
  return nodes;
}

describe('perft - move generation correctness', () => {
  // Position 1: Starting position
  it('starting position depth 1 = 20', () => {
    const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(perft(state, 1)).toBe(20);
  });

  it('starting position depth 2 = 400', () => {
    const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(perft(state, 2)).toBe(400);
  });

  it('starting position depth 3 = 8902', () => {
    const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(perft(state, 3)).toBe(8902);
  });

  it('starting position depth 4 = 197281', () => {
    const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(perft(state, 4)).toBe(197281);
  }, 30000);

  // Position 2: Kiwipete (tests many special moves)
  it('kiwipete depth 1 = 48', () => {
    const state = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(state, 1)).toBe(48);
  });

  it('kiwipete depth 2 = 2039', () => {
    const state = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(state, 2)).toBe(2039);
  });

  it('kiwipete depth 3 = 97862', () => {
    const state = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(state, 3)).toBe(97862);
  }, 30000);

  // Position 3: En passant edge cases
  it('position 3 depth 1 = 14', () => {
    const state = parseFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(perft(state, 1)).toBe(14);
  });

  it('position 3 depth 2 = 191', () => {
    const state = parseFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(perft(state, 2)).toBe(191);
  });

  it('position 3 depth 3 = 2812', () => {
    const state = parseFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(perft(state, 3)).toBe(2812);
  });

  it('position 3 depth 4 = 43238', () => {
    const state = parseFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(perft(state, 4)).toBe(43238);
  }, 30000);

  // Position 4: Promotion-heavy
  it('position 4 depth 1 = 6', () => {
    const state = parseFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(perft(state, 1)).toBe(6);
  });

  it('position 4 depth 2 = 264', () => {
    const state = parseFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(perft(state, 2)).toBe(264);
  });

  it('position 4 depth 3 = 9467', () => {
    const state = parseFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(perft(state, 3)).toBe(9467);
  });

  it('position 4 depth 4 = 422333', () => {
    const state = parseFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(perft(state, 4)).toBe(422333);
  }, 60000);

  // Position 5: Complex position
  it('position 5 depth 1 = 44', () => {
    const state = parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect(perft(state, 1)).toBe(44);
  });

  it('position 5 depth 2 = 1486', () => {
    const state = parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect(perft(state, 2)).toBe(1486);
  });

  it('position 5 depth 3 = 62379', () => {
    const state = parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect(perft(state, 3)).toBe(62379);
  });

  it('position 5 depth 4 = 2103487', () => {
    const state = parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect(perft(state, 4)).toBe(2103487);
  }, 120000);
});
