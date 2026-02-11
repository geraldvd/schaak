import { type Move, type TTEntry, TTFlag } from '../types';

const DEFAULT_SIZE = 1 << 20; // ~1M entries

export class TranspositionTable {
  private entries: (TTEntry | null)[];
  private mask: number;

  constructor(size: number = DEFAULT_SIZE) {
    // Round to power of 2
    let s = 1;
    while (s < size) s <<= 1;
    this.entries = new Array(s).fill(null);
    this.mask = s - 1;
  }

  private index(hash: number): number {
    return (hash >>> 0) & this.mask;
  }

  /**
   * Probe the table for an entry matching the given hash.
   */
  probe(hash: number): TTEntry | null {
    const entry = this.entries[this.index(hash)];
    if (entry !== null && entry.hash === hash) {
      return entry;
    }
    return null;
  }

  /**
   * Store an entry. Uses depth-preferred replacement:
   * replace only if new entry has >= depth than existing.
   */
  store(hash: number, depth: number, score: number, flag: TTFlag, bestMove: Move | null): void {
    const idx = this.index(hash);
    const existing = this.entries[idx];

    // Depth-preferred replacement
    if (existing === null || existing.hash === hash || depth >= existing.depth) {
      this.entries[idx] = { hash, depth, score, flag, bestMove };
    }
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.fill(null);
  }
}
