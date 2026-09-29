"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { CHARSET } from "@/lib/charset";
import { exportFont, fileName, type Format } from "@/lib/font";
import { useEditor, type FontProject } from "@/lib/store";

const FORMATS: [Format, string][] = [
  ["otf", "Figma, Adobe apps, macOS"],
  ["ttf", "Widest support: Windows, Android, video editors"],
  ["woff2", "Websites, smallest file"],
  ["woff", "Websites, older browsers"],
];

const TABS = ["Website", "Design apps", "Video", "Mobile apps"] as const;
type Tab = (typeof TABS)[number];

function cssSnippet(p: FontProject, formats: Format[]) {
  const web = (["woff2", "woff", "ttf"] as const).filter(f => formats.includes(f));
  const kind = { woff2: "woff2", woff: "woff", ttf: "truetype" };
  const src = (web.length ? web : (["woff2"] as const)).map(f => `url("/fonts/${fileName(p, f)}") format("${kind[f]}")`);
  return `@font-face {
  font-family: "${p.family}";
  src: ${src.join(",\n       ")};
  font-weight: ${p.style === "Bold" ? 700 : 400};
  font-style: ${p.style === "Italic" ? "italic" : "normal"};
  font-display: swap;
}

h1 { font-family: "${p.family}", system-ui, sans-serif; }`;
}

function appSnippet(p: FontProject) {
  const res = fileName(p, "ttf").replace(/\.ttf$/, "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `<!-- Android: res/font/${res}.ttf -->
<TextView android:fontFamily="@font/${res}" />

// iOS (SwiftUI), after adding the .ttf to "Fonts provided by application"
Text("Hello").font(.custom("${p.family}", size: 32))`;
}

function download(buf: ArrayBuffer, name: string, format: Format) {
  const url = URL.createObjectURL(new Blob([buf], { type: `font/${format}` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-rule bg-paper p-3 pr-20 font-mono text-xs leading-relaxed">{text}</pre>
      <button
        type="button"
        className="btn absolute top-1.5 right-1.5 h-7 px-2.5 text-xs"
        onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const p = useEditor(s => s.project!);
  const select = useEditor(s => s.select);
  const [formats, setFormats] = useState<Format[]>(["otf", "ttf", "woff2"]);
  const [tab, setTab] = useState<Tab>("Website");
  const [status, setStatus] = useState<{ kind: "idle" | "working" | "done" | "error"; text?: string }>({ kind: "idle" });

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const drawn = CHARSET.filter(ch => p.glyphs[ch].strokes.length).length;
  const empty = CHARSET.length - drawn;

  const run = async () => {
    setStatus({ kind: "working", text: "Building your font…" });
    try {
      for (const f of formats) download(await exportFont(p, f), fileName(p, f), f);
      setStatus({ kind: "done", text: `Saved ${formats.length} ${formats.length === 1 ? "file" : "files"} to your downloads.` });
    } catch (e) {
      console.error(e);
      setStatus({ kind: "error", text: `Export failed: ${e instanceof Error ? e.message : String(e)}. Try again, or export OTF only.` });
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={() => { onClose(); setStatus({ kind: "idle" }); }}
      aria-labelledby="export-title"
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(660px,calc(100vw-32px))] rounded-[10px] border border-rule bg-sheet p-0 text-ink"
    >
      <div className="grid gap-5 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="export-title" className="font-display text-[22px] leading-tight font-bold tracking-tight text-balance">Export {p.family}</h2>
            <p className="mt-1 text-[13px] text-graphite">Your font is built in this browser. Nothing is uploaded.</p>
          </div>
          <button type="button" className="btn w-[34px] px-0 text-graphite" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        {empty > 0 && (
          <div className="flex flex-wrap items-start gap-2.5 rounded-md bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
            <Icon name="alert" />
            <span className="min-w-0 flex-1">{empty} of {CHARSET.length} glyphs are empty and will be left out of the font.</span>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => { const ch = CHARSET.find(c => !p.glyphs[c].strokes.length); if (ch) select(ch); onClose(); }}
            >
              Draw next empty glyph
            </button>
          </div>
        )}

        <fieldset>
          <legend className="label-caps mb-2">Formats</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMATS.map(([f, desc]) => (
              <label key={f} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-rule px-3 py-2.5 has-checked:border-proof has-checked:bg-proof-soft">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={formats.includes(f)}
                  onChange={e => setFormats(fs => (e.target.checked ? [...fs, f] : fs.filter(x => x !== f)))}
                />
                <span>
                  <b className="block font-mono text-[13px] font-medium">.{f}</b>
                  <span className="text-[12.5px] text-graphite">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <h3 className="label-caps mb-2">Where will you use it?</h3>
          <div role="tablist" className="flex gap-0.5 overflow-x-auto border-b border-rule">
            {TABS.map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="-mb-px border-b-2 border-transparent px-3 py-2 text-[13px] font-semibold whitespace-nowrap text-graphite aria-selected:border-proof aria-selected:text-ink"
              >
                {t}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="grid gap-2.5 pt-3 text-[13.5px]">
            {tab === "Website" && (
              <>
                <p>Put the files in <code className="font-mono">/public/fonts</code> and add this CSS.</p>
                <Code text={cssSnippet(p, formats)} />
              </>
            )}
            {tab === "Design apps" && (
              <ol className="grid list-decimal gap-1 pl-5">
                <li>Double-click the <span className="font-mono">.otf</span> file and choose Install.</li>
                <li>Restart Figma (desktop app), Photoshop, Illustrator or Affinity.</li>
                <li>Pick <b>{p.family}</b> from the font menu.</li>
              </ol>
            )}
            {tab === "Video" && (
              <ol className="grid list-decimal gap-1 pl-5">
                <li>Install the <span className="font-mono">.ttf</span> file on the computer that edits the video.</li>
                <li>Restart Premiere Pro, After Effects, DaVinci Resolve or Final Cut. The font appears in the text tool.</li>
                <li>For mobile editors, import the <span className="font-mono">.ttf</span> wherever the app accepts custom fonts.</li>
              </ol>
            )}
            {tab === "Mobile apps" && (
              <>
                <p>Android: copy the file to <span className="font-mono">res/font/</span>. iOS: add it to the Xcode target and list it under “Fonts provided by application”.</p>
                <Code text={appSnippet(p)} />
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-rule pt-3.5">
          <span role="status" className={`min-w-0 flex-1 text-xs [overflow-wrap:anywhere] ${status.kind === "error" ? "text-warn" : "text-graphite"}`}>
            {status.text ?? (formats.length ? formats.map(f => fileName(p, f)).join("  ") : "Choose at least one format")}
          </span>
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!formats.length || !drawn || status.kind === "working"}
            title={drawn ? undefined : "Draw at least one glyph first"}
            onClick={run}
          >
            <Icon name="download" />
            {formats.length === 1 ? "Export 1 file" : `Export ${formats.length} files`}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
