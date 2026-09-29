import { NewFontActions, ProjectList, Specimen } from "@/components/Home";

const USES = [
  { title: "Websites", file: ".woff2", body: "Copy the ready-made @font-face CSS into your site." },
  { title: "Design apps", file: ".otf", body: "Install it once, then pick it in Figma, Photoshop, Illustrator or Affinity." },
  { title: "Video", file: ".ttf", body: "Titles and captions in Premiere Pro, After Effects, DaVinci Resolve and Final Cut." },
  { title: "Mobile apps", file: ".ttf", body: "Bundle it in an iOS or Android app like any other font." },
];

const STEPS = [
  { title: "Draw", body: "Pick a letter and draw it on a canvas with real type guides: baseline, x-height, cap height." },
  { title: "Preview", body: "Type any sentence and watch your letters set as a font. Adjust weight, slant and spacing." },
  { title: "Export", body: "Download OTF, TTF, WOFF and WOFF2. Everything is built in your browser." },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-20 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <span className="font-display text-2xl font-bold tracking-tight">
          Tinta<b className="text-proof">.</b>
        </span>
        <span className="text-xs text-graphite">Your drawings stay on this device</span>
      </header>

      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl">
            Draw a typeface.
            <br />
            Export a real font.
          </h1>
          <p className="max-w-[46ch] text-base text-graphite">
            Sketch each letter with a mouse, trackpad or stylus. Tinta turns your strokes into font files you can
            install in apps, use on websites, and set in video titles.
          </p>
          <NewFontActions />
        </div>
        <Specimen />
      </section>

      <ProjectList />

      <section className="grid gap-6">
        <h2 className="label-caps">How it works</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 border-t border-rule pt-4">
              <span className="font-mono text-xs text-graphite">Step {i + 1}</span>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="text-graphite">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6">
        <h2 className="label-caps">Use it anywhere</h2>
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {USES.map(u => (
            <div key={u.title} className="flex flex-col gap-2 bg-sheet p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{u.title}</h3>
                <span className="font-mono text-xs text-proof">{u.file}</span>
              </div>
              <p className="text-graphite">{u.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
