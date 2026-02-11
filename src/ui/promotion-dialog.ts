import { Color, PieceType, MoveFlag } from '../types';
import { makePiece } from '../constants';
import { createPieceSVG } from './piece-renderer';

export type PromotionCallback = (flag: MoveFlag) => void;

const PROMOTION_PIECES: { type: PieceType; flag: MoveFlag }[] = [
  { type: PieceType.Queen, flag: MoveFlag.PromoteQueen },
  { type: PieceType.Rook, flag: MoveFlag.PromoteRook },
  { type: PieceType.Bishop, flag: MoveFlag.PromoteBishop },
  { type: PieceType.Knight, flag: MoveFlag.PromoteKnight },
];

let currentCallback: PromotionCallback | null = null;

/**
 * Show the promotion dialog for the given color.
 * Returns when the user selects a piece via the callback.
 */
export function showPromotionDialog(color: Color, callback: PromotionCallback): void {
  const dialog = document.getElementById('promotion-dialog')!;
  dialog.innerHTML = '';
  dialog.classList.remove('hidden');
  currentCallback = callback;

  const choices = document.createElement('div');
  choices.className = 'promotion-choices';

  for (const { type, flag } of PROMOTION_PIECES) {
    const piece = makePiece(color, type);
    const choiceEl = document.createElement('div');
    choiceEl.className = 'promotion-choice';
    choiceEl.appendChild(createPieceSVG(piece));

    choiceEl.addEventListener('click', () => {
      hidePromotionDialog();
      if (currentCallback) {
        currentCallback(flag);
        currentCallback = null;
      }
    });

    choices.appendChild(choiceEl);
  }

  dialog.appendChild(choices);

  // Close on backdrop click (cancel promotion)
  dialog.addEventListener('click', handleBackdropClick);
}

function handleBackdropClick(e: MouseEvent): void {
  if ((e.target as HTMLElement).id === 'promotion-dialog') {
    hidePromotionDialog();
    currentCallback = null;
  }
}

export function hidePromotionDialog(): void {
  const dialog = document.getElementById('promotion-dialog')!;
  dialog.classList.add('hidden');
  dialog.innerHTML = '';
  dialog.removeEventListener('click', handleBackdropClick);
}
