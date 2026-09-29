"use client";

import { useEffect, useRef, type CanvasHTMLAttributes } from "react";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Read a design token (CSS custom property) for canvas drawing. */
export const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

/** A HiDPI canvas that redraws when `draw` changes, when it resizes and when the color scheme flips. */
export function Canvas({ draw, ...rest }: { draw: Draw } & CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
    paint(ref.current!, draw);
  }, [draw]);

  useEffect(() => {
    const c = ref.current!;
    const redraw = () => paint(c, drawRef.current);
    const ro = new ResizeObserver(redraw);
    ro.observe(c);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", redraw);
    document.fonts?.ready.then(redraw);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", redraw);
    };
  }, []);

  return <canvas ref={ref} {...rest} />;
}

function paint(c: HTMLCanvasElement, draw: Draw) {
  const { width, height } = c.getBoundingClientRect();
  const d = window.devicePixelRatio || 1;
  const pw = Math.max(1, Math.round(width * d)), ph = Math.max(1, Math.round(height * d));
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
}
