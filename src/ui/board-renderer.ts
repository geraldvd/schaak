import { type BoardState, type Square88, Piece } from '../types';
import { toSquare88 } from '../constants';
import { createPieceSVG } from './piece-renderer';

export interface BoardRenderer {
  readonly boardEl: HTMLDivElement;
  render(state: BoardState, flipped: boolean): void;
  setSquareClickHandler(handler: (sq: Square88) => void): void;
  highlightSquare(sq: Square88, className: string): void;
  clearHighlights(className: string): void;
  clearAllHighlights(): void;
  getSquareElement(sq: Square88): HTMLDivElement | null;
}

export function createBoardRenderer(): BoardRenderer {
  const boardEl = document.getElementById('board') as HTMLDivElement;
  const squares = new Map<number, HTMLDivElement>();
  let clickHandler: ((sq: Square88) => void) | null = null;
  let currentFlipped = false;

  function buildBoard(flipped: boolean): void {
    boardEl.innerHTML = '';
    squares.clear();
    currentFlipped = flipped;

    for (let visualRow = 0; visualRow < 8; visualRow++) {
      for (let visualCol = 0; visualCol < 8; visualCol++) {
        const rank = flipped ? 7 - visualRow : visualRow;
        const file = flipped ? 7 - visualCol : visualCol;
        const sq = toSquare88(rank, file) as Square88;

        const div = document.createElement('div');
        div.classList.add('square');
        div.classList.add((rank + file) % 2 === 0 ? 'light' : 'dark');
        div.dataset['sq'] = sq.toString();

        // File labels on bottom row
        if (visualRow === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'file-label';
          fileLabel.textContent = String.fromCharCode(97 + file);
          div.appendChild(fileLabel);
        }

        // Rank labels on left column
        if (visualCol === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'rank-label';
          rankLabel.textContent = (8 - rank).toString();
          div.appendChild(rankLabel);
        }

        div.addEventListener('click', () => {
          if (clickHandler) clickHandler(sq);
        });

        squares.set(sq, div);
        boardEl.appendChild(div);
      }
    }
  }

  function render(state: BoardState, flipped: boolean): void {
    if (squares.size === 0 || flipped !== currentFlipped) {
      buildBoard(flipped);
    }

    // Update pieces on each square
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) continue;
      const div = squares.get(sq);
      if (!div) continue;

      // Remove existing piece SVG
      const existing = div.querySelector('.piece');
      if (existing) existing.remove();

      const piece = state.board[sq];
      if (piece !== Piece.None) {
        const pieceSvg = createPieceSVG(piece);
        div.appendChild(pieceSvg);
      }
    }
  }

  function setSquareClickHandler(handler: (sq: Square88) => void): void {
    clickHandler = handler;
  }

  function highlightSquare(sq: Square88, className: string): void {
    const div = squares.get(sq);
    if (div) div.classList.add(className);
  }

  function clearHighlights(className: string): void {
    for (const div of squares.values()) {
      div.classList.remove(className);
    }
  }

  function clearAllHighlights(): void {
    clearHighlights('selected');
    clearHighlights('last-move');
    clearHighlights('check');
  }

  function getSquareElement(sq: Square88): HTMLDivElement | null {
    return squares.get(sq) ?? null;
  }

  return {
    boardEl,
    render,
    setSquareClickHandler,
    highlightSquare,
    clearHighlights,
    clearAllHighlights,
    getSquareElement,
  };
}
