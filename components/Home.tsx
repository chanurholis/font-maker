"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Canvas, token } from "./Canvas";
import { Icon } from "./Icon";
import { CHARSET } from "@/lib/charset";
import { sampleStrokes } from "@/lib/sample";
import { deleteProject, listProjects, newProject, saveProject, type FontProject } from "@/lib/store";
import { drawText } from "@/lib/strokes";

const SAMPLE = newProject("Tinta Hand", sampleStrokes()).glyphs;

function useCreate() {
  const router = useRouter();
  return async (sample: boolean) => {
    const p = sample ? newProject("Tinta Hand", sampleStrokes()) : newProject();
    await saveProject(p);
    router.push(`/studio/${p.id}`);
  };
}

export function NewFontActions() {
  const create = useCreate();
  return (
    <div className="flex flex-wrap gap-3">
      <button className="btn btn-primary h-11 px-5 text-sm" onClick={() => create(false)}>
        <Icon name="plus" /> Start a blank font
      </button>
      <button className="btn h-11 px-5 text-sm" onClick={() => create(true)}>
        Open the sample font
      </button>
    </div>
  );
}

/** Hero specimen: the sample glyphs set on real metric guides. */
export function Specimen() {
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // "Hello Tinta" is ~4.5 em wide; keep ~100px on the right for the guide labels.
    const size = Math.min((w - 132) / 4.5, h / 1.25);
    const pad = 20;
    const top = (h - size) / 2 - size * 0.05;
    const base = top + size * 0.8;
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "right";
    for (const [label, v] of [["cap height 700", 700], ["x-height 500", 500], ["baseline 0", 0]] as const) {
      const y = Math.round(base - (v * size) / 1000) + 0.5;
      ctx.strokeStyle = ctx.fillStyle = token("guide");
      ctx.setLineDash(v ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillText(label, w - 12, y - 5);
    }
    ctx.textAlign = "left";
    ctx.setLineDash([]);
    ctx.translate(0, top - pad);
    drawText(ctx, SAMPLE, "Hello Tinta", { size, width: w + size * 10, pad, color: token("ink") });
  }, []);
  return (
    <div className="relative h-72 overflow-hidden rounded-md border border-rule bg-sheet sm:h-80">
      <Canvas draw={draw} className="size-full" aria-label="Hello Tinta, drawn by hand in the sample font" />
      <span className="absolute right-3 bottom-2 font-mono text-[11px] text-graphite">Tinta Hand · 25 glyphs</span>
    </div>
  );
}

function ProjectCard({ p, onDelete }: { p: FontProject; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const drawn = CHARSET.filter(ch => p.glyphs[ch]?.strokes.length);
  const text = drawn.length ? drawn.slice(0, 6).join("") : "Aa";
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const size = h * 0.62;
      ctx.translate(0, (h - size) / 2 - 16);
      drawText(ctx, p.glyphs, text, {
        size, width: w * 4, pad: 16, color: token("ink"), missingColor: token("rule"),
        weight: p.weight, slant: p.slant, tracking: p.tracking,
      });
    },
    [p, text],
  );
  return (
    <li className="group flex flex-col overflow-hidden rounded-md border border-rule bg-sheet hover:border-graphite">
      <Link href={`/studio/${p.id}`} className="flex flex-col">
        <Canvas draw={draw} className="h-28 w-full bg-box" aria-hidden="true" />
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
          <span className="truncate font-semibold">{p.family}</span>
          <span className="shrink-0 font-mono text-xs text-graphite">
            {drawn.length}/{CHARSET.length}
          </span>
        </div>
      </Link>
      <div className="flex items-center justify-between px-4 pt-1 pb-3 text-xs text-graphite">
        <span>Edited {new Date(p.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
        {confirming ? (
          <span className="flex gap-3">
            <button className="font-semibold text-proof" onClick={onDelete}>Delete font</button>
            <button onClick={() => setConfirming(false)}>Keep</button>
          </span>
        ) : (
          <button className="opacity-70 hover:text-ink hover:opacity-100" onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
    </li>
  );
}

export function ProjectList() {
  const [projects, setProjects] = useState<FontProject[] | null>(null);
  useEffect(() => {
    listProjects().then(setProjects, () => setProjects([]));
  }, []);

  if (!projects?.length) return null;
  return (
    <section className="grid gap-4">
      <h2 className="label-caps">Your fonts</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => (
          <ProjectCard
            key={p.id}
            p={p}
            onDelete={async () => {
              await deleteProject(p.id);
              setProjects(ps => ps!.filter(x => x.id !== p.id));
            }}
          />
        ))}
      </ul>
    </section>
  );
}
