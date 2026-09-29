"use client";

import { nameOf, unicodeLabel } from "@/lib/charset";
import { useEditor } from "@/lib/store";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-3 border-b border-rule p-4">
    <h3 className="label-caps">{title}</h3>
    {children}
  </section>
);

const Field = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div className="grid min-w-0 gap-1">
    <span className="text-xs text-graphite">{label}</span>
    {children}
  </div>
);

const readout = "flex h-8 items-center rounded-md bg-box px-2 font-mono text-[13px] tabular-nums text-graphite";

export function Slider({ id, label, value, display, min, max, step = 1, onChange }: {
  id: string; label: string; value: number; display: string; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs text-graphite">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono text-ink">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className="w-full" />
    </div>
  );
}

const SHORTCUTS = [["B", "Brush"], ["E", "Eraser"], ["[ ]", "Brush size"], ["← →", "Previous / next glyph"], ["⌘Z", "Undo, add ⇧ to redo"], ["G", "Toggle grid"], ["T", "Toggle trace letter"]];

export function Inspector() {
  const { project, selected, brushSize, smoothing, usePressure, set, setAdvance } = useEditor();
  const p = project!;
  const g = p.glyphs[selected];
  const xs = g.strokes.flatMap(s => s.points.map(pt => pt[0]));
  const half = g.strokes.length ? (Math.max(...g.strokes.map(s => s.size)) * p.weight) / 2 : 0;

  const commitAdvance = (el: HTMLInputElement) => {
    const v = Math.round(+el.value);
    if (!Number.isFinite(v) || !el.value) { el.value = String(g.advance); return; }
    const clamped = Math.min(1400, Math.max(50, v));
    el.value = String(clamped);
    if (clamped !== g.advance) setAdvance(selected, clamped);
  };

  return (
    <aside aria-label="Inspector" className="min-h-0 overflow-auto border-rule bg-sheet lg:border-l max-lg:order-3 max-lg:border-t">
      <Section title="Glyph">
        <div className="flex items-center gap-3.5">
          <div className="grid h-[72px] w-16 shrink-0 place-items-center rounded-md border border-rule bg-box font-display text-[44px] leading-none font-medium">
            {selected}
          </div>
          <div>
            <b className="block font-semibold">{nameOf(selected)}</b>
            <span className="font-mono text-xs text-graphite">{unicodeLabel(selected)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={<label htmlFor="advance">Advance width</label>}>
            <input
              key={`${selected}:${g.advance}`}
              id="advance"
              type="number"
              min={50}
              max={1400}
              step={10}
              defaultValue={g.advance}
              onBlur={e => commitAdvance(e.currentTarget)}
              onKeyDown={e => e.key === "Enter" && commitAdvance(e.currentTarget)}
              className="h-8 w-full rounded-md border border-rule bg-sheet px-2 font-mono text-[13px] tabular-nums"
            />
          </Field>
          <Field label="Strokes"><output className={readout}>{g.strokes.length}</output></Field>
          <Field label="Left bearing"><output className={readout}>{xs.length ? Math.round(Math.min(...xs) - half) : "—"}</output></Field>
          <Field label="Right bearing"><output className={readout}>{xs.length ? Math.round(g.advance - Math.max(...xs) - half) : "—"}</output></Field>
        </div>
      </Section>

      <Section title="Brush">
        <Slider id="brush-size" label="Size" value={brushSize} display={`${brushSize} u`} min={20} max={160} onChange={v => set({ brushSize: v })} />
        <Slider id="smoothing" label="Smoothing" value={Math.round(smoothing * 100)} display={`${Math.round(smoothing * 100)}%`} min={0} max={100} onChange={v => set({ smoothing: v / 100 })} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={usePressure} onChange={e => set({ usePressure: e.target.checked })} className="size-4" />
          Use stylus pressure
        </label>
      </Section>

      <Section title="Font metrics">
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13px]">
          {([["Units per em", p.upm], ["Ascender", p.ascender], ["Cap height", p.capHeight], ["x-height", p.xHeight], ["Descender", p.descender]] as const).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-graphite">{k}</dt>
              <dd className="text-right font-mono tabular-nums">{v < 0 ? `−${-v}` : v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Shortcuts">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-graphite">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="contents">
              <kbd className="justify-self-start rounded border border-b-2 border-rule bg-paper px-1.5 font-mono text-[11px] text-ink">{k}</kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  );
}
