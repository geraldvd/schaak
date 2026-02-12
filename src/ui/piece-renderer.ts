import { Color, Piece, PieceType } from '../types';
import { pieceType, pieceColor } from '../constants';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(width: number, height: number): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${width} ${height}`);
  el.setAttribute('xmlns', SVG_NS);
  el.classList.add('piece');
  return el;
}

function path(d: string, fill: string, stroke?: string, strokeWidth?: number): SVGPathElement {
  const el = document.createElementNS(SVG_NS, 'path');
  el.setAttribute('d', d);
  el.setAttribute('fill', fill);
  if (stroke) {
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', (strokeWidth ?? 1.5).toString());
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('stroke-linecap', 'round');
  }
  return el;
}

function circle(cx: number, cy: number, r: number, fill: string, stroke?: string, strokeWidth?: number): SVGCircleElement {
  const el = document.createElementNS(SVG_NS, 'circle');
  el.setAttribute('cx', cx.toString());
  el.setAttribute('cy', cy.toString());
  el.setAttribute('r', r.toString());
  el.setAttribute('fill', fill);
  if (stroke) {
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', (strokeWidth ?? 1.5).toString());
  }
  return el;
}

// Colors for white and black pieces
const W_FILL = '#fff';
const W_STROKE = '#000';
const W_DETAIL = '#000';
const B_FILL = '#333';
const B_STROKE = '#000';
const B_DETAIL = '#fff';
const SW = 1.5;

function createPawn(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;

  // Head (rounded circle)
  s.appendChild(circle(22.5, 12, 4.5, fill, stroke, SW));

  // Neck and body
  s.appendChild(path(
    'M 17.5 17 C 18.5 16 20 15 22.5 15 C 25 15 26.5 16 27.5 17 ' +
    'L 29.5 28 L 15.5 28 Z',
    fill, stroke, SW
  ));

  // Collar
  s.appendChild(path(
    'M 14 28 C 14 28 14.5 30 22.5 30 C 30.5 30 31 28 31 28 ' +
    'L 31 30 C 31 30 30.5 32 22.5 32 C 14.5 32 14 30 14 30 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 11 38 C 11 35 14 32 22.5 32 C 31 32 34 35 34 38 Z',
    fill, stroke, SW
  ));

  // Base bottom edge
  s.appendChild(path(
    'M 9 39 L 36 39 L 36 38 C 36 35 32 32 22.5 32 C 13 32 9 35 9 38 Z',
    fill, stroke, SW
  ));

  return s;
}

function createKnight(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const detail = color === Color.White ? W_DETAIL : B_DETAIL;

  // Main body shape - horse head and neck
  s.appendChild(path(
    'M 22 10 C 32.5 11 38.5 18 38 39 L 15 39 ' +
    'C 15 30 25 32.5 23 18',
    fill, stroke, SW
  ));

  // Head front
  s.appendChild(path(
    'M 24 18 C 24.38 20.91 18.45 25.37 16 27 ' +
    'C 13 29 13.18 31.34 11 31 C 9.958 30.06 12.41 27.96 11 28 ' +
    'C 10 28 11.19 29.23 10 30 C 9 30 5.997 31 6 26 ' +
    'C 6 24 12 14 12 14 C 12 14 13.89 12.1 14 10.5 ' +
    'C 13.27 9.506 13.5 8.5 13.5 7.5 C 14.5 6.5 16.5 10 16.5 10 ' +
    'L 18.5 10 C 18.5 10 19.28 8.008 21 7 C 22.5 5.5 25.5 7.5 22 10',
    fill, stroke, SW
  ));

  // Eye
  s.appendChild(circle(15, 15.5, 1.5, detail));

  // Nostril
  s.appendChild(path(
    'M 7 25.5 C 7.5 25.5 8.5 25.2 8.5 24.5 C 8.5 23.8 7.5 23.5 7 24',
    detail, 'none'
  ));

  // Mane lines
  s.appendChild(path(
    'M 19.5 11 L 20.5 14',
    'none', stroke, 1
  ));
  s.appendChild(path(
    'M 21 11.5 L 22.5 14.5',
    'none', stroke, 1
  ));

  // Base
  s.appendChild(path(
    'M 9 39 L 38 39 L 38 36 C 38 36 35.5 35 22.5 35 C 9.5 35 9 36 9 36 Z',
    fill, stroke, SW
  ));

  return s;
}

function createBishop(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const detail = color === Color.White ? W_DETAIL : B_DETAIL;

  // Top cross/ball
  s.appendChild(circle(22.5, 6, 2.2, fill, stroke, SW));

  // Main mitre/hat body
  s.appendChild(path(
    'M 22.5 9 C 18 9 13 17 13 23 C 13 27 16 30 17 30.5 ' +
    'L 28 30.5 C 29 30 32 27 32 23 C 32 17 27 9 22.5 9 Z',
    fill, stroke, SW
  ));

  // Slit/notch (different for white and black)
  if (color === Color.White) {
    s.appendChild(path(
      'M 18 24 L 22.5 12.5 L 27 24 L 22.5 21 Z',
      detail, 'none'
    ));
  } else {
    s.appendChild(path(
      'M 18 24 L 22.5 12.5 L 27 24 L 22.5 21 Z',
      detail, 'none'
    ));
  }

  // Horizontal band across middle
  s.appendChild(path(
    'M 15 24 L 30 24',
    'none', stroke, 1
  ));

  // Collar/band
  s.appendChild(path(
    'M 14 30.5 C 14 30.5 15.5 33 22.5 33 C 29.5 33 31 30.5 31 30.5 ' +
    'L 31 32.5 C 31 32.5 29.5 35 22.5 35 C 15.5 35 14 32.5 14 32.5 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 10 39 L 35 39 C 35 39 33 35 22.5 35 C 12 35 10 39 10 39 Z',
    fill, stroke, SW
  ));

  return s;
}

function createRook(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;

  // Battlements/crenellations
  s.appendChild(path(
    'M 12 7 L 12 12 L 16 12 L 16 8 L 20 8 L 20 12 ' +
    'L 25 12 L 25 8 L 29 8 L 29 12 L 33 12 L 33 7 Z',
    fill, stroke, SW
  ));

  // Top band
  s.appendChild(path(
    'M 12 12 L 33 12 L 33 15 L 12 15 Z',
    fill, stroke, SW
  ));

  // Body
  s.appendChild(path(
    'M 14 15 L 14 30 L 31 30 L 31 15 Z',
    fill, stroke, SW
  ));

  // Inner body lines (detail)
  s.appendChild(path('M 17 15 L 17 30', 'none', stroke, 0.8));
  s.appendChild(path('M 28 15 L 28 30', 'none', stroke, 0.8));

  // Bottom band
  s.appendChild(path(
    'M 12 30 L 33 30 L 33 33 L 12 33 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 10 33 L 35 33 L 35 37 L 10 37 Z',
    fill, stroke, SW
  ));

  return s;
}

function createQueen(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const detail = color === Color.White ? W_DETAIL : B_DETAIL;

  // Crown point tips with balls
  const tips = [
    { cx: 9, cy: 7 },
    { cx: 15, cy: 4 },
    { cx: 22.5, cy: 2.5 },
    { cx: 30, cy: 4 },
    { cx: 36, cy: 7 },
  ];

  for (const t of tips) {
    s.appendChild(circle(t.cx, t.cy, 2.2, fill, stroke, SW));
  }

  // Crown body with zigzag pattern
  s.appendChild(path(
    'M 9 10 C 8 14 6 28 6 30 ' +
    'L 14 24 L 22.5 30 L 31 24 L 39 30 ' +
    'C 39 28 37 14 36 10 ' +
    'L 30 17 L 22.5 11 L 15 17 Z',
    fill, stroke, SW
  ));

  // Inner crown lines
  if (color === Color.White) {
    s.appendChild(path('M 11 25 L 14 21', 'none', stroke, 0.8));
    s.appendChild(path('M 17 23 L 22.5 18', 'none', stroke, 0.8));
    s.appendChild(path('M 28 23 L 22.5 18', 'none', stroke, 0.8));
    s.appendChild(path('M 34 25 L 31 21', 'none', stroke, 0.8));
  }

  // Decorative dots on crown body
  for (const t of tips) {
    s.appendChild(circle(t.cx, 22, 1.2, detail));
  }

  // Collar
  s.appendChild(path(
    'M 6 30 C 6 30 8 33 22.5 33 C 37 33 39 30 39 30 ' +
    'L 39 32 C 39 32 37 35 22.5 35 C 8 35 6 32 6 32 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 8 39 L 37 39 C 37 39 35 35 22.5 35 C 10 35 8 39 8 39 Z',
    fill, stroke, SW
  ));

  return s;
}

function createKing(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;

  // Cross on top
  s.appendChild(path(
    'M 22.5 2 L 22.5 8',
    'none', stroke, 2.5
  ));
  s.appendChild(path(
    'M 19.5 5 L 25.5 5',
    'none', stroke, 2.5
  ));

  // Crown arches
  s.appendChild(path(
    'M 22.5 10 C 22.5 10 16 12 11 18 C 6 24 9 32 9 32 ' +
    'L 36 32 C 36 32 39 24 34 18 C 29 12 22.5 10 22.5 10 Z',
    fill, stroke, SW
  ));

  // Crown arch detail lines
  s.appendChild(path(
    'M 11.5 25 L 33.5 25',
    'none', stroke, 1
  ));
  s.appendChild(path(
    'M 13 19 L 22.5 13 L 32 19',
    'none', stroke, 1
  ));

  // Collar
  s.appendChild(path(
    'M 9 32 C 9 32 11 35 22.5 35 C 34 35 36 32 36 32 ' +
    'L 36 34 C 36 34 34 37 22.5 37 C 11 37 9 34 9 34 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 7 39 L 38 39 C 38 39 35.5 37 22.5 37 C 9.5 37 7 39 7 39 Z',
    fill, stroke, SW
  ));

  return s;
}

// Cache: piece enum -> SVG element (template to clone)
const pieceCache = new Map<Piece, SVGSVGElement>();

const CREATORS: Record<number, (color: Color) => SVGSVGElement> = {
  [PieceType.Pawn]: createPawn,
  [PieceType.Knight]: createKnight,
  [PieceType.Bishop]: createBishop,
  [PieceType.Rook]: createRook,
  [PieceType.Queen]: createQueen,
  [PieceType.King]: createKing,
};

function getTemplate(piece: Piece): SVGSVGElement {
  let cached = pieceCache.get(piece);
  if (!cached) {
    const color = pieceColor(piece);
    const type = pieceType(piece);
    const creator = CREATORS[type];
    if (!creator) throw new Error(`No renderer for piece type ${type}`);
    cached = creator(color);
    pieceCache.set(piece, cached);
  }
  return cached;
}

/**
 * Create an SVG element for the given piece.
 */
export function createPieceSVG(piece: Piece): SVGSVGElement {
  return getTemplate(piece).cloneNode(true) as SVGSVGElement;
}

/**
 * Create a small SVG for captured piece display.
 */
export function createCapturedPieceSVG(piece: Piece): SVGSVGElement {
  const el = createPieceSVG(piece);
  el.classList.remove('piece');
  return el;
}
