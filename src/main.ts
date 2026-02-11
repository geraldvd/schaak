import {
  type BoardState,
  type Move,
  type Square88,
  type UIState,
  type WorkerSearchRequest,
  type WorkerSearchResult,
  type WorkerResponse,
  Piece,
  Color,
  MoveFlag,
  GameMode,
  GameResult,
} from './types';
import { INITIAL_FEN, pieceColor } from './constants';
import { parseFEN, cloneState } from './engine/board';
import { generateLegalMoves, makeMove, isInCheck } from './engine/validation';
import { getGameResult } from './engine/game-state';
import { moveToSAN } from './engine/notation';
import { createBoardRenderer, type BoardRenderer } from './ui/board-renderer';
import { showMoveIndicators, clearMoveIndicators } from './ui/move-indicators';
import { showPromotionDialog } from './ui/promotion-dialog';
import { createGameControls, type GameControls } from './ui/game-controls';
import { createGameInfo, getResultText, type GameInfo } from './ui/game-info';

// --- State ---
let boardState: BoardState;
let ui: UIState;
let positionHistory: number[] = [];
let moveHistory: { move: Move; san: string; undoState: BoardState }[] = [];
let capturedByWhite: Piece[] = []; // Black pieces captured by white
let capturedByBlack: Piece[] = []; // White pieces captured by black
let gameOver = false;

// --- UI components ---
let renderer: BoardRenderer;
let controls: GameControls;
let info: GameInfo;

// --- AI Worker ---
let worker: Worker | null = null;

function initWorker(): void {
  try {
    worker = new Worker(
      new URL('./workers/ai-worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      handleWorkerMessage(e.data);
    };
    worker.onerror = (e) => {
      console.error('AI worker error:', e);
      ui.aiThinking = false;
      controls.setThinking(false);
    };
  } catch {
    console.warn('AI worker not available. Human vs AI mode will be disabled.');
    worker = null;
  }
}

function handleWorkerMessage(msg: WorkerResponse): void {
  if (msg.type === 'result') {
    const result = msg as WorkerSearchResult;
    ui.aiThinking = false;
    controls.setThinking(false);

    if (result.bestMove) {
      executeMove(result.bestMove);
    }
  }
  // Progress updates could be shown in UI but we keep it simple
}

// --- Game Logic ---

function initGame(): void {
  boardState = parseFEN(INITIAL_FEN);
  positionHistory = [boardState.zobristHash];
  moveHistory = [];
  capturedByWhite = [];
  capturedByBlack = [];
  gameOver = false;

  ui = {
    selectedSquare: null,
    legalMovesForSelected: [],
    boardFlipped: false,
    gameMode: ui ? ui.gameMode : GameMode.HumanVsHuman,
    aiDepth: ui ? ui.aiDepth : 5,
    aiThinking: false,
  };

  controls.setThinking(false);
  info.clearMoves();
  info.updateCapturedPieces(capturedByWhite, capturedByBlack);
  updateStatusText();
  renderBoard();
}

function renderBoard(): void {
  renderer.render(boardState, ui.boardFlipped);
  renderer.clearAllHighlights();

  // Show last move highlight
  if (moveHistory.length > 0) {
    const last = moveHistory[moveHistory.length - 1].move;
    renderer.highlightSquare(last.from, 'last-move');
    renderer.highlightSquare(last.to, 'last-move');
  }

  // Show check highlight
  if (isInCheck(boardState, boardState.sideToMove)) {
    const kingSq = boardState.kingSquares[boardState.sideToMove];
    renderer.highlightSquare(kingSq, 'check');
  }

  // Show selection
  if (ui.selectedSquare !== null) {
    renderer.highlightSquare(ui.selectedSquare, 'selected');
    showMoveIndicators(renderer, ui.legalMovesForSelected);
  } else {
    clearMoveIndicators(renderer);
  }
}

function updateStatusText(): void {
  if (gameOver) return; // Status already set by game end logic

  const side = boardState.sideToMove === Color.White ? 'White' : 'Black';
  if (isInCheck(boardState, boardState.sideToMove)) {
    info.setStatus(`${side} is in check`);
  } else {
    info.setStatus(`${side} to move`);
  }
}

function handleSquareClick(sq: Square88): void {
  if (gameOver || ui.aiThinking) return;

  // If in HvAI mode and it's black's turn, ignore clicks
  if (ui.gameMode === GameMode.HumanVsAI && boardState.sideToMove === Color.Black) return;

  const piece = boardState.board[sq];

  // If a square is already selected
  if (ui.selectedSquare !== null) {
    // Check if the clicked square is a legal move target
    const targetMove = ui.legalMovesForSelected.find(m => m.to === sq);

    if (targetMove) {
      // Check if this is a promotion move
      const promotionMoves = ui.legalMovesForSelected.filter(
        m => m.to === sq && m.flag >= MoveFlag.PromoteKnight && m.flag <= MoveFlag.PromoteQueen
      );

      if (promotionMoves.length > 0) {
        // Show promotion dialog
        showPromotionDialog(boardState.sideToMove, (flag: MoveFlag) => {
          const promoMove = promotionMoves.find(m => m.flag === flag);
          if (promoMove) {
            executeMove(promoMove);
          }
        });
        return;
      }

      executeMove(targetMove);
      return;
    }

    // Clicking on own piece -> reselect
    if (piece !== Piece.None && pieceColor(piece) === boardState.sideToMove) {
      selectSquare(sq);
      return;
    }

    // Click on empty/enemy square that's not a legal target -> deselect
    deselectSquare();
    return;
  }

  // No square selected: select own piece
  if (piece !== Piece.None && pieceColor(piece) === boardState.sideToMove) {
    selectSquare(sq);
  }
}

function selectSquare(sq: Square88): void {
  const legalMoves = generateLegalMoves(boardState);
  const movesFromSquare = legalMoves.filter(m => m.from === sq);

  ui.selectedSquare = sq;
  ui.legalMovesForSelected = movesFromSquare;
  renderBoard();
}

function deselectSquare(): void {
  ui.selectedSquare = null;
  ui.legalMovesForSelected = [];
  renderBoard();
}

function executeMove(move: Move): void {
  // Get SAN before making the move
  const san = moveToSAN(boardState, move);

  // Save state for undo
  const savedState = cloneState(boardState);

  // Track captures
  if (move.captured !== Piece.None) {
    const capturedPiece = move.captured;
    // For en passant, the captured piece type is set in move.captured
    if (pieceColor(capturedPiece) === Color.White) {
      capturedByBlack.push(capturedPiece);
    } else {
      capturedByWhite.push(capturedPiece);
    }
  }

  // Make the move
  makeMove(boardState, move);

  // Record in history
  moveHistory.push({ move, san, undoState: savedState });
  positionHistory.push(boardState.zobristHash);

  // Update move list
  const moveNumber = Math.ceil(moveHistory.length / 2);
  const color = moveHistory.length % 2 === 1 ? Color.White : Color.Black;
  info.addMove(moveNumber, color, san);
  info.updateCapturedPieces(capturedByWhite, capturedByBlack);

  // Clear selection
  ui.selectedSquare = null;
  ui.legalMovesForSelected = [];

  // Check game result
  const result = getGameResult(boardState, positionHistory);

  if (result !== GameResult.InProgress) {
    gameOver = true;
    info.setStatus(getResultText(result));
    renderBoard();
    return;
  }

  updateStatusText();
  renderBoard();

  // Trigger AI if needed
  if (ui.gameMode === GameMode.HumanVsAI && boardState.sideToMove === Color.Black && !gameOver) {
    triggerAI();
  }
}

function triggerAI(): void {
  if (!worker) {
    info.setStatus('AI worker not available');
    return;
  }

  ui.aiThinking = true;
  controls.setThinking(true);
  info.setStatus('AI is thinking...');

  const request: WorkerSearchRequest = {
    type: 'search',
    state: cloneState(boardState),
    depth: ui.aiDepth,
    positionHistory: [...positionHistory],
  };

  worker.postMessage(request);
}

function undoMove(): void {
  if (moveHistory.length === 0 || ui.aiThinking) return;

  // In HvAI mode, undo two moves (human + AI)
  const movesToUndo = ui.gameMode === GameMode.HumanVsAI && moveHistory.length >= 2 ? 2 : 1;

  for (let i = 0; i < movesToUndo; i++) {
    if (moveHistory.length === 0) break;

    const entry = moveHistory.pop()!;
    positionHistory.pop();

    // Restore board state
    const savedState = entry.undoState;
    boardState.board = savedState.board.slice();
    boardState.sideToMove = savedState.sideToMove;
    boardState.castlingRights = savedState.castlingRights;
    boardState.enPassantSquare = savedState.enPassantSquare;
    boardState.halfMoveClock = savedState.halfMoveClock;
    boardState.fullMoveNumber = savedState.fullMoveNumber;
    boardState.kingSquares = [savedState.kingSquares[0], savedState.kingSquares[1]];
    boardState.zobristHash = savedState.zobristHash;

    // Restore captured pieces
    if (entry.move.captured !== Piece.None) {
      const capturedPiece = entry.move.captured;
      if (pieceColor(capturedPiece) === Color.White) {
        const idx = capturedByBlack.lastIndexOf(capturedPiece);
        if (idx >= 0) capturedByBlack.splice(idx, 1);
      } else {
        const idx = capturedByWhite.lastIndexOf(capturedPiece);
        if (idx >= 0) capturedByWhite.splice(idx, 1);
      }
    }

    info.popMove();
  }

  gameOver = false;
  ui.selectedSquare = null;
  ui.legalMovesForSelected = [];

  info.updateCapturedPieces(capturedByWhite, capturedByBlack);
  updateStatusText();
  renderBoard();
}

// --- Initialize ---

function main(): void {
  renderer = createBoardRenderer();
  info = createGameInfo();
  controls = createGameControls({
    onNewGame: () => initGame(),
    onUndo: () => undoMove(),
    onFlipBoard: () => {
      ui.boardFlipped = !ui.boardFlipped;
      renderBoard();
    },
    onModeChange: (mode: GameMode) => {
      ui.gameMode = mode;
      initGame();
    },
    onDepthChange: (depth: number) => {
      ui.aiDepth = depth;
    },
  });

  renderer.setSquareClickHandler(handleSquareClick);

  // Initialize default UI state
  ui = {
    selectedSquare: null,
    legalMovesForSelected: [],
    boardFlipped: false,
    gameMode: GameMode.HumanVsHuman,
    aiDepth: 5,
    aiThinking: false,
  };

  initWorker();
  initGame();
}

main();
