import { expect, test } from 'vitest';
import { parse } from 'opentype.js';
import { exportFont } from './font';
import { newProject } from './store';

const project = newProject('Test Hand', {
  A: [600, [{ size: 70, points: [[40, 0, 0.5], [300, 700, 0.5], [560, 0, 0.5]] }]],
  b: [480, [{ size: 70, points: [[80, 750, 0.5], [80, 0, 0.5]] }]],
});

test('exported fonts round-trip', async () => {
  const otf = parse(await exportFont(project, 'otf'));
  expect(otf.numGlyphs).toBe(4); // .notdef, space, A, b
  expect(otf.getEnglishName('fontFamily')).toBe('Test Hand');
  expect(otf.charToGlyph('A').advanceWidth).toBe(600);
  expect(otf.charToGlyph('b').getBoundingBox().y2).toBeGreaterThan(700);

  const ttf = parse(await exportFont(project, 'ttf'));
  expect(ttf.outlinesFormat).toBe('truetype');
  expect(ttf.charToGlyph('b').advanceWidth).toBe(480);

  const w2 = new Uint8Array(await exportFont(project, 'woff2'));
  expect(String.fromCharCode(...w2.slice(0, 4))).toBe('wOF2');
  const w1 = new Uint8Array(await exportFont(project, 'woff'));
  expect(String.fromCharCode(...w1.slice(0, 4))).toBe('wOFF');
});
