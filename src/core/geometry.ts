import type { Rect, Vec } from './types';
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const touches = (p: Vec, r: Rect, radius = 12) =>
  p.x + radius > r.x && p.x - radius < r.x + r.w && p.y + radius > r.y && p.y - radius < r.y + r.h;
export function lineBlocked(a: Vec, b: Vec, rects: Rect[]): boolean {
  const steps = Math.ceil(distance(a, b) / 5);
  for (let i = 1; i <= steps; i++) {
    const p = { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
    if (rects.some((r) => touches(p, r, 1))) return true;
  }
  return false;
}
