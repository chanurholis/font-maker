"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExportDialog } from "./ExportDialog";
import { GlyphCanvas } from "./GlyphCanvas";
import { GlyphGrid } from "./GlyphGrid";
import { Icon } from "./Icon";
import { Inspector } from "./Inspector";
import { PreviewStrip } from "./PreviewStrip";
import { loadProject, useEditor, type FontStyle } from "@/lib/store";

function useShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea, dialog")) return;
      const s = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo(); else s.undo();
        return;
      }
      if (mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "b") s.set({ tool: "brush" });
      else if (k === "e") s.set({ tool: "eraser" });
      else if (k === "g") s.set({ showGrid: !s.showGrid });
      else if (k === "t") s.set({ showTrace: !s.showTrace });
      else if (k === "[") s.set({ brushSize: Math.max(20, s.brushSize - 10) });
      else if (k === "]") s.set({ brushSize: Math.min(160, s.brushSize + 10) });
      else if (e.key === "ArrowRight") { e.preventDefault(); s.step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); s.step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function Studio({ id }: { id: string }) {
  const project = useEditor(s => s.project);
  const saved = useEditor(s => s.saved);
  const { open, updateProject } = useEditor();
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ready = project?.id === id;

  useEffect(() => {
    loadProject(id).then(
      p => (p ? open(p) : setNotFound(true)),
      () => setNotFound(true),
    );
  }, [id, open]);

  useShortcuts(ready);

  if (notFound) {
    return (
      <main className="grid min-h-dvh place-items-center p-4 text-center">
        <div className="grid gap-3">
          <h1 className="font-display text-2xl font-bold">This font isn’t in this browser</h1>
          <p className="max-w-[44ch] text-graphite">Fonts are saved only on the device where you made them. Open it from that browser, or start a new one.</p>
          <Link href="/" className="btn btn-primary justify-self-center">Back to your fonts</Link>
        </div>
      </main>
    );
  }
  if (!ready) return <main className="grid min-h-dvh place-items-center text-graphite">Opening font…</main>;

  return (
    <div className="grid lg:h-dvh lg:grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-sheet px-4 py-2.5">
        <Link href="/" className="font-display text-[23px] leading-none font-bold tracking-tight" title="All fonts">
          Tinta<b className="text-proof">.</b>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={project.family}
            onChange={e => updateProject({ family: e.target.value })}
            onBlur={e => !e.target.value.trim() && updateProject({ family: "Untitled Hand" })}
            aria-label="Font family name"
            spellCheck={false}
            className="w-[13ch] min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold hover:border-rule"
          />
          <select
            value={project.style}
            onChange={e => updateProject({ style: e.target.value as FontStyle })}
            aria-label="Font style"
            className="rounded-full border border-rule bg-sheet px-2 py-0.5 font-mono text-[11.5px] text-graphite"
          >
            <option>Regular</option>
            <option>Bold</option>
            <option>Italic</option>
          </select>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-graphite max-sm:hidden">
          <span className={`size-1.5 rounded-full ${saved ? "bg-guide" : "bg-warn"}`} />
          {saved ? "Saved in this browser" : "Saving…"}
        </span>
        <button className="btn btn-primary ml-auto" onClick={() => setExporting(true)}>
          <Icon name="download" />
          <span className="max-sm:hidden">Export font</span>
        </button>
      </header>

      <main className="grid min-h-0 lg:grid-cols-[272px_minmax(0,1fr)_292px]">
        <GlyphGrid />
        <GlyphCanvas />
        <Inspector />
      </main>

      <PreviewStrip />
      <ExportDialog open={exporting} onClose={() => setExporting(false)} />
    </div>
  );
}
