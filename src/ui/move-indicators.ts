import { type Move, Piece } from '../types';
import type { BoardRenderer } from './board-renderer';

/**
 * Show legal move indicators on the board.
 * - Empty target squares: small dot in center
 * - Capture target squares: ring around the edge
 */
export function showMoveIndicators(renderer: BoardRenderer, moves: Move[]): void {
  clearMoveIndicators(renderer);

  for (const move of moves) {
    const squareEl = renderer.getSquareElement(move.to);
    if (!squareEl) continue;

    if (move.captured !== Piece.None) {
      const ring = document.createElement('div');
      ring.className = 'capture-ring';
      squareEl.appendChild(ring);
    } else {
      const dot = document.createElement('div');
      dot.className = 'move-dot';
      squareEl.appendChild(dot);
    }
  }
}

/**
 * Remove all move indicator elements from the board.
 */
export function clearMoveIndicators(renderer: BoardRenderer): void {
  const board = renderer.boardEl;
  for (const el of board.querySelectorAll('.move-dot, .capture-ring')) {
    el.remove();
  }
}
