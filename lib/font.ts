import { Font, Glyph, Path } from 'opentype.js';
import { createFont, woff2 } from 'fonteditor-core';
import { outline, SPACE_ADVANCE } from './strokes';
import type { FontProject, Stroke } from './store';

export type Format = 'otf' | 'ttf' | 'woff' | 'woff2';

function strokesPath(strokes: Stroke[], weight: number, slantDeg: number) {
  const path = new Path();
  const tan = Math.tan((slantDeg * Math.PI) / 180);
  for (const s of strokes) {
    const poly = outline(s, weight).map(([x, y]) => [Math.round(x + y * tan), Math.round(y)]);
    if (poly.length < 3) continue;
    path.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
    path.close();
  }
  return path;
}

function notdefPath(p: FontProject) {
  const path = new Path();
  const box = (x0: number, y0: number, x1: number, y1: number) => {
    path.moveTo(x0, y0); path.lineTo(x1, y0); path.lineTo(x1, y1); path.lineTo(x0, y1); path.close();
  };
  box(50, 0, 450, p.capHeight);
  // inner box wound the other way cuts a hole
  path.moveTo(100, 50); path.lineTo(100, p.capHeight - 50); path.lineTo(400, p.capHeight - 50); path.lineTo(400, 50); path.close();
  return path;
}

const glyphName = (ch: string) =>
  /[A-Za-z]/.test(ch) ? ch : 'uni' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');

/** Project → opentype.js Font. Empty glyphs are left out; .notdef and space are always included. */
export function buildFont(p: FontProject) {
  const glyphs = [
    new Glyph({ name: '.notdef', advanceWidth: 500, path: notdefPath(p) }),
    new Glyph({ name: 'space', unicode: 32, advanceWidth: SPACE_ADVANCE + p.tracking, path: new Path() }),
    ...Object.values(p.glyphs)
      .filter(g => g.strokes.length)
      .map(g => new Glyph({
        name: glyphName(g.char),
        unicode: g.unicode,
        advanceWidth: Math.max(0, g.advance + p.tracking),
        path: strokesPath(g.strokes, p.weight, p.slant),
      })),
  ];
  return new Font({
    familyName: p.family.trim() || 'Untitled',
    styleName: p.style,
    unitsPerEm: p.upm,
    ascender: p.ascender,
    descender: p.descender,
    glyphs,
  });
}

/** Build the font and encode it. OTF comes from opentype.js; the others are converted by fonteditor-core. */
export async function exportFont(p: FontProject, format: Format): Promise<ArrayBuffer> {
  const otf = buildFont(p).toArrayBuffer();
  if (format === 'otf') return otf;
  if (format === 'woff2') await woff2.init(typeof window === 'undefined' ? undefined : '/woff2.wasm');
  // ponytail: WOFF is written uncompressed (no deflate option); pass pako.deflate if file size matters
  const out = createFont(otf, { type: 'otf' }).write({ type: format });
  if (out instanceof ArrayBuffer) return out;
  if (typeof out === 'string') throw new Error(`Unexpected string output for ${format}`);
  return new Uint8Array(out).buffer;
}

export const fileName = (p: FontProject, format: Format) =>
  `${p.family.replace(/[^A-Za-z0-9]/g, '') || 'Untitled'}-${p.style}.${format}`;
