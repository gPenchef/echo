import type { Level, Vec } from './core/types';

// Presentation only: the camera never changes simulation or recorded coordinates.
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 560;
export function chamberView(level: Pick<Level, 'width' | 'height'>, focus: Vec, overview: boolean) {
  const zoom = overview ? Math.min(1, VIEW_WIDTH / level.width, VIEW_HEIGHT / level.height) : 1;
  const w = VIEW_WIDTH / zoom,
    h = VIEW_HEIGHT / zoom;
  const axis = (position: number, size: number, visible: number) =>
    size < visible
      ? (size - visible) / 2
      : Math.max(0, Math.min(size - visible, position - visible / 2));
  return {
    x: axis(overview ? level.width / 2 : focus.x, level.width, w),
    y: axis(overview ? level.height / 2 : focus.y, level.height, h),
    w,
    h,
    zoom,
  };
}
export type ChamberView = ReturnType<typeof chamberView>;
export function pointerToWorld(point: Vec, view: ChamberView): Vec {
  return { x: view.x + point.x / view.zoom, y: view.y + point.y / view.zoom };
}
