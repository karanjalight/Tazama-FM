"use client";

import * as React from "react";

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TargetLayout {
  rect: TargetRect | null;
  viewport: { width: number; height: number };
}

const EDGE = 8;

/** Visible elements for the given data-tour ids (hidden ones — e.g. the sidebar on phones — measure 0×0). */
function visibleTargets(ids: readonly string[]): HTMLElement[] {
  return ids
    .flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
}

function measure(ids: readonly string[]): TargetLayout {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const els = visibleTargets(ids);
  if (els.length === 0) return { rect: null, viewport };

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  top = Math.max(top, EDGE);
  bottom = Math.min(bottom, viewport.height - EDGE);
  if (bottom <= top) return { rect: null, viewport };
  return { rect: { top, left, width: right - left, height: bottom - top }, viewport };
}

/** Both-null rects count as equal; avoids a new object (and a re-render) on every scroll frame when nothing moved. */
function sameLayout(a: TargetLayout, b: TargetLayout): boolean {
  if (a.viewport.width !== b.viewport.width || a.viewport.height !== b.viewport.height) return false;
  if (a.rect === null || b.rect === null) return a.rect === b.rect;
  return (
    a.rect.top === b.rect.top &&
    a.rect.left === b.rect.left &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height
  );
}

/**
 * Scrolls the targets into view (the sidebar scrolls on short screens) and
 * tracks their union rectangle through resizes and scrolls.
 */
export function useTargetRect(targets: readonly string[], active: boolean, reducedMotion: boolean): TargetLayout {
  const [layout, setLayout] = React.useState<TargetLayout>({ rect: null, viewport: { width: 0, height: 0 } });
  const key = targets.join(" ");

  React.useEffect(() => {
    if (!active) return;
    const ids = key ? key.split(" ") : [];

    const els = visibleTargets(ids);
    els[Math.floor(els.length / 2)]?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measure(ids);
        setLayout((prev) => (sameLayout(prev, next) ? prev : next));
      });
    };
    update();
    const settle = window.setTimeout(update, 450); // after a smooth scroll lands
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [key, active, reducedMotion]);

  return layout;
}
