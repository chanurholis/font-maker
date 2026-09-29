"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Canvas, token } from "./Canvas";
import { Icon, type IconName } from "./Icon";
import { CHARSET, unicodeLabel } from "@/lib/charset";
import { useEditor, type Point, type Stroke } from "@/lib/store";
import { drawGlyph } from "@/lib/strokes";

function ToolButton({ icon, label, pressed, onClick }: { icon: IconName; label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[5px] text-graphite hover:bg-hover hover:text-ink aria-pressed:bg-proof-soft aria-pressed:text-proof"
    >
      <Icon name={icon} />
    </button>
  );
}

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div role="group" aria-label={label} className="flex gap-0.5 rounded-lg border border-rule bg-sheet p-[3px]">
    {children}
  </div>
);

function Toolbar() {
  const s = useEditor();
  const empty = !s.project!.glyphs[s.selected].strokes.length;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
      <Group label="Tools">
        <ToolButton icon="brush" label="Brush (B)" pressed={s.tool === "brush"} onClick={() => s.set({ tool: "brush" })} />
        <ToolButton icon="eraser" label="Eraser (E)" pressed={s.tool === "eraser"} onClick={() => s.set({ tool: "eraser" })} />
      </Group>
      <Group label="History">
        <ToolButton icon="undo" label="Undo (⌘Z)" onClick={s.undo} />
        <ToolButton icon="redo" label="Redo (⇧⌘Z)" onClick={s.redo} />
        <ToolButton icon="trash" label="Clear glyph" onClick={() => !empty && s.setStrokes(s.selected, [])} />
      </Group>
      <Group label="View">
        <ToolButton icon="grid" label="Graph grid (G)" pressed={s.showGrid} onClick={() => s.set({ showGrid: !s.showGrid })} />
        <ToolButton icon="guides" label="Metric guides" pressed={s.showGuides} onClick={() => s.set({ showGuides: !s.showGuides })} />
        <ToolButton icon="eye" label="Trace reference letter (T)" pressed={s.showTrace} onClick={() => s.set({ showTrace: !s.showTrace })} />
      </Group>
      <span className="ml-auto font-mono text-[11.5px] text-graphite max-sm:hidden">{s.project!.upm} UPM · fit</span>
    </div>
  );
}

export function GlyphCanvas() {
  const { project, selected, tool, brushSize, smoothing, usePressure, showGrid, showGuides, showTrace, step } = useEditor();
  const p = project!;
  const glyph = p.glyphs[selected];
  const [live, setLive] = useState<Stroke | null>(null);
  const [coords, setCoords] = useState<Point | null>(null);
  const [source, setSource] = useState("mouse");
  const view = useRef({ s: 1, ox: 0, oy: 0 });
  const erasing = useRef<{ recorded: boolean } | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const adv = glyph.advance;
      const s = Math.min(h / 1250, w / (adv + 800));
      const ox = (w - adv * s) / 2, oy = h / 2 + 300 * s;
      view.current = { s, ox, oy };
      const X = (x: number) => ox + x * s, Y = (y: number) => oy - y * s;

      ctx.fillStyle = token("box");
      ctx.fillRect(X(0), Y(p.ascender), adv * s, (p.ascender - p.descender) * s);

      if (showGrid) {
        ctx.strokeStyle = token("rule");
        ctx.lineWidth = 1;
        const line = (x0: number, y0: number, x1: number, y1: number, major: boolean) => {
          ctx.globalAlpha = major ? 0.9 : 0.4;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        };
        for (let u = Math.floor(-ox / s / 50) * 50; X(u) <= w; u += 50) line(Math.round(X(u)) + 0.5, 0, Math.round(X(u)) + 0.5, h, u % 100 === 0);
        for (let u = Math.floor((oy - h) / s / 50) * 50; u <= oy / s; u += 50) line(0, Math.round(Y(u)) + 0.5, w, Math.round(Y(u)) + 0.5, u % 100 === 0);
        ctx.globalAlpha = 1;
      }

      if (showGuides) {
        ctx.strokeStyle = ctx.fillStyle = token("guide");
        ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
        const guides = [["Ascender", p.ascender], ["Cap height", p.capHeight], ["x-height", p.xHeight], ["Baseline", 0], ["Descender", p.descender]] as const;
        for (const [name, v] of guides) {
          ctx.setLineDash(v === 0 ? [] : [5, 5]);
          ctx.lineWidth = v === 0 ? 1.5 : 1;
          const y = Math.round(Y(v)) + 0.5;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          ctx.fillText(`${name}  ${v}`, 12, y - 6);
        }
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        for (const v of [0, adv]) {
          const x = Math.round(X(v)) + 0.5;
          ctx.globalAlpha = 0.75;
          ctx.beginPath(); ctx.moveTo(x, Y(p.ascender + 60)); ctx.lineTo(x, Y(p.descender - 60)); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillText(String(v), x + 5, Y(p.descender - 60) - 4);
        }
      }

      if (showTrace) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = token("ink");
        ctx.font = `${1000 * s}px Georgia, "Times New Roman", serif`;
        ctx.fillText(selected, X(adv / 2) - ctx.measureText(selected).width / 2, Y(0));
        ctx.globalAlpha = 1;
      }

      const ink = token("ink");
      drawGlyph(ctx, glyph.strokes, ox, oy, s, ink, p.weight);
      if (live) drawGlyph(ctx, [live], ox, oy, s, ink, p.weight);
    },
    [glyph, live, selected, showGrid, showGuides, showTrace, p.ascender, p.capHeight, p.xHeight, p.descender, p.weight],
  );

  const toFont = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    const { s, ox, oy } = view.current;
    const pressure = !usePressure || e.pointerType === "mouse" ? 0.5 : e.pressure || 0.5;
    return [Math.round((e.clientX - r.left - ox) / s), Math.round((oy - (e.clientY - r.top)) / s), +pressure.toFixed(2)];
  };

  const eraseAt = (pt: Point) => {
    const { project, selected: ch, setStrokes } = useEditor.getState();
    const strokes = project!.glyphs[ch].strokes;
    const r = Math.max(40, brushSize * 0.6);
    const keep = strokes.filter(s => !s.points.some(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < r));
    if (keep.length === strokes.length || !erasing.current) return;
    setStrokes(ch, keep, !erasing.current.recorded);
    erasing.current.recorded = true;
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSource(e.pointerType);
    const pt = toFont(e);
    if (tool === "brush") setLive({ size: brushSize, points: [pt] });
    else { erasing.current = { recorded: false }; eraseAt(pt); }
  };

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const pt = toFont(e);
    setCoords(pt);
    if (live) {
      const last = live.points[live.points.length - 1];
      const k = 1 - smoothing * 0.8;
      const q: Point = [Math.round(last[0] + (pt[0] - last[0]) * k), Math.round(last[1] + (pt[1] - last[1]) * k), pt[2]];
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) >= 3) setLive({ ...live, points: [...live.points, q] });
    } else if (erasing.current) eraseAt(pt);
  };

  const onUp = () => {
    if (live) {
      const { project, setStrokes } = useEditor.getState();
      setStrokes(selected, [...project!.glyphs[selected].strokes, live]);
      setLive(null);
    }
    erasing.current = null;
  };

  const index = CHARSET.indexOf(selected);

  return (
    <section aria-label="Drawing board" className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] max-lg:order-1 max-lg:grid-rows-[auto_min(70vh,480px)_auto]">
      <Toolbar />
      <div className="relative mx-4 min-h-0 overflow-hidden rounded-md border border-rule bg-sheet">
        <Canvas
          draw={draw}
          aria-label={`Drawing board for ${selected}`}
          className={`size-full touch-none ${tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setCoords(null)}
        />
        <div className="pointer-events-none absolute top-3 right-4 text-right">
          <strong className="block font-display text-[40px] leading-none font-bold">{selected}</strong>
          <span className="font-mono text-[11px] text-graphite">{unicodeLabel(selected)}</span>
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border border-rule bg-sheet p-[3px]">
          <ToolButton icon="left" label="Previous glyph (←)" onClick={() => step(-1)} />
          <span className="min-w-[7ch] text-center font-mono text-[11.5px] text-graphite">
            {index + 1} / {CHARSET.length}
          </span>
          <ToolButton icon="right" label="Next glyph (→)" onClick={() => step(1)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-2 pb-2.5 font-mono text-[11.5px] text-graphite">
        <span>{tool === "brush" ? "Brush" : "Eraser"} · {brushSize} u</span>
        <span>{coords ? `x ${coords[0]}  y ${coords[1]}` : "x —  y —"}</span>
        <span>Pressure: {source === "pen" ? "stylus" : source === "touch" ? "touch" : "mouse (constant)"}</span>
      </div>
    </section>
  );
}
