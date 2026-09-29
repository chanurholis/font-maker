"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, token } from "./Canvas";
import { CHARSET, kind, nameOf, type Kind } from "@/lib/charset";
import { useEditor, type Glyph } from "@/lib/store";
import { drawGlyph } from "@/lib/strokes";

const FILTERS: [Kind | "all", string][] = [["all", "All"], ["upper", "A–Z"], ["lower", "a–z"], ["digit", "0–9"], ["punct", "Punctuation"]];

const Tile = memo(function Tile({ glyph, weight, current, onSelect }: { glyph: Glyph; weight: number; current: boolean; onSelect: (ch: string) => void }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!glyph.strokes.length) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = token("graphite");
        ctx.textAlign = "center";
        ctx.font = `500 ${h * 0.46}px "Hanken Grotesk", system-ui, sans-serif`;
        ctx.fillText(glyph.char, w / 2, h * 0.7);
        return;
      }
      const s = Math.min(h / 1150, w / (glyph.advance + 200));
      drawGlyph(ctx, glyph.strokes, (w - glyph.advance * s) / 2, h / 2 + 300 * s, s, token("ink"), weight);
    },
    [glyph, weight],
  );
  return (
    <button
      type="button"
      data-ch={glyph.char}
      aria-label={nameOf(glyph.char)}
      aria-current={current}
      onClick={() => onSelect(glyph.char)}
      className={`relative aspect-[1/1.15] rounded-md border border-rule hover:border-graphite aria-[current=true]:border-proof aria-[current=true]:shadow-[inset_0_0_0_1px_var(--proof)] ${glyph.strokes.length ? "bg-box" : "bg-sheet"}`}
    >
      <Canvas draw={draw} className="size-full" aria-hidden="true" />
      <span className={`absolute top-[3px] left-[5px] font-mono text-[10px] ${current ? "text-proof" : "text-graphite"}`}>{glyph.char}</span>
    </button>
  );
});

export function GlyphGrid() {
  const glyphs = useEditor(s => s.project!.glyphs);
  const weight = useEditor(s => s.project!.weight);
  const selected = useEditor(s => s.selected);
  const select = useEditor(s => s.select);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const grid = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  // Keep the selected tile visible when moving with the keyboard, but not on first load.
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    grid.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const done = CHARSET.filter(ch => glyphs[ch].strokes.length).length;

  return (
    <aside aria-label="Glyph set" className="min-h-0 overflow-auto border-rule bg-sheet lg:border-r max-lg:order-2 max-lg:max-h-[360px] max-lg:border-t">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-base font-bold">Glyphs</h2>
        <span className="font-mono text-[11.5px] text-graphite">{done} of {CHARSET.length} drawn</span>
      </div>
      <div className="mx-4 h-[3px] overflow-hidden rounded-full bg-rule">
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${(done / CHARSET.length) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-1 px-4 py-3">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>
      <div ref={grid} className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1.5 px-4 pb-4">
        {CHARSET.filter(ch => filter === "all" || kind(ch) === filter).map(ch => (
          <Tile key={ch} glyph={glyphs[ch]} weight={weight} current={ch === selected} onSelect={select} />
        ))}
      </div>
    </aside>
  );
}
