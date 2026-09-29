import { create } from 'zustand';
import { del, entries, get, set } from 'idb-keyval';
import { CHARSET, defaultAdvance } from './charset';

export type Point = [x: number, y: number, pressure: number]; // font units, y-up
export type Stroke = { points: Point[]; size: number };

export type Glyph = {
  char: string;
  unicode: number;
  advance: number;
  strokes: Stroke[];
};

export type FontStyle = 'Regular' | 'Bold' | 'Italic';

export type FontProject = {
  id: string;
  family: string;
  style: FontStyle;
  upm: number;
  ascender: number;
  capHeight: number;
  xHeight: number;
  descender: number;
  weight: number;   // stroke size multiplier applied on render and export
  slant: number;    // degrees
  tracking: number; // font units added to every advance
  glyphs: Record<string, Glyph>;
  updatedAt: number;
};

export const METRICS = { upm: 1000, ascender: 800, capHeight: 700, xHeight: 500, descender: -200 };

export function newProject(family = 'Untitled Hand', strokes: Record<string, [number, Stroke[]]> = {}): FontProject {
  const glyphs: Record<string, Glyph> = {};
  for (const ch of CHARSET) {
    const seed = strokes[ch];
    glyphs[ch] = { char: ch, unicode: ch.codePointAt(0)!, advance: seed?.[0] ?? defaultAdvance(ch), strokes: seed?.[1] ?? [] };
  }
  return {
    id: crypto.randomUUID().slice(0, 8), family, style: 'Regular', ...METRICS,
    weight: 1, slant: 0, tracking: 0, glyphs, updatedAt: Date.now(),
  };
}

/* ---------- IndexedDB persistence ---------- */
const KEY = 'project:';
export const saveProject = (p: FontProject) => set(KEY + p.id, p);
export const loadProject = (id: string) => get<FontProject>(KEY + id);
export const deleteProject = (id: string) => del(KEY + id);
export async function listProjects() {
  const all = await entries<string, FontProject>();
  return all
    .filter(([k]) => String(k).startsWith(KEY))
    .map(([, p]) => p)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ---------- Editor state ---------- */
export type Tool = 'brush' | 'eraser';
type Snapshot = { char: string; strokes: Stroke[] };

type Editor = {
  project: FontProject | null;
  selected: string;
  tool: Tool;
  brushSize: number;
  smoothing: number; // 0..1
  usePressure: boolean;
  showGrid: boolean;
  showGuides: boolean;
  showTrace: boolean;
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  saved: boolean;

  open: (p: FontProject) => void;
  select: (ch: string) => void;
  step: (delta: number) => void;
  set: (patch: Partial<Pick<Editor, 'tool' | 'brushSize' | 'smoothing' | 'usePressure' | 'showGrid' | 'showGuides' | 'showTrace'>>) => void;
  updateProject: (patch: Partial<Omit<FontProject, 'id' | 'glyphs'>>) => void;
  setAdvance: (ch: string, advance: number) => void;
  setStrokes: (ch: string, strokes: Stroke[], recordUndo?: boolean) => void;
  undo: () => void;
  redo: () => void;
};

export const useEditor = create<Editor>((setState, getState) => {
  const patchProject = (fn: (p: FontProject) => Partial<FontProject>) =>
    setState(s => (s.project ? { project: { ...s.project, ...fn(s.project), updatedAt: Date.now() }, saved: false } : {}));

  const swap = (from: 'undoStack' | 'redoStack', to: 'undoStack' | 'redoStack') => {
    const { project, [from]: source, [to]: target } = getState();
    const snap = source.at(-1);
    if (!project || !snap) return;
    const current = { char: snap.char, strokes: project.glyphs[snap.char].strokes };
    setState({ [from]: source.slice(0, -1), [to]: [...target, current], selected: snap.char });
    patchProject(p => ({ glyphs: { ...p.glyphs, [snap.char]: { ...p.glyphs[snap.char], strokes: snap.strokes } } }));
  };

  return {
    project: null,
    selected: 'a',
    tool: 'brush',
    brushSize: 74,
    smoothing: 0.5,
    usePressure: true,
    showGrid: true,
    showGuides: true,
    showTrace: false,
    undoStack: [],
    redoStack: [],
    saved: true,

    open: p => setState({ project: p, selected: 'a', undoStack: [], redoStack: [], saved: true }),
    select: ch => setState({ selected: ch }),
    step: d => {
      const i = CHARSET.indexOf(getState().selected);
      setState({ selected: CHARSET[(i + d + CHARSET.length) % CHARSET.length] });
    },
    set: patch => setState(patch),
    updateProject: patch => patchProject(() => patch),
    setAdvance: (ch, advance) =>
      patchProject(p => ({ glyphs: { ...p.glyphs, [ch]: { ...p.glyphs[ch], advance } } })),
    setStrokes: (ch, strokes, recordUndo = true) => {
      const { project, undoStack } = getState();
      if (!project) return;
      if (recordUndo) {
        // ponytail: whole-glyph snapshots, fine at ~100 strokes per glyph
        setState({ undoStack: [...undoStack.slice(-199), { char: ch, strokes: project.glyphs[ch].strokes }], redoStack: [] });
      }
      patchProject(p => ({ glyphs: { ...p.glyphs, [ch]: { ...p.glyphs[ch], strokes } } }));
    },
    undo: () => swap('undoStack', 'redoStack'),
    redo: () => swap('redoStack', 'undoStack'),
  };
});

// Autosave: write the project to IndexedDB shortly after the last change.
let timer: ReturnType<typeof setTimeout> | undefined;
useEditor.subscribe((s, prev) => {
  if (!s.project || s.project === prev.project || s.saved) return;
  clearTimeout(timer);
  const p = s.project;
  timer = setTimeout(() => saveProject(p).then(() => {
    if (useEditor.getState().project === p) useEditor.setState({ saved: true });
  }), 400);
});
