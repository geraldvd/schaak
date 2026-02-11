import { Color, Piece, PieceType, GameResult } from '../types';
import { pieceType, PIECE_VALUES } from '../constants';
import { createCapturedPieceSVG } from './piece-renderer';

export interface GameInfo {
  addMove(moveNumber: number, color: Color, san: string): void;
  clearMoves(): void;
  setStatus(text: string): void;
  updateCapturedPieces(capturedByWhite: Piece[], capturedByBlack: Piece[]): void;
  highlightCurrentMove(moveIndex: number): void;
  popMove(): void;
}

// Sort captured pieces for display: Q, R, B, N, P
const PIECE_ORDER: Record<number, number> = {
  [PieceType.Queen]: 0,
  [PieceType.Rook]: 1,
  [PieceType.Bishop]: 2,
  [PieceType.Knight]: 3,
  [PieceType.Pawn]: 4,
};

function sortCaptured(pieces: Piece[]): Piece[] {
  return [...pieces].sort((a, b) => {
    const orderA = PIECE_ORDER[pieceType(a)] ?? 5;
    const orderB = PIECE_ORDER[pieceType(b)] ?? 5;
    return orderA - orderB;
  });
}

export function createGameInfo(): GameInfo {
  const statusEl = document.getElementById('game-status')!;
  const capturedBlackEl = document.getElementById('captured-black')!;
  const capturedWhiteEl = document.getElementById('captured-white')!;
  const historyEl = document.getElementById('move-history')!;

  // Initialize history
  historyEl.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'history-header';
  header.textContent = 'Moves';
  historyEl.appendChild(header);

  const movesList = document.createElement('div');
  movesList.id = 'moves-list';
  historyEl.appendChild(movesList);

  let moveElements: HTMLSpanElement[] = [];

  function addMove(moveNumber: number, color: Color, san: string): void {
    let row: HTMLDivElement;

    if (color === Color.White) {
      // Create a new row for white's move
      row = document.createElement('div');
      row.className = 'move-row';

      const numEl = document.createElement('span');
      numEl.className = 'move-number';
      numEl.textContent = `${moveNumber}.`;
      row.appendChild(numEl);

      const sanEl = document.createElement('span');
      sanEl.className = 'move-san white-move';
      sanEl.textContent = san;
      row.appendChild(sanEl);

      moveElements.push(sanEl);
      movesList.appendChild(row);
    } else {
      // Add black's move to the last row
      row = movesList.lastElementChild as HTMLDivElement;
      if (!row || !row.classList.contains('move-row')) {
        // Edge case: black moves first (shouldn't happen normally)
        row = document.createElement('div');
        row.className = 'move-row';

        const numEl = document.createElement('span');
        numEl.className = 'move-number';
        numEl.textContent = `${moveNumber}.`;
        row.appendChild(numEl);

        const placeholder = document.createElement('span');
        placeholder.className = 'move-san white-move';
        placeholder.textContent = '...';
        row.appendChild(placeholder);

        movesList.appendChild(row);
      }

      const sanEl = document.createElement('span');
      sanEl.className = 'move-san';
      sanEl.textContent = san;
      row.appendChild(sanEl);

      moveElements.push(sanEl);
    }

    // Highlight the latest move
    highlightCurrentMove(moveElements.length - 1);

    // Auto-scroll to bottom
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function clearMoves(): void {
    movesList.innerHTML = '';
    moveElements = [];
  }

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function renderCapturedPieces(container: HTMLElement, pieces: Piece[]): void {
    container.innerHTML = '';
    const sorted = sortCaptured(pieces);

    // Calculate material advantage
    let totalValue = 0;
    for (const p of sorted) {
      totalValue += PIECE_VALUES[pieceType(p)] ?? 0;
      container.appendChild(createCapturedPieceSVG(p));
    }
  }

  function updateCapturedPieces(capturedByWhite: Piece[], capturedByBlack: Piece[]): void {
    // capturedByWhite = black pieces captured by white (shown near white's area)
    // capturedByBlack = white pieces captured by black (shown near black's area)
    renderCapturedPieces(capturedWhiteEl, capturedByWhite);
    renderCapturedPieces(capturedBlackEl, capturedByBlack);
  }

  function highlightCurrentMove(moveIndex: number): void {
    for (const el of moveElements) {
      el.classList.remove('current');
    }
    if (moveIndex >= 0 && moveIndex < moveElements.length) {
      moveElements[moveIndex].classList.add('current');
    }
  }

  function popMove(): void {
    if (moveElements.length === 0) return;

    const lastEl = moveElements.pop()!;
    const row = lastEl.parentElement!;
    lastEl.remove();

    // If the row only has the move number left, remove the whole row
    const remaining = row.querySelectorAll('.move-san');
    if (remaining.length === 0) {
      row.remove();
    }

    // Highlight the new last move
    if (moveElements.length > 0) {
      highlightCurrentMove(moveElements.length - 1);
    }
  }

  return {
    addMove,
    clearMoves,
    setStatus,
    updateCapturedPieces,
    highlightCurrentMove,
    popMove,
  };
}

/**
 * Get a human-readable string for the game result.
 */
export function getResultText(result: GameResult): string {
  switch (result) {
    case GameResult.WhiteWins: return 'Checkmate -- White wins!';
    case GameResult.BlackWins: return 'Checkmate -- Black wins!';
    case GameResult.DrawStalemate: return 'Draw by stalemate';
    case GameResult.DrawFiftyMove: return 'Draw by 50-move rule';
    case GameResult.DrawRepetition: return 'Draw by repetition';
    case GameResult.DrawInsufficientMaterial: return 'Draw -- insufficient material';
    default: return '';
  }
}
