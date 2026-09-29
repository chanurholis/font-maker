import { CHARSET } from './charset';
import type { Point, Stroke } from './store';

// Hand-drawn-looking monoline sample glyphs, so a new user sees a working font right away.
const TAU = Math.PI * 2, PI = Math.PI;
type XY = [number, number];

function ln(x1: number, y1: number, x2: number, y2: number): XY[] {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18));
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
}
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): XY[] {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / 18));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}
const join = (...parts: XY[][]) => parts.flat();
const bowl = () => arc(250, 250, 185, 250, 0, TAU);

const SEED: Record<string, [number, XY[][]]> = {
  a: [520, [bowl(), ln(435, 500, 435, 0)]],
  c: [480, [arc(260, 250, 200, 250, PI * 0.27, PI * 1.73)]],
  d: [520, [bowl(), ln(435, 750, 435, 0)]],
  e: [520, [join(ln(70, 255, 440, 255), arc(255, 250, 188, 250, 0.03, TAU - 0.55))]],
  h: [500, [ln(70, 750, 70, 0), join(arc(250, 320, 180, 180, PI, 0), ln(430, 320, 430, 0))]],
  i: [170, [ln(85, 500, 85, 0), [[85, 660]]]],
  l: [170, [ln(85, 750, 85, 0)]],
  m: [640, [ln(70, 500, 70, 0), join(arc(195, 330, 125, 170, PI, 0), ln(320, 330, 320, 0)), join(arc(445, 330, 125, 170, PI, 0), ln(570, 330, 570, 0))]],
  n: [500, [ln(70, 500, 70, 0), join(arc(250, 320, 180, 180, PI, 0), ln(430, 320, 430, 0))]],
  o: [540, [arc(270, 250, 205, 250, 0, TAU)]],
  r: [360, [ln(70, 500, 70, 0), arc(240, 300, 170, 200, PI, PI * 0.3)]],
  s: [470, [join(arc(235, 375, 160, 125, PI * 0.15, PI * 1.5), arc(235, 125, 170, 125, PI * 0.5, -PI * 0.85))]],
  t: [360, [join(ln(150, 700, 150, 110), arc(270, 110, 120, 110, PI, PI * 1.55)), ln(40, 500, 310, 500)]],
  u: [500, [join(ln(70, 500, 70, 180), arc(250, 180, 180, 180, PI, TAU)), ln(430, 500, 430, 0)]],
  A: [600, [join(ln(40, 0, 300, 700), ln(300, 700, 560, 0)), ln(135, 250, 465, 250)]],
  E: [520, [join(ln(460, 700, 80, 700), ln(80, 700, 80, 0), ln(80, 0, 460, 0)), ln(80, 360, 400, 360)]],
  H: [600, [ln(80, 700, 80, 0), ln(520, 700, 520, 0), ln(80, 360, 520, 360)]],
  I: [180, [ln(90, 700, 90, 0)]],
  L: [500, [join(ln(80, 700, 80, 0), ln(80, 0, 460, 0))]],
  O: [660, [arc(330, 350, 270, 350, 0, TAU)]],
  T: [600, [ln(40, 700, 560, 700), ln(300, 700, 300, 0)]],
  '0': [520, [arc(260, 350, 190, 350, 0, TAU)]],
  '1': [420, [join(ln(110, 560, 260, 700), ln(260, 700, 260, 0))]],
  '.': [200, [[[100, 30]]]],
  '!': [220, [ln(110, 700, 110, 220), [[110, 30]]]],
};

const hand = (pts: XY[], seed: number): Point[] =>
  pts.map(([x, y], i) => [
    Math.round(x + 5 * Math.sin(i * 0.25 + seed)),
    Math.round(y + 5 * Math.cos(i * 0.21 + seed * 2)),
    +(0.5 + 0.2 * Math.sin(i * 0.18 + seed)).toFixed(2),
  ]);

export function sampleStrokes() {
  const out: Record<string, [number, Stroke[]]> = {};
  for (const [ch, [advance, strokes]] of Object.entries(SEED)) {
    const ci = CHARSET.indexOf(ch);
    out[ch] = [advance, strokes.map((pts, k) => ({ size: 74, points: hand(pts, ci * 3 + k) }))];
  }
  return out;
}
