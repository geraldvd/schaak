// Piece colors
export const enum Color {
  White = 0,
  Black = 1,
}

// Piece types
export const enum PieceType {
  Pawn = 1,
  Knight = 2,
  Bishop = 3,
  Rook = 4,
  Queen = 5,
  King = 6,
}

// Encoded piece = color << 3 | type
export const enum Piece {
  None = 0,
  WhitePawn = 1,
  WhiteKnight = 2,
  WhiteBishop = 3,
  WhiteRook = 4,
  WhiteQueen = 5,
  WhiteKing = 6,
  BlackPawn = 9,
  BlackKnight = 10,
  BlackBishop = 11,
  BlackRook = 12,
  BlackQueen = 13,
  BlackKing = 14,
}

// Move flags
export const enum MoveFlag {
  None = 0,
  DoublePush = 1,
  EnPassant = 2,
  KingsideCastle = 3,
  QueensideCastle = 4,
  PromoteKnight = 5,
  PromoteBishop = 6,
  PromoteRook = 7,
  PromoteQueen = 8,
}

// Castling rights bitmask
export const enum CastlingRight {
  None = 0,
  WhiteKingside = 1,
  WhiteQueenside = 2,
  BlackKingside = 4,
  BlackQueenside = 8,
  All = 15,
}

// 0x88 square index (valid squares have (index & 0x88) === 0)
export type Square88 = number;

// Move encoded as a plain object for clarity
export interface Move {
  from: Square88;
  to: Square88;
  piece: Piece;
  captured: Piece;
  flag: MoveFlag;
}

// Board state (mutable for performance, clone when needed)
export interface BoardState {
  board: Piece[];           // 128-element 0x88 board
  sideToMove: Color;
  castlingRights: number;   // CastlingRight bitmask
  enPassantSquare: Square88 | -1;
  halfMoveClock: number;    // for 50-move rule
  fullMoveNumber: number;
  kingSquares: [Square88, Square88]; // [white king, black king]
  zobristHash: number;
}

// Game result
export const enum GameResult {
  InProgress,
  WhiteWins,
  BlackWins,
  DrawStalemate,
  DrawFiftyMove,
  DrawRepetition,
  DrawInsufficientMaterial,
}

// Transposition table entry
export const enum TTFlag {
  Exact = 0,
  LowerBound = 1,
  UpperBound = 2,
}

export interface TTEntry {
  hash: number;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove: Move | null;
}

// AI configuration options
export interface AIConfig {
  depth: number;          // 1-8
  useBook: boolean;       // opening book on/off
  aggression: number;     // -50 to +50 (negative=defensive, positive=aggressive)
  randomness: number;     // 0-50 centipawns of random noise
  minAnswerTime: number;  // 0-5 seconds minimum before AI moves
}

// AI worker messages
export interface WorkerSearchRequest {
  type: 'search';
  state: BoardState;
  depth: number;
  positionHistory: number[];
  aiConfig?: AIConfig;
}

export interface WorkerSearchResult {
  type: 'result';
  bestMove: Move;
  score: number;
  depth: number;
  nodesSearched: number;
  timeMs: number;
}

export interface WorkerProgressUpdate {
  type: 'progress';
  depth: number;
  bestMove: Move | null;
  score: number;
  nodesSearched: number;
}

export type WorkerMessage = WorkerSearchRequest;
export type WorkerResponse = WorkerSearchResult | WorkerProgressUpdate;

// Game mode
export const enum GameMode {
  HumanVsHuman = 0,
  HumanVsAI = 1,
}

// Color assignment for AI games
export const enum ColorChoice {
  White = 0,
  Black = 1,
  Random = 2,
}

// UI selection state
export interface UIState {
  selectedSquare: Square88 | null;
  legalMovesForSelected: Move[];
  boardFlipped: boolean;
  gameMode: GameMode;
  aiDepth: number;
  aiThinking: boolean;
  humanColor: Color;       // which color the human plays in HvAI mode
  aiConfig: AIConfig;
}
