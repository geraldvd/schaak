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
  }
  return el;
}

// Colors for white and black pieces
const W_FILL = '#fff';
const W_STROKE = '#333';
const B_FILL = '#333';
const B_STROKE = '#111';
const SW = 1.5;

function createPawn(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  // Base
  s.appendChild(path(
    'M 22.5 9 C 19.5 9 16.5 11 16.5 14.5 C 16.5 16.9 17.8 18.8 19.7 19.8 ' +
    'L 15 30 L 30 30 L 25.3 19.8 C 27.2 18.8 28.5 16.9 28.5 14.5 C 28.5 11 25.5 9 22.5 9 z',
    fill, stroke, SW
  ));
  // Bottom
  s.appendChild(path(
    'M 14 30 C 14 30 10 36 10 36 C 10 36 35 36 35 36 C 35 36 31 30 31 30 Z',
    fill, stroke, SW
  ));
  return s;
}

function createKnight(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const eyeFill = color === Color.White ? '#333' : '#fff';

  s.appendChild(path(
    'M 22 10 C 32.5 11 38.5 18 38 39 L 15 39 C 15 30 25 32.5 23 18 ' +
    'L 22 10 z',
    fill, stroke, SW
  ));
  s.appendChild(path(
    'M 24 18 C 24.4 20.9 18.5 24 16 25 C 13 26 13.2 18 14 14 ' +
    'C 15 10 19 9 22 10 L 24 18 z',
    fill, stroke, SW
  ));
  // Ear
  s.appendChild(path(
    'M 9.5 25.5 A 0.5 0.5 0 1 1 8.5 25.5 A 0.5 0.5 0 1 1 9.5 25.5 z',
    fill, stroke, SW
  ));
  // Nostril
  s.appendChild(path(
    'M 15 15.5 A 0.5 1.5 0 1 1 14 15.5 A 0.5 1.5 0 1 1 15 15.5 z',
    eyeFill, 'none'
  ));
  // Eye
  const eye = document.createElementNS(SVG_NS, 'circle');
  eye.setAttribute('cx', '17');
  eye.setAttribute('cy', '15.5');
  eye.setAttribute('r', '1.5');
  eye.setAttribute('fill', eyeFill);
  s.appendChild(eye);

  // Base
  s.appendChild(path(
    'M 10 39 L 38 39 L 38 36 L 10 36 Z',
    fill, stroke, SW
  ));

  return s;
}

function createBishop(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const notchFill = color === Color.White ? '#333' : '#fff';

  // Top knob
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '22.5');
  circle.setAttribute('cy', '7');
  circle.setAttribute('r', '2.5');
  circle.setAttribute('fill', fill);
  circle.setAttribute('stroke', stroke);
  circle.setAttribute('stroke-width', SW.toString());
  s.appendChild(circle);

  // Body
  s.appendChild(path(
    'M 22.5 10 C 18 10 13 15 13 22 C 13 28 17 31 17 31 ' +
    'L 28 31 C 28 31 32 28 32 22 C 32 15 27 10 22.5 10 z',
    fill, stroke, SW
  ));

  // Notch/slit
  s.appendChild(path(
    'M 19 17 L 22.5 12 L 26 17 L 22.5 15 Z',
    notchFill, 'none'
  ));

  // Collar
  s.appendChild(path(
    'M 15 31 A 40 40 0 0 0 30 31 L 30 33 A 40 40 0 0 1 15 33 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 12 36 L 33 36 C 33 36 31 33 31 33 L 14 33 C 14 33 12 36 12 36 z',
    fill, stroke, SW
  ));

  return s;
}

function createRook(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;

  // Battlements
  s.appendChild(path(
    'M 12 7 L 12 12 L 16 12 L 16 9 L 20 9 L 20 12 L 25 12 L 25 9 ' +
    'L 29 9 L 29 12 L 33 12 L 33 7 Z',
    fill, stroke, SW
  ));

  // Top section
  s.appendChild(path(
    'M 13 12 L 32 12 L 32 15 L 13 15 Z',
    fill, stroke, SW
  ));

  // Body
  s.appendChild(path(
    'M 14 15 L 14 31 L 31 31 L 31 15 Z',
    fill, stroke, SW
  ));

  // Base top
  s.appendChild(path(
    'M 13 31 L 32 31 L 32 33 L 13 33 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 11 33 L 34 33 L 34 36 L 11 36 Z',
    fill, stroke, SW
  ));

  return s;
}

function createQueen(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;
  const dotFill = color === Color.White ? '#333' : '#fff';

  // Crown points with balls
  const pointPositions = [
    { cx: 9, cy: 8 },
    { cx: 15, cy: 5 },
    { cx: 22.5, cy: 3 },
    { cx: 30, cy: 5 },
    { cx: 36, cy: 8 },
  ];

  for (const pos of pointPositions) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', pos.cx.toString());
    c.setAttribute('cy', pos.cy.toString());
    c.setAttribute('r', '2.5');
    c.setAttribute('fill', fill);
    c.setAttribute('stroke', stroke);
    c.setAttribute('stroke-width', SW.toString());
    s.appendChild(c);
  }

  // Crown body
  s.appendChild(path(
    'M 9 11 L 6 30 L 14 25 L 22.5 30 L 31 25 L 39 30 L 36 11 ' +
    'L 30 17 L 22.5 12 L 15 17 Z',
    fill, stroke, SW
  ));

  // Collar
  s.appendChild(path(
    'M 12 30 L 33 30 C 33 30 34 32 34 33 L 11 33 C 11 32 12 30 12 30 z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 10 33 L 35 33 L 35 36 L 10 36 Z',
    fill, stroke, SW
  ));

  // Decorative dots on crown body
  for (const pos of pointPositions) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', pos.cx.toString());
    c.setAttribute('cy', '22');
    c.setAttribute('r', '1.2');
    c.setAttribute('fill', dotFill);
    s.appendChild(c);
  }

  return s;
}

function createKing(color: Color): SVGSVGElement {
  const s = svg(45, 45);
  const fill = color === Color.White ? W_FILL : B_FILL;
  const stroke = color === Color.White ? W_STROKE : B_STROKE;

  // Cross on top
  s.appendChild(path(
    'M 22.5 3 L 22.5 9',
    'none', stroke, 2
  ));
  s.appendChild(path(
    'M 19.5 6 L 25.5 6',
    'none', stroke, 2
  ));

  // Crown/body
  s.appendChild(path(
    'M 22.5 11 C 22.5 11 15 16 11 20 C 7 24 10 31 10 31 ' +
    'L 35 31 C 35 31 38 24 34 20 C 30 16 22.5 11 22.5 11 z',
    fill, stroke, SW
  ));

  // Center line
  s.appendChild(path(
    'M 13 24 L 32 24',
    'none', stroke, 1
  ));

  // Collar
  s.appendChild(path(
    'M 12 31 C 12 31 11 33 11 33 L 34 33 C 34 33 33 31 33 31 Z',
    fill, stroke, SW
  ));

  // Base
  s.appendChild(path(
    'M 10 33 L 35 33 L 35 36 L 10 36 Z',
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
