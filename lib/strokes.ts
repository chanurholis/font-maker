import { getStroke } from 'perfect-freehand';
import type { Glyph, Stroke } from './store';

type Poly = [number, number][];

/** Stroke centerline samples → closed outline polygon, in font units. */
export function outline(s: Stroke, weight = 1): Poly {
  const poly = getStroke(s.points, {
    size: s.size * weight,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.35,
    simulatePressure: false,
    last: true,
  }) as Poly;
  // Same winding for every contour, so overlapping strokes add up under the nonzero rule.
  return area(poly) < 0 ? poly.reverse() : poly;
}

function area(poly: Poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  return a / 2;
}

const cache = new WeakMap<Stroke[], Map<number, Path2D>>();

/** Path2D of all strokes in font units (y-up). Cached per strokes array, which the store never mutates. */
function glyphPath(strokes: Stroke[], weight: number) {
  let byWeight = cache.get(strokes);
  if (!byWeight) cache.set(strokes, (byWeight = new Map()));
  let path = byWeight.get(weight);
  if (!path) {
    path = new Path2D();
    for (const s of strokes) {
      const poly = outline(s, weight);
      if (poly.length < 3) continue;
      path.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
      path.closePath();
    }
    byWeight.set(weight, path);
  }
  return path;
}

export type Placed = { ch: string; x: number; line: number };

/** Greedy word-wrap of `text` using glyph advances. x is in px, `scale` is px per font unit. */
export function layoutText(
  advanceOf: (ch: string) => number,
  text: string,
  { scale, tracking, width, pad }: { scale: number; tracking: number; width: number; pad: number },
) {
  const items: Placed[] = [];
  const step = (ch: string) => (advanceOf(ch) + tracking) * scale;
  let x = pad, line = 0;
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) {
      if (word.includes('\n')) { x = pad; line += word.split('\n').length - 1; }
      else if (x > pad) x += step(' ');
      continue;
    }
    const w = [...word].reduce((a, ch) => a + step(ch), 0);
    if (x + w > width - pad && x > pad) { x = pad; line++; }
    for (const ch of word) { items.push({ ch, x, line }); x += step(ch); }
  }
  return { items, lines: line + 1 };
}

export const SPACE_ADVANCE = 280;

type TextOpts = {
  size: number; // px per em
  width: number;
  pad?: number;
  color: string;
  missingColor?: string; // draw a dashed box for glyphs that are not drawn yet
  weight?: number;
  slant?: number;
  tracking?: number;
  lineHeight?: number;
  ascender?: number;
  capHeight?: number;
};

/** Set `text` with the drawn glyphs. Returns the height used, in px. */
export function drawText(ctx: CanvasRenderingContext2D, glyphs: Record<string, Glyph>, text: string, o: TextOpts) {
  const { size, width, pad = 0, weight = 1, slant = 0, tracking = 0, lineHeight = 1.3, ascender = 800, capHeight = 700 } = o;
  const scale = size / 1000;
  const advanceOf = (ch: string) => (/\s/.test(ch) ? SPACE_ADVANCE : glyphs[ch]?.advance ?? 520);
  const { items, lines } = layoutText(advanceOf, text, { scale, tracking, width, pad });
  for (const it of items) {
    const g = glyphs[it.ch];
    const base = pad + it.line * size * lineHeight + ascender * scale;
    if (g?.strokes.length) drawGlyph(ctx, g.strokes, it.x, base, scale, o.color, weight, slant);
    else if (o.missingColor) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = o.missingColor;
      ctx.strokeRect(it.x + 60 * scale, base - capHeight * scale, (advanceOf(it.ch) - 120) * scale, capHeight * scale);
      ctx.restore();
    }
  }
  return pad * 2 + lines * size * lineHeight;
}

/** Fill strokes with the baseline origin at screen (x, y), `scale` px per font unit. */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  x: number,
  y: number,
  scale: number,
  color: string,
  weight = 1,
  slantDeg = 0,
) {
  ctx.save();
  ctx.transform(scale, 0, Math.tan((slantDeg * Math.PI) / 180) * scale, -scale, x, y);
  ctx.fillStyle = color;
  ctx.fill(glyphPath(strokes, weight));
  ctx.restore();
}
