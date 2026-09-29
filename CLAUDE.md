# CLAUDE.md

@AGENTS.md

Guidance for Claude Code when working in this repo.

## Product

**Tinta** (working name, from the Indonesian word for "ink") is a web app for making your own typeface. Users draw glyphs by hand (mouse, trackpad, stylus with pressure), preview the font as they type, and export a real font file for apps, websites, video editors and design tools.

Core loop: **pick a glyph → draw it → see it in the live preview → export.**

### Features

Built (MVP):
- **Glyph set**: A–Z, a–z, 0–9, basic punctuation (86 glyphs). Grid with filters and a progress bar.
- **Draw mode**: freehand brush with pressure, smoothing and size. Eraser, undo/redo, clear, trace-reference letter.
- **Metric guides** on the canvas: ascender, cap height, x-height, baseline, descender, advance box.
- **Per-glyph metrics**: editable advance width; side bearings shown.
- **Live preview**: type any text or pick a sample; size is preview-only, while weight, slant and tracking are font settings that go into the export. Undrawn characters show as dashed boxes with a jump-to-glyph button.
- **Export**: OTF, TTF, WOFF, WOFF2 with usage help per destination (web CSS snippet, design apps, video, mobile).
- **Local projects**: autosaved to IndexedDB. Landing page lists them; "Open the sample font" seeds 25 glyphs.

Phase 2 (only when asked):
- Pen tool (bezier points) for vector glyphs, and SVG import per glyph.
- Handwriting template: print a PDF grid, fill it by hand, upload the scan, auto-slice and vectorize (potrace).
- Kerning pairs editor, ligatures, accented Latin (À, é, ñ…).
- Light/dark toggle (currently follows the system setting only).
- Zip download instead of one download per format.
- Cloud sync / sharing (needs a backend; out of scope until then).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack). APIs differ from older versions: read `node_modules/next/dist/docs/` before using one you're unsure of (see AGENTS.md).
- **Tailwind CSS v4** (tokens live in `app/globals.css`, mapped under `@theme inline`)
- **opentype.js**: builds the font from glyph paths and writes OTF
- **fonteditor-core**: converts the OTF to TTF / WOFF / WOFF2. WOFF2 needs `public/woff2.wasm`, which `postinstall` copies from the package (git-ignored).
- **perfect-freehand**: turns pointer samples (x, y, pressure) into outline polygons
- **zustand** for editor state, persisted with **idb-keyval**

Everything runs client-side. Font generation never touches a server, so user drawings stay on their device.

## Commands

```bash
npm install      # also copies woff2.wasm into public/
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test         # font export round-trip (vitest)
```

## Structure

```
app/
  layout.tsx             fonts (next/font) + globals
  globals.css            design tokens, @theme mapping, btn/chip/label-caps utilities
  page.tsx               landing (server component)
  studio/[id]/page.tsx   awaits params, renders <Studio>
components/
  Home.tsx               landing client parts: CTAs, hero specimen, project list
  Studio.tsx             editor shell: top bar, keyboard shortcuts, layout
  GlyphCanvas.tsx        drawing board + its toolbar and status line
  GlyphGrid.tsx          glyph tiles, filters, progress
  Inspector.tsx          glyph info, brush settings, metrics (also exports <Slider>)
  PreviewStrip.tsx       live text preview + weight/slant/tracking
  ExportDialog.tsx       formats, per-destination help, downloads
  Canvas.tsx             HiDPI canvas that redraws on resize/theme; token() reads CSS vars
  Icon.tsx               inline SVG icons
lib/
  charset.ts             glyph set, names, unicode labels
  store.ts               types, zustand editor store, undo, IndexedDB autosave
  strokes.ts             perfect-freehand outlines, Path2D cache, text layout, drawText
  font.ts                project → opentype.Font → OTF/TTF/WOFF/WOFF2
  sample.ts              sample glyph strokes
  font.test.ts           the one test
design/mockup.html       original static mockup (reference only)
```

Add files only when a feature needs them. No `utils/`, `services/` or `hooks/` folders for a single function.

## Data model

```ts
type Point = [x: number, y: number, pressure: number]   // font units
type Stroke = { points: Point[]; size: number }

type Glyph = {
  char: string
  unicode: number
  advance: number          // advance width in font units
  strokes: Stroke[]
}

type FontProject = {
  id: string
  family: string           // e.g. "Tinta Hand"
  style: 'Regular' | 'Bold' | 'Italic'
  upm: 1000
  ascender: 800
  capHeight: 700
  xHeight: 500
  descender: -200
  weight: number           // stroke size multiplier (render + export)
  slant: number            // degrees, applied as a shear on export
  tracking: number         // font units added to every advance
  glyphs: Record<string, Glyph>   // keyed by char
  updatedAt: number
}
```

Rules:
- **Raw strokes are the source of truth.** Outlines are derived at render/export time. This keeps weight changes non-destructive.
- **Coordinates are font units, y-up, origin on the baseline.** Flip to screen space only in the canvas render. Never store screen pixels.
- **Never mutate strokes arrays.** The store replaces them; `lib/strokes.ts` caches Path2D per array in a WeakMap, so mutation shows stale drawings.
- Empty glyphs are skipped on export; `.notdef` and `space` are always emitted.
- Canvas drawing reads colors through `token()` so both themes work; no literal colors in draw code.

## Font export notes

- Build with `new opentype.Font({ familyName, styleName, unitsPerEm, ascender, descender, glyphs })`. Glyph 0 must be `.notdef`.
- perfect-freehand returns polygons; each becomes a closed `lineTo` path. `outline()` forces counter-clockwise winding so overlapping strokes fill under the nonzero rule. If a target app shows holes, union contours before export (`polygon-clipping`).
- Coordinates are rounded to integers before writing.
- opentype.js 2.x: read names with `font.getEnglishName('fontFamily')`, not `font.names.fontFamily.en`.
- WOFF is written uncompressed (fonteditor-core needs a `deflate` option, e.g. `pako.deflate`, to compress it).
- `lib/font.test.ts` builds a two-glyph font, exports all four formats and parses them back. Keep it passing.

## Design system

Direction: a drafting table for type. Cool, precise, calm. Graph-paper canvas, ink-dark strokes, one magenta accent borrowed from printers' proof marks. Mockup: `design/mockup.html`.

Tokens (`app/globals.css`; dark values follow `prefers-color-scheme`). Use them as Tailwind colors: `bg-paper`, `text-graphite`, `border-rule`, `bg-proof-soft`…. Also defined: `box` (drawn-glyph / advance-box tint), `hover`, `proof-soft`, `on-proof`, `warn`, `warn-soft`.

| Token      | Light     | Dark      | Use |
|------------|-----------|-----------|-----|
| `paper`    | `#EDF0F3` | `#101318` | app background |
| `sheet`    | `#FFFFFF` | `#181C23` | panels, canvas |
| `ink`      | `#141821` | `#E8ECF2` | text, strokes |
| `graphite` | `#5E6878` | `#8D97A8` | secondary text, icons |
| `rule`     | `#D5DBE3` | `#2A303B` | borders, grid lines |
| `proof`    | `#D12A6B` | `#FF5C98` | accent: selection, active tool, primary button |
| `guide`    | `#2F7FA8` | `#5DB4DE` | metric guide lines |

Type:
- Display: **Bricolage Grotesque** (wordmark, headings, big glyph labels). Use sparingly.
- UI/body: **Hanken Grotesk**.
- Data: **IBM Plex Mono** for font units, unicode (`U+0061`), metrics.

UI rules:
- Editor is a three-pane shell: glyph grid (left), canvas (center), inspector (right), preview strip (bottom). Below `lg` everything stacks: canvas first, then glyphs, then inspector.
- The canvas is the hero. Chrome stays quiet: hairline `rule` borders, no heavy shadows, small radii (6px).
- Accent is for the one active thing (selected glyph, current tool, primary action). Never decorative.
- Every tool has a keyboard shortcut (B brush, E eraser, [ ] size, G grid, T trace, ⌘Z / ⇧⌘Z, ←/→ previous/next glyph) and a visible focus ring.
- Canvas uses Pointer Events with `touch-action: none` so stylus and touch work.
- Respect `prefers-reduced-motion`.

## Working rules

- Keep it lean: no abstractions until a second use exists. Reach for the platform (Canvas 2D, Pointer Events, `<input type="range">`, `<dialog>`) before adding a dependency.
- The editor page is a client component. Keep server components for the landing page only.
- Don't add a backend, auth or analytics unless asked.
