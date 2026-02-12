import {
  type BoardState,
  type Move,
  type Square88,
  type UIState,
  type WorkerSearchRequest,
  type WorkerSearchResult,
  type WorkerResponse,
  type WorkerProgressUpdate,
  type AIConfig,
  Piece,
  Color,
  MoveFlag,
  GameMode,
  GameResult,
  ColorChoice,
} from './types';
import { INITIAL_FEN, pieceColor } from './constants';
import { parseFEN, cloneState } from './engine/board';
import { generateLegalMoves, makeMove, isInCheck } from './engine/validation';
import { getGameResult } from './engine/game-state';
import { moveToSAN } from './engine/notation';
import { evaluate } from './ai/evaluation';
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
let colorChoice: ColorChoice = ColorChoice.Random;

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
  if (msg.type === 'progress') {
    const progress = msg as WorkerProgressUpdate;
    controls.updateThinkingProgress(progress.depth, ui.aiConfig.depth, progress.nodesSearched);
  } else if (msg.type === 'result') {
    const result = msg as WorkerSearchResult;
    ui.aiThinking = false;
    controls.setThinking(false);

    // Show search stats
    controls.showSearchResult(result.depth, result.nodesSearched, result.timeMs, result.score);

    if (result.bestMove) {
      // Store the AI's evaluation score (from white's perspective)
      const aiScore = ui.humanColor === Color.White ? -result.score : result.score;
      executeMove(result.bestMove);
      // Update eval bar with the score from the AI's perspective converted to white's
      info.updateEvalBar(aiScore);
    }
  }
}

// --- Game Logic ---

function resolveHumanColor(): Color {
  switch (colorChoice) {
    case ColorChoice.White: return Color.White;
    case ColorChoice.Black: return Color.Black;
    case ColorChoice.Random: return Math.random() < 0.5 ? Color.White : Color.Black;
  }
}

function initGame(): void {
  boardState = parseFEN(INITIAL_FEN);
  positionHistory = [boardState.zobristHash];
  moveHistory = [];
  capturedByWhite = [];
  capturedByBlack = [];
  gameOver = false;

  // Determine human color for AI games
  const humanColor = ui ? ui.humanColor : resolveHumanColor();
  const newHumanColor = ui && ui.gameMode === GameMode.HumanVsAI ? resolveHumanColor() : humanColor;

  ui = {
    selectedSquare: null,
    legalMovesForSelected: [],
    boardFlipped: ui ? ui.boardFlipped : false,
    gameMode: ui ? ui.gameMode : GameMode.HumanVsAI,
    aiDepth: ui ? ui.aiDepth : 5,
    aiThinking: false,
    humanColor: newHumanColor,
    aiConfig: ui ? ui.aiConfig : {
      depth: 5,
      useBook: true,
      aggression: 0,
      randomness: 0,
    },
  };

  // Auto-flip board so human's pieces are at the bottom
  if (ui.gameMode === GameMode.HumanVsAI) {
    ui.boardFlipped = ui.humanColor === Color.Black;
  }

  controls.setThinking(false);
  controls.clearStats();
  info.clearMoves();
  info.updateCapturedPieces(capturedByWhite, capturedByBlack);
  info.updateEvalBar(0);
  updateStatusText();
  renderBoard();

  // If AI plays white, trigger AI first move
  if (ui.gameMode === GameMode.HumanVsAI && ui.humanColor === Color.Black && !gameOver) {
    triggerAI();
  }
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

function computeEvalForDisplay(): number {
  // Compute evaluation from white's perspective
  const evalScore = evaluate(boardState);
  // evaluate() returns from side-to-move's perspective
  // Convert to white's perspective
  return boardState.sideToMove === Color.White ? evalScore : -evalScore;
}

function handleSquareClick(sq: Square88): void {
  if (gameOver || ui.aiThinking) return;

  // In HvAI mode, ignore clicks when it's the AI's turn
  if (ui.gameMode === GameMode.HumanVsAI && boardState.sideToMove !== ui.humanColor) return;

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
            // Update eval bar after human move
            info.updateEvalBar(computeEvalForDisplay());
          }
        });
        return;
      }

      executeMove(targetMove);
      // Update eval bar after human move
      info.updateEvalBar(computeEvalForDisplay());
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
  if (ui.gameMode === GameMode.HumanVsAI && boardState.sideToMove !== ui.humanColor && !gameOver) {
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
    depth: ui.aiConfig.depth,
    positionHistory: [...positionHistory],
    aiConfig: ui.aiConfig,
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
  info.updateEvalBar(computeEvalForDisplay());
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
      ui.aiConfig = { ...ui.aiConfig, depth };
    },
    onAIConfigChange: (config: AIConfig) => {
      ui.aiConfig = config;
      ui.aiDepth = config.depth;
    },
    onColorChoiceChange: (choice: ColorChoice) => {
      colorChoice = choice;
    },
  });

  renderer.setSquareClickHandler(handleSquareClick);

  // Initialize default UI state - AI mode is the default
  ui = {
    selectedSquare: null,
    legalMovesForSelected: [],
    boardFlipped: false,
    gameMode: GameMode.HumanVsAI,
    aiDepth: 5,
    aiThinking: false,
    humanColor: Color.White,
    aiConfig: {
      depth: 5,
      useBook: true,
      aggression: 0,
      randomness: 0,
    },
  };

  controls.setMode(GameMode.HumanVsAI);

  initWorker();
  initGame();
}

main();
