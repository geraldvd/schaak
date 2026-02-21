# Schaak

A browser-based chess application with a built-in AI opponent. "Schaak" is Dutch for chess. 
The game is made as a Claude Code experiment during a skiing trip in Fiss, Austria. The experiment succeeded - the chess game works.

## Features

- **Play against AI** or another human in the same browser
- **Configurable AI difficulty** — search depth 1–8, adjustable aggression and randomness
- **Opening book** for natural early-game play
- **Full chess rules** — castling, en passant, pawn promotion, three-fold repetition, fifty-move rule, insufficient material
- **Move history** in Standard Algebraic Notation (SAN)
- **Undo** support (single move, or double move when playing against AI)
- **Position evaluation bar** and live AI search statistics
- **Board flip** and captured pieces display

## Tech Stack

- **TypeScript** — entire codebase, zero runtime dependencies
- **Vite** — dev server and bundler
- **Vitest** — test runner
- **Web Workers API** — AI runs on a background thread to keep the UI responsive
- **Docker + Nginx** — production deployment

## Getting Started

### Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Docker

```bash
docker build -t schaak .
docker run -p 8080:8080 schaak
```

Or with Docker Compose:

```bash
docker compose up
```

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Tests cover move generation (perft), board logic, AI evaluation, checkmate puzzles, special rules, and full game simulations.

## Architecture

```
src/
├── engine/      # Board representation (0x88), move generation, validation
├── ai/          # Negamax + alpha-beta, quiescence search, transposition table, opening book
├── workers/     # Web Worker wrapper for AI
└── ui/          # Board rendering, game controls, move indicators
```

The chess engine and AI are implemented from scratch — no external chess libraries are used.
