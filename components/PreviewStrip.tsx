"use client";

import { useCallback, useState } from "react";
import { Canvas, token } from "./Canvas";
import { Slider } from "./Inspector";
import { nameOf } from "@/lib/charset";
import { useEditor } from "@/lib/store";
import { drawText } from "@/lib/strokes";

const SAMPLES = [
  ["Hello Tinta", "Hello Tinta"],
  ["Words", "the tide on the hall"],
  ["Pangram", "The quick brown fox jumps over the lazy dog"],
  ["Figures", "0123456789 !?&@#%"],
];

export function PreviewStrip() {
  const p = useEditor(s => s.project!);
  const { updateProject, select } = useEditor();
  const [text, setText] = useState("Hello Tinta");
  const [size, setSize] = useState(64);
  const [height, setHeight] = useState(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number) => {
      const used = drawText(ctx, p.glyphs, text, {
        size, width: w, pad: 20, color: token("ink"), missingColor: token("graphite"),
        weight: p.weight, slant: p.slant, tracking: p.tracking, ascender: p.ascender, capHeight: p.capHeight,
      });
      const next = Math.ceil(used + 28);
      if (next !== height) setHeight(next);
    },
    [p, text, size, height],
  );

  const missing = [...new Set([...text])].filter(ch => !/\s/.test(ch) && !p.glyphs[ch]?.strokes.length);

  return (
    <footer aria-label="Live preview" className="grid border-t border-rule bg-sheet lg:h-56 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid content-start gap-2.5 overflow-auto border-rule px-4 py-3.5 lg:border-r max-lg:border-b">
        <h2 className="font-display text-sm font-bold">Live preview</h2>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Preview text"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-rule bg-paper px-2.5 text-[15px]"
        />
        <div className="flex flex-wrap gap-1">
          {SAMPLES.map(([label, value]) => (
            <button key={label} type="button" className="chip" aria-pressed={text === value} onClick={() => setText(value)}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
          <Slider id="pv-size" label="Size" value={size} display={`${size} px`} min={20} max={140} onChange={setSize} />
          <Slider id="pv-weight" label="Weight" value={Math.round(p.weight * 100)} display={`${p.weight.toFixed(2)}×`} min={50} max={180} onChange={v => updateProject({ weight: v / 100 })} />
          <Slider id="pv-slant" label="Slant" value={p.slant} display={`${p.slant}°`} min={0} max={16} onChange={v => updateProject({ slant: v })} />
          <Slider id="pv-tracking" label="Tracking" value={p.tracking} display={`${p.tracking} u`} min={-60} max={200} step={10} onChange={v => updateProject({ tracking: v })} />
        </div>
        <p className="text-xs text-graphite">Weight, slant and tracking are saved into the exported font.</p>
      </div>
      <div className="relative min-w-0 overflow-auto max-lg:h-56">
        <Canvas draw={draw} style={{ height: Math.max(height, 160) }} className="block w-full" aria-label={`Preview: ${text}`} />
        {missing.length > 0 && (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-1 bg-sheet px-4 py-2 text-xs text-graphite">
            Not drawn yet ({missing.length}):
            {missing.slice(0, 12).map(ch =>
              p.glyphs[ch] ? (
                <button
                  key={ch}
                  type="button"
                  title={`Draw ${nameOf(ch)}`}
                  onClick={() => select(ch)}
                  className="rounded border border-dashed border-graphite px-1.5 font-mono hover:border-proof hover:text-proof"
                >
                  {ch}
                </button>
              ) : (
                <span key={ch} title="Not in the glyph set yet" className="px-1 font-mono line-through">{ch}</span>
              ),
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
