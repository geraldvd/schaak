import { type Move, type BoardState, MoveFlag } from '../types';
import { algebraicToSquare } from '../constants';
import { parseFEN } from '../engine/board';

/**
 * Simple opening book: map from Zobrist hash to array of candidate moves.
 * Each entry has a move (from/to in algebraic) and a weight for random selection.
 */
interface BookEntry {
  from: string;
  to: string;
  flag?: MoveFlag;
  weight: number;
}

interface BookPosition {
  fen: string;
  moves: BookEntry[];
}

// Opening book positions covering major openings
const BOOK_DATA: BookPosition[] = [
  // Starting position
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [
      { from: 'e2', to: 'e4', weight: 30 },
      { from: 'd2', to: 'd4', weight: 30 },
      { from: 'c2', to: 'c4', weight: 15 },
      { from: 'g1', to: 'f3', weight: 15 },
    ],
  },
  // 1.e4
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    moves: [
      { from: 'e7', to: 'e5', weight: 25 },
      { from: 'c7', to: 'c5', weight: 25 },  // Sicilian
      { from: 'e7', to: 'e6', weight: 15 },  // French
      { from: 'c7', to: 'c6', weight: 10 },  // Caro-Kann
      { from: 'd7', to: 'd5', weight: 10 },  // Scandinavian
    ],
  },
  // 1.e4 e5
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      { from: 'g1', to: 'f3', weight: 40 },
      { from: 'f1', to: 'c4', weight: 15 },
      { from: 'f2', to: 'f4', weight: 10 }, // King's Gambit
    ],
  },
  // 1.e4 e5 2.Nf3
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    moves: [
      { from: 'b8', to: 'c6', weight: 40 },
      { from: 'g8', to: 'f6', weight: 20 }, // Petrov
      { from: 'd7', to: 'd6', weight: 10 }, // Philidor
    ],
  },
  // 1.e4 e5 2.Nf3 Nc6 (main line)
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    moves: [
      { from: 'f1', to: 'b5', weight: 30 }, // Ruy Lopez
      { from: 'f1', to: 'c4', weight: 25 }, // Italian
      { from: 'd2', to: 'd4', weight: 15 }, // Scotch
    ],
  },
  // Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moves: [
      { from: 'a7', to: 'a6', weight: 35 },  // Morphy Defense
      { from: 'g8', to: 'f6', weight: 20 },  // Berlin
      { from: 'f7', to: 'f5', weight: 10 },  // Schliemann
    ],
  },
  // Italian: 1.e4 e5 2.Nf3 Nc6 3.Bc4
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moves: [
      { from: 'f8', to: 'c5', weight: 30 }, // Giuoco Piano
      { from: 'g8', to: 'f6', weight: 30 }, // Two Knights
    ],
  },
  // 1.d4
  {
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
    moves: [
      { from: 'd7', to: 'd5', weight: 30 },
      { from: 'g8', to: 'f6', weight: 30 },
      { from: 'e7', to: 'e6', weight: 10 },
    ],
  },
  // 1.d4 d5
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      { from: 'c2', to: 'c4', weight: 40 }, // Queen's Gambit
      { from: 'g1', to: 'f3', weight: 20 },
      { from: 'c1', to: 'f4', weight: 10 }, // London
    ],
  },
  // Queen's Gambit: 1.d4 d5 2.c4
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    moves: [
      { from: 'e7', to: 'e6', weight: 30 }, // QGD
      { from: 'd5', to: 'c4', weight: 25 }, // QGA
      { from: 'c7', to: 'c6', weight: 20 }, // Slav
    ],
  },
  // 1.d4 Nf6
  {
    fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
    moves: [
      { from: 'c2', to: 'c4', weight: 35 },
      { from: 'g1', to: 'f3', weight: 20 },
      { from: 'c1', to: 'f4', weight: 15 },
    ],
  },
  // 1.d4 Nf6 2.c4
  {
    fen: 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    moves: [
      { from: 'e7', to: 'e6', weight: 25 },
      { from: 'g7', to: 'g6', weight: 25 }, // King's Indian
      { from: 'c7', to: 'c5', weight: 15 }, // Benoni
      { from: 'e7', to: 'e5', weight: 10 }, // Budapest
    ],
  },
  // 1.c4 (English)
  {
    fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
    moves: [
      { from: 'e7', to: 'e5', weight: 25 },
      { from: 'g8', to: 'f6', weight: 25 },
      { from: 'c7', to: 'c5', weight: 20 },
    ],
  },
  // 1.Nf3
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
    moves: [
      { from: 'd7', to: 'd5', weight: 30 },
      { from: 'g8', to: 'f6', weight: 30 },
      { from: 'c7', to: 'c5', weight: 15 },
    ],
  },
  // Sicilian: 1.e4 c5
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      { from: 'g1', to: 'f3', weight: 40 },
      { from: 'b1', to: 'c3', weight: 15 }, // Closed Sicilian
      { from: 'c2', to: 'c3', weight: 10 }, // Alapin
    ],
  },
  // Sicilian Open: 1.e4 c5 2.Nf3
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    moves: [
      { from: 'd7', to: 'd6', weight: 30 },
      { from: 'b8', to: 'c6', weight: 25 },
      { from: 'e7', to: 'e6', weight: 20 },
    ],
  },
  // Sicilian Najdorf setup: 1.e4 c5 2.Nf3 d6
  {
    fen: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    moves: [
      { from: 'd2', to: 'd4', weight: 45 },
      { from: 'f1', to: 'b5', weight: 10 },
    ],
  },
  // French: 1.e4 e6
  {
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      { from: 'd2', to: 'd4', weight: 40 },
      { from: 'd2', to: 'd3', weight: 10 },
    ],
  },
  // French: 1.e4 e6 2.d4
  {
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
    moves: [
      { from: 'd7', to: 'd5', weight: 45 },
    ],
  },
  // Caro-Kann: 1.e4 c6
  {
    fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      { from: 'd2', to: 'd4', weight: 40 },
      { from: 'b1', to: 'c3', weight: 15 },
    ],
  },
  // Caro-Kann: 1.e4 c6 2.d4
  {
    fen: 'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
    moves: [
      { from: 'd7', to: 'd5', weight: 45 },
    ],
  },
  // London System: 1.d4 d5 2.Bf4
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2',
    moves: [
      { from: 'g8', to: 'f6', weight: 30 },
      { from: 'c7', to: 'c5', weight: 20 },
      { from: 'e7', to: 'e6', weight: 20 },
    ],
  },
  // King's Indian: 1.d4 Nf6 2.c4 g6
  {
    fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    moves: [
      { from: 'b1', to: 'c3', weight: 35 },
      { from: 'g1', to: 'f3', weight: 25 },
    ],
  },
  // QGD: 1.d4 d5 2.c4 e6
  {
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    moves: [
      { from: 'b1', to: 'c3', weight: 30 },
      { from: 'g1', to: 'f3', weight: 25 },
      { from: 'c4', to: 'd5', weight: 10 }, // Exchange
    ],
  },
  // Slav: 1.d4 d5 2.c4 c6
  {
    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    moves: [
      { from: 'g1', to: 'f3', weight: 35 },
      { from: 'b1', to: 'c3', weight: 25 },
    ],
  },
  // Scotch: 1.e4 e5 2.Nf3 Nc6 3.d4
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
    moves: [
      { from: 'e5', to: 'd4', weight: 40 },
    ],
  },
  // Petrov: 1.e4 e5 2.Nf3 Nf6
  {
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    moves: [
      { from: 'f3', to: 'e5', weight: 35 },
      { from: 'd2', to: 'd4', weight: 20 },
    ],
  },
];

// Build the book: hash -> BookEntry[]
const bookMap = new Map<number, BookEntry[]>();

for (const pos of BOOK_DATA) {
  const state = parseFEN(pos.fen);
  const hash = state.zobristHash;
  bookMap.set(hash, pos.moves);
}

function findMoveInLegal(
  legalMoves: Move[],
  from: string,
  to: string,
  flag?: MoveFlag,
): Move | null {
  const fromSq = algebraicToSquare(from);
  const toSq = algebraicToSquare(to);

  for (const move of legalMoves) {
    if (move.from === fromSq && move.to === toSq) {
      if (flag !== undefined && move.flag !== flag) continue;
      return move;
    }
  }
  return null;
}

/**
 * Look up an opening book move for the given position.
 * Returns a Move if found, or null if position is not in the book.
 */
export function getBookMove(state: BoardState, legalMoves: Move[]): Move | null {
  const entries = bookMap.get(state.zobristHash);
  if (!entries || entries.length === 0) return null;

  // Weighted random selection
  let totalWeight = 0;
  for (const entry of entries) {
    totalWeight += entry.weight;
  }

  let rand = Math.random() * totalWeight;
  for (const entry of entries) {
    rand -= entry.weight;
    if (rand <= 0) {
      const move = findMoveInLegal(legalMoves, entry.from, entry.to, entry.flag);
      if (move) return move;
      break;
    }
  }

  // Fallback: try first entry
  for (const entry of entries) {
    const move = findMoveInLegal(legalMoves, entry.from, entry.to, entry.flag);
    if (move) return move;
  }

  return null;
}
